import { useEffect, useState } from "react";
import { ensureSocketConnection } from "../services/socketService";

export default function Dashboard() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const socket = ensureSocketConnection();
    const handleViolation = (data) => {
      setLogs((prev) => [...prev, data]);
    };

    socket.emit("join-teacher-monitor", { quizCode: "general" });
    socket.on("violation_log", handleViolation);

    return () => {
      socket.off("violation_log", handleViolation);
    };
  }, []);

  return (
    <div>
      <h2>Teacher Dashboard</h2>
      {logs.map((l, i) => (
        <p key={i}>{l.student} → {l.type}</p>
      ))}
    </div>
  );
}
