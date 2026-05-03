import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import StudentShell from "./components/layout/StudentShell";

const Login = lazy(() => import("./pages/Login"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const InterviewPrepDashboard = lazy(() => import("./pages/InterviewPrepDashboard"));
const StudentAnalytics = lazy(() => import("./pages/StudentAnalytics"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const CodingChallenges = lazy(() => import("./pages/CodingChallenges"));
const InterviewChat = lazy(() => import("./pages/InterviewChat"));
const RevisionCenter = lazy(() => import("./pages/RevisionCenter"));
const Quiz = lazy(() => import("./student/Quiz.jsx"));
const StudentRoadmap = lazy(() => import("./pages/StudentRoadmap"));
const PlacementPlanner = lazy(() => import("./pages/PlacementPlanner"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/quiz"
          element={
            <ProtectedRoute role="student">
              <Quiz />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute role="student">
              <StudentShell />
            </ProtectedRoute>
          }
        >
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/interview-prep" element={<InterviewPrepDashboard />} />
          <Route path="/placement-planner" element={<PlacementPlanner />} />
          <Route path="/student-analytics" element={<StudentAnalytics />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/coding-challenges" element={<CodingChallenges />} />
          <Route path="/interview-chat" element={<InterviewChat />} />
          <Route path="/revision-center" element={<RevisionCenter />} />
          <Route path="/student-roadmap" element={<StudentRoadmap />} />
        </Route>

        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/home" element={<Navigate to="/student-dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #f8fbff 0%, #e0ecff 100%)",
        color: "#10203a",
        fontWeight: 700
      }}
    >
      Loading workspace...
    </div>
  );
}

export default App;
