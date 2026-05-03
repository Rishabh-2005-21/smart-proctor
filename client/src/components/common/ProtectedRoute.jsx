import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, role: currentRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && currentRole !== role) {
    return (
      <Navigate
        to={currentRole === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
