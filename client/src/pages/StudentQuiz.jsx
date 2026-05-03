import { useEffect } from "react";
import { ensureSocketConnection } from "../services/socketService";

export default function StudentQuiz() {

  useEffect(() => {
    const liveSocket = ensureSocketConnection();

    liveSocket.emit("join-quiz", {
      quizCode: "ABC123",
      student: "Rishabh"
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        liveSocket.emit("violation", {
          quizCode: "ABC123",
          type: "TAB_SWITCH"
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        liveSocket.emit("violation", {
          quizCode: "ABC123",
          type: "EXIT_FULLSCREEN"
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div>
      <h2>Student Quiz Screen</h2>
      <button onClick={() => document.documentElement.requestFullscreen()}>
        Enter Fullscreen
      </button>
    </div>
  );
}
