import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiUrl, API_ORIGIN } from "../config/api";
import { api, getErrorMessage } from "../services/api";
import { queueDashboardGuide } from "../utils/dashboardGuide";
import "./Login.css";

function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const navigate = useNavigate();
  const { isAuthenticated, role: currentRole, user, login, logout } = useAuth();

  const resetStatus = () => {
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetStatus();

    try {
      setLoading(true);

      if (mode === "register") {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError("Please fill in name, email, and password.");
          return;
        }

        const response = await api.post(apiUrl("/auth/register"), {
          name: name.trim(),
          email: email.trim(),
          password,
          role
        });

        if (response.data?.pending) {
          setInfo(
            response.data?.msg ||
              "Your account was created and is pending approval."
          );
          setMode("login");
          setPassword("");
          return;
        }

        const {
          token,
          role: serverRole,
          name: serverName,
          id: serverId
        } = response.data;
        login({
          token,
          role: serverRole,
          user: {
            id: serverId,
            name: serverName,
            email: email.trim(),
            role: serverRole
          }
        });
        queueDashboardGuide({
          role: serverRole,
          experienceLevel: "new"
        });

        if (serverRole === "teacher") {
          navigate("/teacher-dashboard");
        } else {
          navigate("/student-dashboard");
        }
      } else {
        // login
        if (!email.trim() || !password.trim()) {
          setError("Please enter your email and password.");
          return;
        }

        const response = await api.post(apiUrl("/auth/login"), {
          email: email.trim(),
          password
        });

        const {
          token,
          role: serverRole,
          name: serverName,
          id: serverId
        } = response.data;
        login({
          token,
          role: serverRole,
          user: {
            id: serverId,
            name: serverName,
            email: email.trim(),
            role: serverRole
          }
        });
        queueDashboardGuide({
          role: serverRole,
          experienceLevel: "returning"
        });

        if (serverRole === "teacher") {
          navigate("/teacher-dashboard");
        } else {
          navigate("/student-dashboard");
        }
      }
    } catch (err) {
      const fallback = `Cannot reach server. Make sure the backend is running on ${API_ORIGIN}.`;
      setError(getErrorMessage(err, fallback));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div className="auth-shell">
        {/* Left: illustration / brand */}
        <div className="auth-illustration">
          <div className="auth-badge">SmartProctor</div>
          <h1 className="auth-hero-title">
            Smart, secure
            <span> exam monitoring</span>
          </h1>
          <p className="auth-hero-text">
            Join as a student or admin. Create exams, manage students, track performance,
            and practice interviews with an AI‑assisted proctor.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "6px",
              maxWidth: "430px"
            }}
          >
            {[
              "AI Question Generation",
              "Adaptive Difficulty",
              "Proctored Timed Tests",
              "Readiness Analytics",
              "Interview Simulation",
              "Coding Challenge Arena"
            ].map((feature) => (
              <div
                key={feature}
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(148,163,184,0.45)",
                  padding: "8px 10px",
                  fontSize: "0.78rem",
                  color: "#dbeafe",
                  background:
                    "radial-gradient(circle at 0 0, rgba(59,130,246,0.25), rgba(15,23,42,0.75))"
                }}
              >
                {feature}
              </div>
            ))}
          </div>

          <div className="auth-hero-stats">
            <div className="auth-stat">
              <span className="auth-stat-number">24/7</span>
              <span className="auth-stat-label">Secure access</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-number">AI</span>
              <span className="auth-stat-label">Smart insights</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-number">∞</span>
              <span className="auth-stat-label">Practice sessions</span>
            </div>
          </div>
        </div>

        {/* Right: auth card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-toggle">
              <button
                type="button"
                className={`auth-toggle-btn ${
                  mode === "login" ? "auth-toggle-btn--active" : ""
                }`}
                onClick={() => toggleMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-toggle-btn ${
                  mode === "register" ? "auth-toggle-btn--active" : ""
                }`}
                onClick={() => toggleMode("register")}
              >
                Register
              </button>
            </div>

            <h2 className="auth-title">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="auth-subtitle">
              {mode === "login"
                ? "Sign in to access your dashboard and upcoming exams."
                : "Sign up in seconds to start creating or taking exams."}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {info && (
            <div
              className="auth-error"
              style={{
                background: "rgba(34, 197, 94, 0.14)",
                color: "#166534",
                borderColor: "rgba(34, 197, 94, 0.25)"
              }}
            >
              {info}
            </div>
          )}
          {isAuthenticated && (
            <div
              className="auth-error"
              style={{
                background: "rgba(37, 99, 235, 0.1)",
                color: "#1d4ed8",
                borderColor: "rgba(37, 99, 235, 0.2)"
              }}
            >
              Signed in as {user?.name || "user"} ({currentRole}).
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() =>
                    navigate(currentRole === "teacher" ? "/teacher-dashboard" : "/student-dashboard")
                  }
                >
                  Continue to dashboard
                </button>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    logout();
                    resetStatus();
                  }}
                >
                  Use another account
                </button>
              </div>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="name">
                  Full name
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden>
                    👤
                  </span>
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="auth-input"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="email">
                Email address
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden>
                  ✉️
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden>
                  🔒
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Role</label>
              <div className="auth-role-row">
                <button
                  type="button"
                  className={`auth-role-btn ${
                    role === "student" ? "auth-role-btn--active" : ""
                  }`}
                  onClick={() => setRole("student")}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  className={`auth-role-btn ${
                    role === "teacher" ? "auth-role-btn--active" : ""
                  }`}
                  onClick={() => setRole("teacher")}
                >
                  🧑‍💼 Admin
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login to dashboard"
                  : "Register and continue"}
            </button>
          </form>

          <p className="auth-footer-text">
            {mode === "login" ? "New to SmartProctor? " : "Already have an account? "}
            <button
              type="button"
              className="auth-link"
              onClick={() =>
                toggleMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Create an account" : "Login instead"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
