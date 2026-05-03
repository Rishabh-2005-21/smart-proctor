import { useState } from "react";
import Timer from "./Timer";
import ViolationPopup from "./ViolationPopup";

export default function QuizJoin() {
  const [started, setStarted] = useState(false);
  const [quizCode, setQuizCode] = useState("");
  const [violation, setViolation] = useState(false);

  const startQuiz = () => {
    if (!quizCode) {
      alert("Enter quiz code");
      return;
    }

    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }

    setStarted(true);
  };

  // Detect tab switch
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setViolation(true);
    }
  });

  return (
    <div style={{ padding: "40px" }}>
      {!started ? (
        <>
          <h2>Join Quiz</h2>
          <input
            placeholder="Enter Quiz Code"
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value)}
          />
          <br /><br />
          <button onClick={startQuiz}>Start Quiz</button>
        </>
      ) : (
        <>
          <h2>Quiz Started</h2>
          <Timer minutes={1} />
          <p>Quiz is running... stay in fullscreen</p>
        </>
      )}

      <ViolationPopup
        show={violation}
        onClose={() => setViolation(false)}
      />
    </div>
  );
}
