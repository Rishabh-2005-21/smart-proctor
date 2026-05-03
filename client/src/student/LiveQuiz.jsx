import { useEffect } from "react";
import { ensureSocketConnection } from "../services/socketService";

export default function LiveQuiz() {
  useEffect(() => {
    const socket = ensureSocketConnection();
    socket.emit("join-quiz", { quizCode: "practice-room", student: "Student1" });

    const handleBlur = () => {
      socket.emit("violation", {
        quizCode: "practice-room",
        type: "TAB_SWITCH"
      });
      alert("Tab switch detected!");
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return (
    <div className="center">
      <h2>Live Quiz Running</h2>
      <p>Do not switch tabs</p>
    </div>
  );
}
