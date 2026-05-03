import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  SAMPLE_TESTS,
  getRecommendedCourses,
  analyzeAttempt,
} from "../data/interviewPrepData";
import { apiUrl } from "../config/api";
import { addBookmark, saveLastActivity } from "../services/studentWorkspace";
import "./InterviewPrepDashboard.css";

const COMPANY_TEST_MAP = {
  Amazon: ["company-amazon", "technical-general", "advanced-aptitude"],
  Google: ["company-google", "technical-general", "core-os-dbms"],
  "TCS NQT": ["company-tcs-nqt", "aptitude-general", "technical-general"],
  Infosys: ["aptitude-general", "technical-general", "placement-soft-skills"],
  Wipro: ["aptitude-general", "technical-general", "placement-soft-skills"],
  Capgemini: ["advanced-aptitude", "technical-general", "placement-soft-skills"]
};

export default function InterviewPrepDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState("list"); // list | test | result | progress
  const [selectedTest, setSelectedTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [progressList, setProgressList] = useState([]);
  const [roadmapWeaknesses, setRoadmapWeaknesses] = useState([]);
  const [loading, setLoading] = useState(false);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch { return {}; }
  })();

  const studentName = storedUser.name || "Student";
  const studentId =
    storedUser.id ||
    storedUser._id ||
    storedUser.studentId ||
    (storedUser.name || "Student").replace(/\s+/g, "-").toLowerCase();
  const theme = localStorage.getItem("theme") || "light";
  const currentGoal = localStorage.getItem("studentGoal") || "General Placement";
  const roadmapProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem("studentRoadmapProfile")) || null;
    } catch {
      return null;
    }
  })();
  const plannerProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem("placementPlannerProfile")) || null;
    } catch {
      return null;
    }
  })();

  const [weakTopicStats, setWeakTopicStats] = useState([]);
  const [isFocusQuizzing, setIsFocusQuizzing] = useState(false);
  const [companyPlans, setCompanyPlans] = useState([]);
  const [plannerSnapshot, setPlannerSnapshot] = useState(null);
  const [resumePrep, setResumePrep] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("placementResumePrep")) || null;
    } catch {
      return null;
    }
  });
  const [resumeText, setResumeText] = useState("");
  const [resumeQuestions, setResumeQuestions] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const fetchGenAIQuestions = useCallback(async (payload) => {
    const endpoints = ["/tests/genai/questions", "/ai/genai-questions"];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const res = await axios.post(apiUrl(endpoint), payload);
        const questions = res.data?.questions || [];
        if (questions.length) return questions;
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError;
    }
    return [];
  }, []);

  // Fetch roadmap test history to identify weaknesses
  const fetchWeaknesses = useCallback(() => {
    const cachedGoal = localStorage.getItem("lastPracticeGoal");
    
    axios
      .get(apiUrl(`/tests/history/${studentId}`))
      .then((res) => {
        const attempts = res.data || [];
        
        // If goal changed, skip suggestions until a new test in the NEW context is taken
        if (cachedGoal && cachedGoal !== currentGoal) {
          setWeakTopicStats([]);
          setRoadmapWeaknesses([]);
          localStorage.setItem("lastPracticeGoal", currentGoal);
          return;
        } else {
          localStorage.setItem("lastPracticeGoal", currentGoal);
        }

        if (attempts.length > 0) {
          const latest = attempts[0];
          // Get topics with < 70% accuracy or those explicitely listed as weaknesses
          const topics = latest.topicStats || [];
          const weakOnes = topics.filter(s => (s.correct / s.attempted) < 0.7);
          
          const aiWeaknesses = (latest.aiFeedback?.weaknesses || []).map(w => ({
            topic: w,
            attempted: 0,
            correct: 0,
            isAiSuggested: true
          }));

          // Merge both sources
          const merged = [...weakOnes];
          aiWeaknesses.forEach(aiW => {
            if (!merged.find(m => m.topic.toLowerCase() === aiW.topic.toLowerCase())) {
              merged.push(aiW);
            }
          });

          setWeakTopicStats(merged);
          setRoadmapWeaknesses(merged.map(m => m.topic));
        }
      })
      .catch(() => setRoadmapWeaknesses([]));
  }, [studentId, currentGoal]);

  useEffect(() => {
    fetchWeaknesses();
    const handleSync = () => {
      if (document.visibilityState === 'visible') fetchWeaknesses();
      try {
        setResumePrep(JSON.parse(localStorage.getItem("placementResumePrep")) || null);
      } catch {
        setResumePrep(null);
      }
    };
    window.addEventListener("visibilitychange", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("visibilitychange", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchWeaknesses]);

  useEffect(() => {
    let active = true;

    axios
      .get(apiUrl(`/planner/dashboard/${studentId}`))
      .then((response) => {
        if (!active) return;
        setPlannerSnapshot(response.data || null);
        setCompanyPlans(response.data?.companyPlans || []);
      })
      .catch(() => {
        if (!active) return;
        setPlannerSnapshot(null);
        setCompanyPlans([]);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  useEffect(() => {
    if (view !== "progress") return;
    setLoading(true);
    Promise.all([
      axios.get(apiUrl(`/progress/student/${studentId}`)).catch(() => ({ data: [] })),
      axios.get(apiUrl(`/tests/history/${studentId}`)).catch(() => ({ data: [] }))
    ])
      .then(([legacyRes, attemptRes]) => {
        const legacy = Array.isArray(legacyRes.data) ? legacyRes.data : [];
        const attempts = Array.isArray(attemptRes.data) ? attemptRes.data : [];

        const mappedAttempts = attempts.map((a) => ({
          _id: a._id,
          attemptedAt: a.createdAt,
          companyOrCategory: a.testTitle || "Simulation",
          testType: "simulation",
          overallScore:
            a.totalQuestions > 0
              ? Math.round(((a.score || 0) / a.totalQuestions) * 100)
              : Math.round((a.accuracy || 0) * 100),
          strengths: a.aiFeedback?.strengths || [],
          weaknesses: a.aiFeedback?.weaknesses || [],
          skillScores: (a.topicStats || []).map((t) => ({
            name: t.topic,
            score: t.attempted ? Math.round((t.correct / t.attempted) * 100) : 0
          }))
        }));

        const merged = [...mappedAttempts, ...legacy].sort(
          (x, y) =>
            new Date(y.attemptedAt || y.createdAt || 0).getTime() -
            new Date(x.attemptedAt || x.createdAt || 0).getTime()
        );

        setProgressList(merged);
      })
      .catch(() => setProgressList([]))
      .finally(() => setLoading(false));
  }, [view, studentId]);

  const handleStartTest = async (test) => {
    if (test.isDynamic) {
      setLoading(true);
      try {
        const generated = await fetchGenAIQuestions({
          topics: test.topics || ["programming"],
          count: test.id === "advanced-aptitude" ? 10 : 6,
          difficultyMix: test.id === "advanced-aptitude" ? "hard" : "medium"
        });
        const dynamicTest = {
          ...test,
          questions: generated.map((q, i) => ({
            ...q,
            id: i + 1,
            skill: q.topic || test.topics?.[0] || "General",
            correct: q.correctIndex
          }))
        };
        setSelectedTest(dynamicTest);
        setAnswers({});
        setView("test");
        saveLastActivity({
          title: dynamicTest.title,
          path: "/interview-prep",
          detail: "Dynamic company/focus quiz",
          section: "practice"
        });
      } catch (e) {
        alert("Failed to generate dynamic questions. Loading static fallback...");
        // Fallback or just stop
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedTest(test);
      setAnswers({});
      setView("test");
      saveLastActivity({
        title: test.title,
        path: "/interview-prep",
        detail: `${test.companyOrCategory} • ${test.testType}`,
        section: "practice"
      });
    }
  };

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitTest = () => {
    if (!selectedTest) return;
    const { skillScores, strengths, weaknesses, overallScore } = analyzeAttempt(
      selectedTest.questions,
      answers,
      selectedTest.skillWeights
    );
    const recommendedCourseNames = getRecommendedCourses(weaknesses);
    const payload = {
      studentId,
      studentName,
      testType: selectedTest.testType,
      companyOrCategory: selectedTest.companyOrCategory,
      skillScores,
      overallScore,
      strengths,
      weaknesses,
      recommendedCourseIds: recommendedCourseNames.map((_, i) => `course-${i}`),
      recommendedCourseNames,
    };
    setResult(payload);
    setView("result");
    axios.post(apiUrl("/progress"), payload).catch(() => {});
    saveLastActivity({
      title: selectedTest.title,
      path: "/interview-prep",
      detail: `Completed with ${overallScore}%`,
      section: "practice"
    });

    if (weaknesses.length) {
      addBookmark({
        id: `practice-${selectedTest.id}-${weaknesses[0]}`,
        title: selectedTest.title,
        note: `Review: ${weaknesses.slice(0, 2).join(", ")}`,
        type: "mistake",
        source: "interview-prep",
        path: "/interview-prep"
      });
    }
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedTest(null);
    setResult(null);
    setIsFocusQuizzing(false);
  };

  const startFocusQuiz = async (topic) => {
    setLoading(true);
    setIsFocusQuizzing(true);
    try {
      const generated = await fetchGenAIQuestions({
        topics: [topic, "fundamentals"],
        difficultyMix: "medium",
        count: 5
      });
      const formatted = {
        id: `focus-${topic}`,
        title: `Mini Focus: ${topic}`,
        companyOrCategory: "Personalized Upgrade",
        testType: "Focus Quiz",
        durationMinutes: 5,
        skillWeights: { [topic]: 1 },
        questions: generated.map((q, i) => ({
          ...q,
          id: i + 1,
          skill: topic,
          correct: q.correctIndex
        }))
      };
      setSelectedTest(formatted);
      setAnswers({});
      setView("test");
      saveLastActivity({
        title: formatted.title,
        path: "/interview-prep",
        detail: "Focused weakness recovery quiz",
        section: "practice"
      });
    } catch (e) {
      alert("Failed to generate focus questions. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResumeQuestions = async () => {
    if (!resumeText.trim()) {
      alert("Paste resume text first to generate personalized interview questions.");
      return;
    }

    try {
      setResumeLoading(true);
      const targetRole =
        plannerSnapshot?.profile?.targetRole ||
        roadmapProfile?.primaryGoal ||
        currentGoal;
      const companies = plannerSnapshot?.profile?.targetCompanies || [];
      const res = await axios.post(apiUrl("/ai/resume-questions"), {
        resumeText,
        targetRole,
        companies
      });
      setResumeQuestions(res.data || null);
      localStorage.setItem(
        "placementResumePrep",
        JSON.stringify(res.data || {})
      );
      setResumePrep(res.data || null);
    } catch (e) {
      alert("Could not generate resume-based questions right now.");
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="interview-prep interview-prep--embedded">
      {false && (<aside className="interview-prep__sidebar">
        <div className="interview-prep__logo">
          <span className="interview-prep__logo-icon">📋</span>
          <span>SmartProctor</span>
        </div>
        <nav className="interview-prep__nav">
          <button
            type="button"
            className="interview-prep__nav-item"
            onClick={() => navigate("/student-dashboard")}
          >
            <span className="interview-prep__nav-icon">▣</span>
            Dashboard
          </button>
          <button
            type="button"
            className={`interview-prep__nav-item ${view === "list" || view === "test" || view === "result" ? "interview-prep__nav-item--active" : ""}`}
            onClick={() => setView("list")}
          >
            <span className="interview-prep__nav-icon">🎥</span>
            Interview Prep
          </button>
          <button
            type="button"
            className={`interview-prep__nav-item ${view === "progress" ? "interview-prep__nav-item--active" : ""}`}
            onClick={() => setView("progress")}
          >
            <span className="interview-prep__nav-icon">💡</span>
            My Progress
          </button>
        </nav>
        <div className="interview-prep__sidebar-footer">
          <button type="button" className="interview-prep__nav-item" onClick={handleLogout}>
            <span className="interview-prep__nav-icon">⎋</span>
            Log Out
          </button>
        </div>
      </aside>)}

      <main className="interview-prep__main interview-prep__main--embedded">
        <header className="interview-prep__header">
          <button type="button" className="interview-prep__back" onClick={view === "test" || view === "result" ? handleBackToList : undefined} style={{ visibility: view === "test" || view === "result" ? "visible" : "hidden" }}>
            ← Back
          </button>
          <h1 className="interview-prep__title">
            {view === "list" && "Interview Preparation"}
            {view === "test" && selectedTest?.title}
            {view === "result" && "Test Result"}
            {view === "progress" && "My Progress"}
          </h1>
          <div className="interview-prep__header-actions">
            <button
              type="button"
              className={`interview-prep__header-tab ${view === "list" || view === "test" || view === "result" ? "interview-prep__header-tab--active" : ""}`}
              onClick={() => setView("list")}
            >
              Practice
            </button>
            <button
              type="button"
              className={`interview-prep__header-tab ${view === "progress" ? "interview-prep__header-tab--active" : ""}`}
              onClick={() => setView("progress")}
            >
              Progress
            </button>
            <div className="interview-prep__user">{studentName}</div>
          </div>
        </header>

        {view === "list" && (() => {
          const coreTestIds = ["aptitude-general", "technical-general", "core-os-dbms", "core-networking", "placement-soft-skills"];
          const recommended = SAMPLE_TESTS.filter(test => {
            if (coreTestIds.includes(test.id)) return false;
            return roadmapWeaknesses.some(w => 
              test.title.toLowerCase().includes(w.toLowerCase()) || 
              test.companyOrCategory.toLowerCase().includes(w.toLowerCase()) ||
              Object.keys(test.skillWeights || {}).some(sk => sk.toLowerCase().includes(w.toLowerCase()))
            );
          });
          const targetCompanyIds = Array.from(
            new Set(
              (plannerProfile?.targetCompanies || []).flatMap(
                (company) => COMPANY_TEST_MAP[company] || []
              )
            )
          );
          const companyTargets = SAMPLE_TESTS.filter((test) => targetCompanyIds.includes(test.id));
          const resumePrioritySkills = Array.isArray(resumePrep?.prioritySkills)
            ? resumePrep.prioritySkills.filter(Boolean)
            : [];
          const foundation = SAMPLE_TESTS.filter(test => coreTestIds.includes(test.id));
          const others = SAMPLE_TESTS.filter(
            (test) =>
              !coreTestIds.includes(test.id) &&
              !recommended.find((r) => r.id === test.id) &&
              !companyTargets.find((companyTest) => companyTest.id === test.id)
          );

          return (
            <section className="interview-prep__content">
              {Array.isArray(roadmapProfile?.suggestedTests) &&
                roadmapProfile.suggestedTests.length > 0 && (
                <div style={{ background: "#ecfeff", padding: "20px 24px", borderRadius: "20px", border: "1px solid #a5f3fc", marginBottom: "24px" }}>
                  <div style={{ fontWeight: 800, color: "#155e75", marginBottom: "8px" }}>
                    Roadmap focus tracks
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {roadmapProfile.suggestedTests.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => startFocusQuiz(topic)}
                        style={{ width: "auto", marginTop: 0, padding: "10px 14px", borderRadius: "999px", background: "#0891b2", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
                      >
                        Practice {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resumePrioritySkills.length > 0 && (
                <div style={{ background: "#fff7ed", padding: "20px 24px", borderRadius: "20px", border: "1px solid #fdba74", marginBottom: "24px" }}>
                  <div style={{ fontWeight: 800, color: "#9a3412", marginBottom: "8px" }}>
                    Resume priority drills
                  </div>
                  <div style={{ color: "#7c2d12", marginBottom: "12px" }}>
                    Practice the strongest skills visible on your resume so you can explain them sharply in interviews.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {resumePrioritySkills.slice(0, 5).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => startFocusQuiz(skill)}
                        style={{ width: "auto", marginTop: 0, padding: "10px 14px", borderRadius: "999px", background: "#ea580c", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
                      >
                        Drill {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "#eef2ff",
                  padding: "20px 24px",
                  borderRadius: "20px",
                  border: "1px solid #c7d2fe",
                  marginBottom: "24px"
                }}
              >
                <div style={{ fontWeight: 800, color: "#3730a3", marginBottom: "8px" }}>
                  Resume-based Question Generator
                </div>
                <div style={{ color: "#4338ca", marginBottom: "12px" }}>
                  Paste your resume text to get skill, project, and interview questions tailored to your profile.
                </div>
                <textarea
                  value={resumeText}
                  onChange={(event) => setResumeText(event.target.value)}
                  placeholder="Paste resume content here..."
                  style={{
                    width: "100%",
                    minHeight: 120,
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    padding: 10,
                    fontSize: "0.9rem",
                    boxSizing: "border-box"
                  }}
                />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={handleGenerateResumeQuestions}
                    disabled={resumeLoading}
                    style={{
                      background: "#4338ca",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {resumeLoading ? "Generating..." : "Generate questions"}
                  </button>
                  {resumeQuestions?.prioritySkills?.length > 0 &&
                    resumeQuestions.prioritySkills.slice(0, 3).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => startFocusQuiz(skill)}
                        style={{
                          background: "#1d4ed8",
                          color: "#fff",
                          border: "none",
                          borderRadius: 999,
                          padding: "9px 12px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Drill {skill}
                      </button>
                    ))}
                </div>
                {resumeQuestions && (
                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Skill-based questions</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(resumeQuestions.skillBasedQuestions || []).slice(0, 4).map((q) => (
                          <li key={q} style={{ marginBottom: 4 }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Project-based questions</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(resumeQuestions.projectBasedQuestions || []).slice(0, 4).map((q) => (
                          <li key={q} style={{ marginBottom: 4 }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {companyPlans.length > 0 && (
                <div style={{ background: "#f0fdf4", padding: "24px", borderRadius: "24px", border: "1px solid #bbf7d0", marginBottom: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ fontSize: "1.45rem", fontWeight: 900, margin: 0, color: "#166534" }}>
                        Target Company Dashboard
                      </h2>
                      <p style={{ margin: "6px 0 0", color: "#166534" }}>
                        Readiness: {plannerSnapshot?.readiness?.overall || 0}/100 for your current placement plan.
                      </p>
                    </div>
                    <div style={{ background: "#166534", color: "#fff", padding: "10px 16px", borderRadius: "999px", fontWeight: 800 }}>
                      {plannerSnapshot?.profile?.targetRole || currentGoal || "Placement Prep"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginTop: "20px" }}>
                    {companyPlans.map((plan) => {
                      const primaryTest = (plan.recommendedTests || [])
                        .map((testId) => SAMPLE_TESTS.find((test) => test.id === testId))
                        .find(Boolean);

                      return (
                        <div key={plan.company} className="glass-card" style={{ padding: "20px", background: "#fff", border: "1px solid #dcfce7", display: "grid", gap: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{plan.company}</div>
                              <div style={{ color: "#64748b", fontSize: "0.86rem", marginTop: "4px" }}>
                                {plan.rounds.join(" • ")}
                              </div>
                            </div>
                            <div style={{ background: "#dcfce7", color: "#166534", padding: "6px 10px", borderRadius: "999px", fontWeight: 800, fontSize: "0.78rem" }}>
                              TARGET
                            </div>
                          </div>

                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "#166534", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Focus areas
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                              {plan.focusAreas.map((area) => (
                                <span key={area} style={{ background: "#ecfccb", color: "#3f6212", padding: "7px 10px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 }}>
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => primaryTest && handleStartTest(primaryTest)}
                              disabled={!primaryTest}
                              style={{ background: "#166534", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: primaryTest ? "pointer" : "not-allowed" }}
                            >
                              {primaryTest ? "Start target round" : "No mapped test yet"}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate("/interview-chat")}
                              style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
                            >
                              Mock interview
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate("/coding-challenges")}
                              style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
                            >
                              Coding arena
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skill Gap Analysis (NEW / AUTOMATIC) */}
              {weakTopicStats.length > 0 && (
                <div style={{ background: theme === "dark" ? "rgba(99,102,241,0.05)" : "#f8fafc", padding: "32px", borderRadius: "24px", border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0", marginBottom: "40px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: 900, margin: 0, color: "#6366f1" }}>Skill Upgrade Center</h2>
                      <p style={{ margin: "4px 0 0", color: "#64748b", fontWeight: 500 }}>AI identified {weakTopicStats.length} focus areas from your recent simulations.</p>
                    </div>
                    <div style={{ background: "#6366f1", color: "#fff", padding: "8px 16px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 800 }}>
                      TARGETED TRAINING
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
                    {weakTopicStats.map((stat, i) => (
                      <div key={i} className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", background: theme === "dark" ? "#1e293b" : "#fff", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: 800, fontSize: "1rem" }}>{stat.topic}</div>
                          {stat.attempted > 0 && (
                            <div style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>
                              {Math.round((stat.correct / stat.attempted) * 100)}% Proficiency
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                          Suggested for you based on simulation performance. Focus on this to upgrade your readiness score.
                        </p>
                        <button 
                          onClick={() => startFocusQuiz(stat.topic)}
                          disabled={loading}
                          style={{ marginTop: "8px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
                          {loading ? "Generating..." : `Practice ${stat.topic} 🚀`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="interview-prep__subtitle">Practice for multiple companies. Take aptitude and technical sample tests.</p>
              
              {recommended.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "32px 0 16px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🔥</span>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>Recommended for You</h2>
                  </div>
                  <div className="interview-prep__test-grid">
                    {recommended.map((test) => (
                      <div key={test.id} className="interview-prep__test-card" style={{ border: "2px solid #6366f1" }}>
                        <div className="interview-prep__test-badge" style={{ background: "#6366f1" }}>Targeting Weakness</div>
                        <h3>{test.title}</h3>
                        <p>{test.companyOrCategory} · {test.durationMinutes} min</p>
                        <button type="button" className="interview-prep__btn-primary" onClick={() => handleStartTest(test)}>
                          Start Test
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {companyTargets.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "32px 0 16px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🎯</span>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                      Target Company Tracks
                    </h2>
                  </div>
                  <div className="interview-prep__test-grid">
                    {companyTargets.map((test) => (
                      <div key={test.id} className="interview-prep__test-card" style={{ border: "2px solid #0f766e" }}>
                        <div className="interview-prep__test-badge" style={{ background: "#0f766e" }}>
                          Placement Target
                        </div>
                        <h3>{test.title}</h3>
                        <p>{test.companyOrCategory} · {test.durationMinutes} min</p>
                        <button type="button" className="interview-prep__btn-primary" onClick={() => handleStartTest(test)}>
                          Start Target Prep
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "40px 0 16px" }}>
                <span style={{ fontSize: "1.2rem" }}>🛡️</span>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>Foundation & Core Practice</h2>
              </div>
              <div className="interview-prep__test-grid">
                {foundation.map((test) => (
                  <div key={test.id} className="interview-prep__test-card">
                    <div className="interview-prep__test-badge">Compulsory</div>
                    <h3>{test.title}</h3>
                    <p>{test.companyOrCategory} · {test.durationMinutes} min</p>
                    <button type="button" className="interview-prep__btn-primary" onClick={() => handleStartTest(test)}>
                      Start Practice
                    </button>
                  </div>
                ))}
              </div>

              {others.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "40px 0 16px" }}>
                    <span style={{ fontSize: "1.2rem" }}>📚</span>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>All Test Challenges</h2>
                  </div>
                  <div className="interview-prep__test-grid">
                    {others.map((test) => (
                      <div key={test.id} className="interview-prep__test-card">
                        <div className="interview-prep__test-badge">{test.testType}</div>
                        <h3>{test.title}</h3>
                        <p>{test.companyOrCategory} · {test.durationMinutes} min</p>
                        <button type="button" className="interview-prep__btn-primary" onClick={() => handleStartTest(test)}>
                          Start Test
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          );
        })()}

        {view === "test" && selectedTest && (
          <section className="interview-prep__content interview-prep__content--test">
            <div className="interview-prep__quiz">
              {selectedTest.questions.map((q) => (
                <div key={q.id} className="interview-prep__question">
                  <p><strong>Q{q.id} ({q.skill}):</strong> {q.text}</p>
                  <div className="interview-prep__options">
                    {q.options.map((opt, i) => (
                      <label key={i} className="interview-prep__option">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === i}
                          onChange={() => handleAnswer(q.id, i)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="interview-prep__btn-primary" onClick={handleSubmitTest}>
                Submit Test
              </button>
            </div>
          </section>
        )}

        {view === "result" && result && (
          <section className="interview-prep__content">
            <div className="interview-prep__result-grid">
              <div className="interview-prep__result-card">
                <h3>Overall Score</h3>
                <div className="interview-prep__score-circle">{result.overallScore}%</div>
              </div>
              <div className="interview-prep__result-card">
                <h3>Skill Breakdown</h3>
                <div className="interview-prep__skill-bars">
                  {result.skillScores.map((s) => (
                    <div key={s.name} className="interview-prep__skill-row">
                      <span>{s.name}</span>
                      <div className="interview-prep__bar-wrap">
                        <div className="interview-prep__bar" style={{ width: `${s.score}%` }} />
                      </div>
                      <span>{s.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="interview-prep__result-grid">
              <div className="interview-prep__result-card">
                <h3>Strengths</h3>
                <ul className="interview-prep__tag-list interview-prep__tag-list--strength">
                  {result.strengths.length ? result.strengths.map((s) => <li key={s}>{s}</li>) : <li>—</li>}
                </ul>
              </div>
              <div className="interview-prep__result-card">
                <h3>Areas to Improve</h3>
                <ul className="interview-prep__tag-list interview-prep__tag-list--weakness">
                  {result.weaknesses.length ? result.weaknesses.map((w) => <li key={w}>{w}</li>) : <li>—</li>}
                </ul>
              </div>
            </div>
            <div className="interview-prep__result-card interview-prep__result-card--full">
              <h3>Recommended Courses</h3>
              <p className="interview-prep__result-desc">Based on your weak areas, we recommend these courses:</p>
              <ul className="interview-prep__course-list">
                {result.recommendedCourseNames?.length
                  ? result.recommendedCourseNames.map((c) => <li key={c}>{c}</li>)
                  : <li>No specific recommendations. Keep practicing!</li>}
              </ul>
            </div>
            <button type="button" className="interview-prep__btn-primary" onClick={handleBackToList}>
              Back to Tests
            </button>
          </section>
        )}

        {view === "progress" && (
          <section className="interview-prep__content">
            {loading ? (
              <p>Loading progress...</p>
            ) : progressList.length === 0 ? (
              <p className="interview-prep__empty">No test attempts yet. Take a sample test from Interview Prep.</p>
            ) : (
              <>
                <p className="interview-prep__subtitle">Your past attempts and scores. Teachers can see this progress on their dashboard.</p>
                <div className="interview-prep__progress-table-wrap">
                  <table className="interview-prep__progress-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Test / Company</th>
                        <th>Type</th>
                        <th>Score</th>
                        <th>Strengths</th>
                        <th>Weaknesses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressList.map((p) => (
                        <tr key={p._id}>
                          <td>{new Date(p.attemptedAt).toLocaleDateString()}</td>
                          <td>{p.companyOrCategory}</td>
                          <td>{p.testType}</td>
                          <td><strong>{p.overallScore}%</strong></td>
                          <td>{(p.strengths || []).join(", ") || "—"}</td>
                          <td>{(p.weaknesses || []).join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="interview-prep__radar-note">
                  <h3>Skill trend</h3>
                  <p>Your latest attempt: {progressList[0]?.skillScores?.map((s) => `${s.name}: ${s.score}%`).join(" · ") || "—"}</p>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
