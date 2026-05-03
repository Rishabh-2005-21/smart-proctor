import { useEffect, useMemo, useState, useRef } from "react";
import { useQuiz } from "../context/QuizContext";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { apiUrl } from "../config/api";

const FALLBACK_QUESTIONS = [
  {
    _id: "fb1",
    text: "Which data structure follows FIFO?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctIndex: 1,
    topic: "Data Structures",
    difficulty: "easy"
  },
  {
    _id: "fb2",
    text: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
    correctIndex: 1,
    topic: "Algorithms",
    difficulty: "medium"
  },
  {
    _id: "fb3",
    text: "Which SQL command is used to retrieve data?",
    options: ["INSERT", "UPDATE", "SELECT", "DELETE"],
    correctIndex: 2,
    topic: "DBMS",
    difficulty: "easy"
  }
];

const CAREER_PROFILES = {
  "frontend developer": [
    "HTML/CSS basics",
    "JavaScript fundamentals",
    "React hooks",
    "Web performance",
    "Browser APIs"
  ],
  "backend developer": [
    "Node.js fundamentals",
    "REST APIs",
    "Databases (SQL/NoSQL)",
    "Authentication",
    "System design basics"
  ],
  "fullstack developer": [
    "Frontend fundamentals",
    "Backend APIs",
    "Databases",
    "Deployment and DevOps",
    "System design basics"
  ],
  "data scientist": [
    "Statistics basics",
    "Python for data",
    "Machine learning fundamentals",
    "SQL and data wrangling",
    "Model evaluation"
  ],
  "software engineer": [
    "Data structures",
    "Algorithms",
    "OOP and design",
    "DBMS and OS",
    "Computer networks"
  ]
};

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentQuiz,
    currentQuestion,
    answers,
    violations,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    addViolation,
    resetQuiz,
    startQuiz
  } = useQuiz();

  const [timeLeft, setTimeLeft] = useState(600); // total test time (seconds)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(30); // per-question timer
  const [questionMeta, setQuestionMeta] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const hasWarnedRef = useRef(false);
  const hasAutoSubmittedRef = useRef(false);
  const [proctorModal, setProctorModal] = useState(null); // { title, text, type: 'warning' | 'auto' }
  const [resultSummary, setResultSummary] = useState(null);
  const [videoStream, setVideoStream] = useState(null);

  const fetchGenAIQuestions = async (payload) => {
    const endpoints = ["/tests/genai/questions", "/ai/genai-questions"];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const res = await axios.post(apiUrl(endpoint), payload);
        const questions = res.data?.questions || [];
        if (questions.length) {
          return questions.map((q, idx) => ({
            ...q,
            _id: q._id || q.id || `q${idx + 1}`,
            correctAnswer:
              q.correctAnswer ||
              (Array.isArray(q.options) && typeof q.correctIndex === "number"
                ? q.options[q.correctIndex]
                : undefined)
          }));
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError) {
      console.error("All GenAI question endpoints failed:", lastError);
    }
    return FALLBACK_QUESTIONS.map((q, idx) => ({
      ...q,
      _id: `${q._id}_${idx + 1}`,
      correctAnswer: q.options[q.correctIndex]
    }));
  };

  // Derive quiz type directly from URL
  const params = new URLSearchParams(location.search);
  const isRandomQuiz = params.get("type") === "random" || params.get("type") === "roadmap";

  const videoRef = useRef(null);
  
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const studentId = useMemo(() => {
    return (
      storedUser.id || (storedUser.name || "Student").replace(/\s+/g, "-").toLowerCase()
    );
  }, [storedUser]);

  // =============================
  // 🎯 RESET ON URL CHANGE
  // =============================
  useEffect(() => {
    setResultSummary(null);
    setHasStarted(false);
  }, [location.search]);

  // =============================
  // 🎯 LOAD TEST FROM QR LINK OR RANDOM
  // =============================
  useEffect(() => {
    if (currentQuiz || resultSummary) return;
    const params = new URLSearchParams(location.search);
    const testId = params.get("testId");
    const isRandom = params.get("type") === "random";
    const isRoadmap = params.get("type") === "roadmap";
    const storedGoal = localStorage.getItem("studentGoal") || "software engineer";
    const roadmapGoal = params.get("goal") || storedGoal || "general placement";

    if (!testId && !isRandom && !isRoadmap) return;
    
    const decodeHTML = (html) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = html;
      return txt.value;
    };

    const loadFromTest = async () => {
      try {
        let durationSeconds = 600;
        let rules = {};
        let questions = [];
        let title = "SmartProctor Test";
        let finalTestId = isRoadmap ? "roadmap_final" : "random_1";

        if (isRandom || isRoadmap) {
          // Fetch from GenAI
          title = isRoadmap ? `${roadmapGoal} Graduation Test` : "Random Placement Test";
          rules = {
            enforceFullscreen: true,
            blockTabSwitch: true,
            requireCamera: true,
            roadmapExam: isRoadmap
          };
          
          const goalKey = String(roadmapGoal || "")
            .trim()
            .toLowerCase();
          const careerTopics =
            CAREER_PROFILES[goalKey] ||
            CAREER_PROFILES["software engineer"];

          const basicCount = isRoadmap ? 10 : 8;
          const moderateCount = isRoadmap ? 12 : 10;
          const advancedCount = isRoadmap ? 10 : 8;

          const [basicQ, moderateQ, hardQ] = await Promise.all([
            fetchGenAIQuestions({
              topics: [...careerTopics, "aptitude basics"],
              difficultyMix: "easy",
              count: basicCount
            }),
            fetchGenAIQuestions({
              topics: [...careerTopics, "problem solving"],
              difficultyMix: "medium",
              count: moderateCount
            }),
            fetchGenAIQuestions({
              topics: [...careerTopics, roadmapGoal, "advanced interview problems"],
              difficultyMix: "hard",
              count: advancedCount
            })
          ]);

          questions = shuffleArray([...basicQ, ...moderateQ, ...hardQ]).map(
            (q, idx) => ({
              ...q,
              _id: q._id || `cq_${idx + 1}`
            })
          );
          durationSeconds = isRoadmap ? 45 * 60 : 35 * 60;
        } else {
          // Normal Load from DB
          const res = await axios.get(apiUrl(`/tests/by-id/${testId}`));
          const test = res.data;
          durationSeconds = test.durationSeconds || 600;
          rules = test.rules || {};
          title = test.title || title;
          finalTestId = test._id;
          questions = Array.isArray(test.questions) && test.questions.length ? test.questions : [];

          // If no static questions, fall back to GenAI-backed generation
          if (!questions.length) {
            questions = await fetchGenAIQuestions({
              topics: ["aptitude", "technical basics", "placement"],
              difficultyMix: "easy,medium,hard",
              count: 10
            });
          }
        }

        // 🚨 CHECK IF TEST ALREADY SUBMITTED
        if (studentId) {
          try {
            const historyRes = await axios.get(apiUrl(`/tests/history/${studentId}`));
            const existingAttempt = (historyRes.data || []).find(a => String(a.testId) === String(finalTestId));
            if (existingAttempt) {
              setResultSummary(existingAttempt);
              return; // End flow here: results will match results section logic
            }
          } catch (e) {
            console.error("Checking history failed:", e);
          }
        }

        startQuiz({
          _id: finalTestId,
          title,
          questions: shuffleArray(questions),
          durationSeconds,
          rules
        });
        setTimeLeft(durationSeconds);
        setQuestionTimeLeft(30);
      } catch (err) {
        console.error(err);
      }
    };

    loadFromTest();
  }, [currentQuiz, resultSummary, location.search, startQuiz, navigate]);

  // =============================
  // 🚨 FULLSCREEN ENFORCEMENT
  // =============================
  useEffect(() => {
    if (!currentQuiz || currentQuiz.rules?.enforceFullscreen === false) return;

    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request failed. Handled via Start button.", err);
      }
    };

    if (hasStarted && currentQuiz && currentQuiz.rules?.enforceFullscreen !== false) {
      enterFullscreen();
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addViolation();
        if (!hasWarnedRef.current) {
          hasWarnedRef.current = true;
          setProctorModal({
            title: "Security Violation",
            text: "We detected a fullscreen exit. This action has been recorded. You will not be warned again, but further violations may lead to automatic submission.",
            type: "warning"
          });
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
  }, [currentQuiz, addViolation]);

  // =============================
  // 🚨 TAB SWITCH DETECTION
  // =============================
  useEffect(() => {
    if (!currentQuiz || currentQuiz.rules?.blockTabSwitch === false) return;

    const handleBlur = () => {
      addViolation();
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        setProctorModal({
          title: "Security Violation",
          text: "We detected a tab switch. This action has been recorded. You will not be warned again, but further violations may lead to automatic submission.",
          type: "warning"
        });
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => window.removeEventListener("blur", handleBlur);
  }, [currentQuiz, addViolation]);

  // =============================
  // 📷 CAMERA REQUIREMENT
  // =============================
  useEffect(() => {
    if (!currentQuiz || !currentQuiz.rules?.requireCamera) return;
    let stream;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoStream(stream);
      } catch (err) {
        console.error(err);
        addViolation();
        alert(
          "⚠️ Camera access denied or not available. Violation recorded."
        );
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setVideoStream(null);
    };
  }, [currentQuiz, addViolation]);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // =============================
  // ⏱️ PER-QUESTION TIMER (adaptive hooks ready)
  // =============================
  useEffect(() => {
    if (!currentQuiz) return;

    if (questionTimeLeft <= 0) {
      // Auto-next on timeout
      if (currentQuestion < currentQuiz.questions.length - 1) {
        setQuestionTimeLeft(30);
        nextQuestion();
      } else {
        handleSubmit();
      }
      return;
    }

    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => prev - 1);
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionTimeLeft, currentQuiz, currentQuestion]);

  // Reset per-question timer when moving to a new question
  useEffect(() => {
    if (!currentQuiz) return;
    setQuestionTimeLeft(30);
  }, [currentQuestion, currentQuiz]);

  // =============================
  // ⏳ TIMER
  // =============================
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
    }
  }, [timeLeft]);

  // =============================
  // 🚨 AUTO SUBMIT IF 3 VIOLATIONS
  // =============================
  useEffect(() => {
    if (violations >= 3 && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      setProctorModal({
        title: "Test Disqualified",
        text: "Too many security violations detected (3/3). Your exam has been automatically submitted for review.",
        type: "auto"
      });
      handleSubmit();
    }
  }, [violations]);

  // User is now moved to top for earlier access during test load
  /* const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []); */

  // =============================
  // 📤 SUBMIT QUIZ
  // =============================
  const handleSubmit = async () => {
    if (!currentQuiz || submitting) return;
    setSubmitting(true);
    
    try {
      if (isRandomQuiz) {
        // Send directly to the backend bypassing DB lookup
        const res = await axios.post(apiUrl("/tests/submit-random"), {
          testId: currentQuiz._id,
          testTitle: currentQuiz.title,
          questions: currentQuiz.questions,
          answers,
          violations,
          studentId,
          studentName: storedUser.name,
          studentEmail: storedUser.email,
          questionMeta
        });
        
        const attempt = res.data?.attempt;
        setResultSummary(attempt || null);
        // Clean up UI state
        setProctorModal(null);
        resetQuiz();
        // navigate("/student-dashboard"); // Removed to allow result viewing
      } else {
        const res = await axios.post(apiUrl("/tests/submit"), {
          quizId: currentQuiz._id,
          answers,
          violations,
          studentId,
          studentName: storedUser.name,
          studentEmail: storedUser.email,
          questionMeta
        });
  
        const attempt = res.data?.attempt;
        setResultSummary(attempt || null);
        setProctorModal(null);
        resetQuiz();
        // navigate("/student-dashboard"); // Removed to allow result viewing
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      setSubmitting(false);
    }
  };

  if (!currentQuiz) {
    if (!resultSummary) {
      return <h2 style={{ padding: "24px" }}>No quiz started</h2>;
    }

    // Simple results view – can be evolved into full analytics dashboard
    return (
      <div style={{ padding: "30px", maxWidth: 720, margin: "0 auto" }}>
        <h2>Test Summary</h2>
        <p style={{ 
          fontSize: "1.2rem", 
          fontWeight: 800, 
          color: (resultSummary.accuracy >= 0.7) ? "#10b981" : "#ef4444",
          background: (resultSummary.accuracy >= 0.7) ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          padding: "16px",
          borderRadius: "12px",
          display: "inline-block",
          marginTop: "16px",
          marginBottom: "24px"
        }}>
          {resultSummary.accuracy >= 0.7 ? "🎉 STATUS: PASSED" : "❌ STATUS: FAILED (Required: 70%)"}
        </p>

        <div style={{ background: "rgba(0,0,0,0.02)", padding: "20px", borderRadius: "16px" }}>
          <p style={{ margin: "8px 0" }}>
            Score: <strong>{resultSummary.score}</strong> / {resultSummary.totalQuestions}
          </p>
          <p style={{ margin: "8px 0" }}>
            Accuracy: <strong>{Math.round((resultSummary.accuracy || 0) * 100)}%</strong>
          </p>
          <p style={{ margin: "8px 0" }}>
            Placement Readiness Index: <strong>{resultSummary.placementReadinessScore}/100</strong> – {resultSummary.placementReadinessLabel}
          </p>
          <p style={{ margin: "12px 0 8px", color: resultSummary.violations > 0 ? "#ef4444" : "#10b981", fontWeight: 700 }}>
            Proctoring Violations: {resultSummary.violations || 0}
          </p>
        </div>

        {resultSummary.aiFeedback && (
          <div style={{ marginTop: 20 }}>
            <h3>AI Performance Feedback</h3>
            <p>
              Confidence score:{" "}
              <strong>
                {resultSummary.aiFeedback.confidenceScore || 0}/100
              </strong>
            </p>
            {!!(resultSummary.aiFeedback.strengths || []).length && (
              <>
                <h4>Strengths</h4>
                <ul>
                  {resultSummary.aiFeedback.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}
            {!!(resultSummary.aiFeedback.weaknesses || []).length && (
              <>
                <h4>Weaknesses</h4>
                <ul>
                  {resultSummary.aiFeedback.weaknesses.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </>
            )}
            {!!(resultSummary.aiFeedback.improvementSuggestions || []).length && (
              <>
                <h4>Improvement Suggestions</h4>
                <ul>
                  {resultSummary.aiFeedback.improvementSuggestions.map(
                    (i) => (
                      <li key={i}>{i}</li>
                    )
                  )}
                </ul>
              </>
            )}
          </div>
        )}

        {resultSummary.aiRoadmap && (
          <div style={{ marginTop: 20 }}>
            <h3>AI Learning Roadmap</h3>
            {!!(resultSummary.aiRoadmap.oneWeekPlan || []).length && (
              <>
                <h4>1-Week Plan</h4>
                <ul>
                  {resultSummary.aiRoadmap.oneWeekPlan.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            )}
            {!!(resultSummary.aiRoadmap.twoWeekPlan || []).length && (
              <>
                <h4>2-Week Plan</h4>
                <ul>
                  {resultSummary.aiRoadmap.twoWeekPlan.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: "60px", 
          borderTop: "1px solid #e5e7eb", 
          paddingTop: "48px", 
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px"
        }}>
          <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1f2937" }}>
            Review complete. Ready to proceed?
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            <button 
              onClick={() => navigate("/interview-prep")}
              style={{ 
                background: "#6366f1", 
                color: "#fff", 
                border: "none", 
                borderRadius: "16px", 
                padding: "18px 36px", 
                fontSize: "1.1rem", 
                fontWeight: 800, 
                cursor: "pointer",
                boxShadow: "0 10px 25px rgba(99,102,241,0.3)"
              }}
            >
              Practice More 🚀
            </button>
            <button 
              onClick={() => navigate("/student-dashboard")}
              style={{ 
                background: "#f8fafc", 
                color: "#1f2937", 
                border: "2px solid #e2e8f0", 
                borderRadius: "16px", 
                padding: "18px 36px", 
                fontSize: "1.1rem", 
                fontWeight: 800, 
                cursor: "pointer"
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = currentQuiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  if (!hasStarted) {
    return (
      <div style={{ padding: "40px", maxWidth: "600px", margin: "100px auto", textAlign: "center", background: "#fff", borderRadius: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "5rem", marginBottom: "24px" }}>🛡️</div>
        <h2 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "16px" }}>Secure Exam Mode</h2>
        <p style={{ color: "#4b5563", fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "40px" }}>
          To ensure a fair testing environment, this final exam requires **Fullscreen Mode**, **Camera Access**, and **Tab Switch Protection**.
        </p>
        <button 
          onClick={() => setHasStarted(true)}
          style={{ width: "100%", background: "#6366f1", color: "#fff", border: "none", borderRadius: "16px", padding: "20px", fontSize: "1.2rem", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 25px rgba(99,102,241,0.3)" }}
        >
          I'm Ready, Start Final Exam
        </button>
      </div>
    );
  }

  const question = currentQuiz.questions[currentQuestion];

  const questionProgress = Math.round(
    ((currentQuestion + 1) / totalQuestions) * 100
  );
  const questionTimePercent = Math.max(
    0,
    Math.min(100, (questionTimeLeft / 30) * 100)
  );

  return (
    <div style={{ padding: "30px", maxWidth: 840, margin: "0 auto" }}>
      {videoStream && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 200,
          height: 150,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          zIndex: 9999,
          border: "3px solid #22c55e",
          background: "#000"
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: 4
          }}>
            🔴 Live Proctoring
          </div>
        </div>
      )}
      {/* CENTRALIZED PROCTORING MODAL */}
      {proctorModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(12px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 100000,
          padding: "20px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "32px",
            padding: "48px",
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            border: `5px solid ${proctorModal.type === 'auto' ? '#ef4444' : '#f97316'}`
          }}>
            <div style={{ fontSize: "5rem", marginBottom: "24px" }}>
              {proctorModal.type === 'auto' ? '🛑' : '⚠️'}
            </div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#111", marginBottom: "20px", letterSpacing: "-1px" }}>
              {proctorModal.title}
            </h2>
            <p style={{ fontSize: "1.15rem", color: "#4b5563", lineHeight: "1.7", marginBottom: "40px" }}>
              {proctorModal.text}
            </p>
            {proctorModal.type === 'warning' ? (
              <button 
                onClick={() => setProctorModal(null)}
                style={{
                  width: "100%",
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: "16px",
                  padding: "20px",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "transform 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                I UNDERSTAND & AGREE
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                <div className="loader" style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #ef4444", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <p style={{ fontWeight: 700, color: "#ef4444" }}>Finalizing Auto-Submission...</p>
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      <h2>{currentQuiz.title}</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginTop: 8,
          marginBottom: 16
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "0.85rem",
              marginBottom: 4
            }}
          >
            Overall time left:{" "}
            <strong>
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </strong>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "#e5e7eb",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${questionProgress}%`,
                height: "100%",
                transition: "width 0.2s ease-out",
                background:
                  "linear-gradient(90deg, #22c55e, #4f46e5, #f97316)"
              }}
            />
          </div>
          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>
            Question {currentQuestion + 1} of {totalQuestions} · Answered{" "}
            {answeredCount}/{totalQuestions}
          </div>
        </div>

        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background:
              questionTimePercent > 50
                ? "conic-gradient(#22c55e 0%, #22c55e 60%, #e5e7eb 60%)"
                : questionTimePercent > 20
                ? "conic-gradient(#facc15 0%, #facc15 60%, #e5e7eb 60%)"
                : "conic-gradient(#ef4444 0%, #ef4444 60%, #e5e7eb 60%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            flexShrink: 0
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: "50%",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              fontSize: "0.8rem"
            }}
          >
            <span style={{ fontWeight: 600 }}>{questionTimeLeft}s</span>
            <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
              this question
            </span>
          </div>
        </div>
      </div>

      <h4>⚠️ Violations: {violations}</h4>

      <hr />

      <h3>
        Q{currentQuestion + 1}: {question.text}
      </h3>

      {question.options.map((option, index) => (
        <div key={index}>
          <label>
            <input
              type="radio"
              name="option"
              checked={answers[question._id] === option}
              onChange={() => submitAnswer(question._id, option)}
            />
            {option}
          </label>
        </div>
      ))}

      <br />

      <div>
        <button onClick={previousQuestion} disabled={currentQuestion === 0}>
          Previous
        </button>

        {currentQuestion < currentQuiz.questions.length - 1 ? (
          <button onClick={nextQuestion}>Next</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}
