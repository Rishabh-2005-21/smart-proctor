const GLOBAL_MONITOR_ROOM = "monitor:global";

const normalizeQuizCode = (value) => String(value || "general").trim() || "general";
const monitorRoom = (quizCode) => `monitor:${normalizeQuizCode(quizCode)}`;

export default function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id);

    const joinQuiz = (payload = {}) => {
      const quizCode = normalizeQuizCode(payload.quizCode || payload.quizId);
      const enrichedPayload = {
        ...payload,
        quizCode,
        joinedAt: new Date().toISOString()
      };

      socket.join(quizCode);
      io.to(monitorRoom(quizCode)).emit("student-joined", enrichedPayload);
      io.to(GLOBAL_MONITOR_ROOM).emit("student-joined", enrichedPayload);
    };

    socket.on("join-quiz", joinQuiz);
    socket.on("join_quiz", joinQuiz);

    socket.on("join-teacher-monitor", (payload = {}) => {
      const quizCode = normalizeQuizCode(payload.quizCode);
      socket.join(GLOBAL_MONITOR_ROOM);
      socket.join(monitorRoom(quizCode));
    });

    socket.on("violation", (payload = {}) => {
      const quizCode = normalizeQuizCode(payload.quizCode || payload.quizId);
      const enrichedPayload = {
        ...payload,
        quizCode,
        time: new Date().toISOString()
      };

      io.to(quizCode).emit("violation-alert", enrichedPayload);
      io.to(monitorRoom(quizCode)).emit("violation_log", enrichedPayload);
      io.to(GLOBAL_MONITOR_ROOM).emit("violation_log", enrichedPayload);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });
}
