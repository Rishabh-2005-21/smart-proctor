import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const CreateQuiz = () => {
  const navigate = useNavigate();

  const TOTAL_TIME = 5 * 60;

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);

  const [showWarning, setShowWarning] = useState(false);
  const [warningText, setWarningText] = useState("");

  /* ---------------- START QUIZ ---------------- */
  const startQuiz = () => {
    document.documentElement.requestFullscreen();
    setStarted(true);
  };

  /* ---------------- DETECTION LOGIC ---------------- */
  useEffect(() => {
    if (!started) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        setWarningText("⚠️ Tab switching detected. Return to quiz.");
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExitCount((c) => c + 1);
        setWarningText("⚠️ Fullscreen exited. Please re-enter fullscreen.");
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [started]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!started || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft]);

  /* ---------------- END QUIZ ---------------- */
  useEffect(() => {
    if (timeLeft === 0) endQuiz();
  }, [timeLeft]);

  const endQuiz = () => {
    alert("⏰ Quiz submitted!");

    console.log({
      tabSwitchCount,
      fullscreenExitCount
    });

    navigate("/student");
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ---------------- START SCREEN ---------------- */
  if (!started) {
    return (
      <div style={styles.center}>
        <h2>Ready to Start Quiz?</h2>
        <button onClick={startQuiz} style={styles.startBtn}>
          Enter Fullscreen & Start
        </button>
      </div>
    );
  }

  /* ---------------- QUIZ UI ---------------- */
  return (
    <div style={styles.container}>
      {showWarning && (
        <div style={styles.popup}>
          {warningText}
        </div>
      )}

      <h2>Live Quiz</h2>

      <div style={styles.timer}>
        ⏳ Time Left: {formatTime(timeLeft)}
      </div>

      <div style={styles.question}>
        <p><strong>Q1.</strong> What is React?</p>
        <label><input type="radio" name="q1" /> Library</label><br />
        <label><input type="radio" name="q1" /> Framework</label><br />
        <label><input type="radio" name="q1" /> Language</label>
      </div>

      <div style={styles.violations}>
        <p>Tab Switches: {tabSwitchCount}</p>
        <p>Fullscreen Exits: {fullscreenExitCount}</p>
      </div>

      <button onClick={endQuiz} style={styles.submitBtn}>
        Submit Quiz
      </button>
    </div>
  );
};

/* ---------------- STYLES ---------------- */
const styles = {
  center: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  startBtn: {
    padding: "14px 30px",
    fontSize: "16px",
    background: "#16a34a",
    color: "white",
    border: "none",
    cursor: "pointer"
  },
  popup: {
    background: "#dc2626",
    color: "white",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "15px",
    textAlign: "center"
  },
  container: {
    maxWidth: "600px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px"
  },
  timer: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "15px",
    color: "#dc2626"
  },
  question: {
    marginBottom: "20px"
  },
  violations: {
    background: "#fee2e2",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "20px"
  },
  submitBtn: {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer"
  }
};

export default CreateQuiz;
