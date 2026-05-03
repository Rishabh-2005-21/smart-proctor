import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend
} from "recharts";
import "./TeacherDashboard.css";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { useAuth } from "../auth/AuthContext";
import { ensureSocketConnection } from "../services/socketService";
import DashboardGuideModal from "../components/common/DashboardGuideModal";
import {
  buildLocalDashboardGuide,
  consumeDashboardGuide
} from "../utils/dashboardGuide";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];
const DIFF_COLORS = { easy: "#10b981", medium: "#f59e0b", hard: "#f43f5e" };

const FALLBACK_TREND = [
  { day: "Mon", present: 0, absent: 0, late: 0 },
  { day: "Tue", present: 0, absent: 0, late: 0 },
  { day: "Wed", present: 0, absent: 0, late: 0 },
  { day: "Thu", present: 0, absent: 0, late: 0 },
  { day: "Fri", present: 0, absent: 0, late: 0 },
  { day: "Sat", present: 0, absent: 0, late: 0 },
  { day: "Sun", present: 0, absent: 0, late: 0 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", fontSize: "0.82rem" }}>
        <p style={{ fontWeight: 800, marginBottom: "8px", color: "#1e293b" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, margin: "4px 0" }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [approvalMsg, setApprovalMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [dashboardGuide, setDashboardGuide] = useState(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideLoading, setIsGuideLoading] = useState(false);
  const [guideTrigger] = useState(() => consumeDashboardGuide("teacher"));
  const [hasRequestedGuide, setHasRequestedGuide] = useState(false);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [userRes, summaryRes, leaderRes, pendingRes] = await Promise.all([
        axios.get(apiUrl("/admin/users"), { headers: authHeader }).catch(() => ({ data: [] })),
        axios.get(apiUrl("/analytics/admin/summary")).catch(() => ({ data: {} })),
        axios.get(apiUrl("/analytics/leaderboard")).catch(() => ({ data: {} })),
        axios.get(apiUrl("/admin/pending"), { headers: authHeader }).catch(() => ({ data: [] })),
      ]);

      setUsers(userRes.data || []);
      setSummary(summaryRes.data || {});
      setPendingAdmins(pendingRes.data || []);

      const topScore = leaderRes.data?.topByScore || [];
      setRecentAttempts(topScore.slice(0, 5));
    } catch (e) {
      console.error("Admin fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const res = await axios.post(apiUrl(`/admin/approve/${userId}`), {}, { headers: authHeader });
      setApprovalMsg(res.data.msg);
      fetchAll();
    } catch (e) {
      setApprovalMsg(e?.response?.data?.msg || "Approval failed");
    }
    setTimeout(() => setApprovalMsg(""), 4000);
  };

  const handleReject = async (userId) => {
    try {
      const res = await axios.post(apiUrl(`/admin/reject/${userId}`), {}, { headers: authHeader });
      setApprovalMsg(res.data.msg);
      fetchAll();
    } catch (e) {
      setApprovalMsg(e?.response?.data?.msg || "Rejection failed");
    }
    setTimeout(() => setApprovalMsg(""), 4000);
  };

  const [deleteMsg, setDeleteMsg] = useState("");
  const handleDelete = async (userId, userName) => {
    const confirmed = window.confirm(`⚠️ Permanently delete "${userName}"?\n\nThis will remove their account and ALL test history. This action CANNOT be undone.`);
    if (!confirmed) return;
    try {
      const res = await axios.delete(apiUrl(`/admin/delete/${userId}`), { headers: authHeader });
      setDeleteMsg(res.data.msg);
      fetchAll();
    } catch (e) {
      const errMsg = e?.response?.data?.msg || e?.message || "Deletion failed";
      console.error("Delete error:", e?.response?.status, e?.response?.data);
      setDeleteMsg(errMsg);
    }
    setTimeout(() => setDeleteMsg(""), 5000);
  };

  // Current logged-in admin ID (decoded from JWT)
  const currentAdminId = (() => {
    try {
      if (!token) return null;
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload)).id || null;
    } catch { return null; }
  })();

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAll();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = ensureSocketConnection();
    const handleViolation = (payload) => {
      setLiveAlerts((prev) => [payload, ...prev].slice(0, 6));
    };

    socket.emit("join-teacher-monitor", {});
    socket.on("violation_log", handleViolation);

    return () => {
      socket.off("violation_log", handleViolation);
    };
  }, []);

  // --- Derived metrics from student data ---
  const totalStudents = users.filter(u => u.role === "student").length;
  const totalAdmins = users.filter(u => u.role === "teacher").length;
  const totalSessions = summary?.totalAttempts || 0;
  const avgScore = summary?.avgScore || 0;
  const avgReadiness = summary?.avgReadiness || 0;
  const totalAwards = summary?.totalAwards || 0;

  // Trend chart data
  const trendData = summary?.attendanceTrend?.length ? summary.attendanceTrend : FALLBACK_TREND;

  // Topic accuracy data from student test attempts
  const topicData = summary?.topicAccuracy || [];

  // Top performers from leaderboard
  const topPerformers = summary?.topPerformers || [];

  // Difficulty distribution
  const diffData = [
    { name: "Easy", value: summary?.difficultyBreakdown?.easy || 0 },
    { name: "Medium", value: summary?.difficultyBreakdown?.medium || 0 },
    { name: "Hard", value: summary?.difficultyBreakdown?.hard || 0 },
  ];

  // Proctor status chart
  const proctorData = [
    { name: "Approved", value: totalStudents },
    { name: "Pending", value: Math.max(0, Math.floor(totalStudents * 0.12)) },
  ];

  // Radar data for topic strength
  const radarData = topicData.slice(0, 6).map(t => ({
    subject: t.topic?.slice(0, 12) || "Topic",
    score: t.accuracy,
  }));

  const requestDashboardGuide = useCallback(
    async ({ forceRefresh = false } = {}) => {
      if (isGuideLoading) {
        return;
      }

      if (!forceRefresh && dashboardGuide) {
        setIsGuideOpen(true);
        return;
      }

      const context = {
        experienceLevel: guideTrigger?.experienceLevel || "returning",
        userName: user?.name || "Admin",
        activeTab,
        totalStudents,
        totalAdmins,
        totalSessions,
        avgReadiness,
        pendingApprovals: pendingAdmins.length,
        liveAlerts: liveAlerts.length
      };

      setIsGuideOpen(true);
      setIsGuideLoading(true);

      try {
        const response = await axios.post(apiUrl("/ai/dashboard-guide"), {
          role: "teacher",
          context
        });
        setDashboardGuide(
          response.data || buildLocalDashboardGuide("teacher", context)
        );
      } catch (error) {
        console.error("Teacher dashboard guide error", error);
        setDashboardGuide(buildLocalDashboardGuide("teacher", context));
      } finally {
        setIsGuideLoading(false);
      }
    },
    [
      activeTab,
      avgReadiness,
      dashboardGuide,
      guideTrigger?.experienceLevel,
      isGuideLoading,
      liveAlerts.length,
      pendingAdmins.length,
      totalAdmins,
      totalSessions,
      totalStudents,
      user?.name
    ]
  );

  useEffect(() => {
    if (!guideTrigger || hasRequestedGuide || loading) {
      return;
    }

    setHasRequestedGuide(true);
    requestDashboardGuide();
  }, [guideTrigger, hasRequestedGuide, loading, requestDashboardGuide]);

  const statCards = [
    { label: "Total Students", value: loading ? "..." : totalStudents, sub: "Registered learners", color: "#2563eb", icon: "🎓" },
    { label: "Sessions Conducted", value: loading ? "..." : totalSessions, sub: "Total AI test attempts", color: "#10b981", icon: "📝" },
    { label: "Avg Readiness Score", value: loading ? "..." : `${avgReadiness}%`, sub: "Platform-wide placement score", color: "#f59e0b", icon: "🏆" },
    { label: "Awards Earned", value: loading ? "..." : totalAwards, sub: "Scores above 80%", color: "#f43f5e", icon: "🥇" },
  ];

  const NAV_ITEMS = [
    { icon: "📊", label: "Dashboard", tab: "Dashboard" },
    { icon: "📋", label: "Students", tab: "Students" },
    { icon: "🧪", label: "Tests", tab: "Tests" },
    { icon: "📑", label: "Topics", tab: "Topics" },
    { icon: "🏅", label: "Ranks", tab: "Ranks" },
    { icon: "🔐", label: "Approvals", tab: "Approvals", badge: pendingAdmins.length },
    { icon: "⚙️", label: "Settings", tab: "Settings" },
  ];

  return (
    <div className="tp-body">
      <DashboardGuideModal
        isOpen={isGuideOpen}
        loading={isGuideLoading}
        guide={dashboardGuide}
        onClose={() => setIsGuideOpen(false)}
        onRefresh={() => requestDashboardGuide({ forceRefresh: true })}
        accent="#2563eb"
      />

      {/* SIDEBAR */}
      <aside className="tp-sidebar">
        <div style={{
          background: "linear-gradient(135deg, #1e40af, #7c3aed)",
          width: "44px", height: "44px", borderRadius: "12px",
          display: "flex", justifyContent: "center", alignItems: "center",
          color: "white", fontSize: "1.3rem", marginBottom: "24px",
          boxShadow: "0 4px 12px rgba(99,102,241,0.4)"
        }}>🎓</div>

        <nav style={{ width: "100%" }}>
          {NAV_ITEMS.map(item => (
            <div
              key={item.tab}
              className={`tp-nav-item ${activeTab === item.tab ? "active" : ""}`}
              onClick={() => setActiveTab(item.tab)}
              style={{ position: "relative" }}
            >
              <span className="tp-nav-icon">{item.icon}</span>
              <span className="tp-nav-label">{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position: "absolute", top: "10px", right: "12px", background: "#f43f5e", color: "white", borderRadius: "99px", fontSize: "0.6rem", fontWeight: 900, padding: "2px 6px", minWidth: "16px", textAlign: "center" }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
          <div className="tp-nav-item" onClick={() => navigate("/student-dashboard")}>
            <span className="tp-nav-icon">👤</span>
            <span className="tp-nav-label">Student View</span>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="tp-main">
        {/* TOP BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Smart Proctor Admin</div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>
              {activeTab === "Dashboard" ? "Overview Dashboard" : activeTab}
            </h1>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={fetchAll}
              style={{ padding: "10px 20px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: 700, fontSize: "0.82rem", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => requestDashboardGuide()}
              style={{ padding: "10px 20px", background: "white", border: "1px solid #dbeafe", borderRadius: "8px", fontWeight: 700, fontSize: "0.82rem", color: "#2563eb", cursor: "pointer" }}
            >
              AI Guide
            </button>
            <button
              onClick={() => navigate("/student-dashboard")}
              style={{ padding: "10px 24px", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
            >
              Open Student Workspace
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              style={{ padding: "10px 18px", background: "#0f172a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", width: "auto", marginTop: 0 }}
            >
              Logout
            </button>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "0.8rem", fontWeight: 900 }}>AD</div>
          </div>
        </div>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === "Dashboard" && (
          <>
            {/* STAT CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "28px" }}>
              {statCards.map((s, i) => (
                <div key={i} style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "70px", height: "70px", borderRadius: "50%", background: s.color, opacity: 0.08 }} />
                  <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>{s.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#334155", marginTop: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="tp-card" style={{ marginBottom: "20px" }}>
              <div className="tp-card-header">
                <div className="tp-card-title">Live proctor alerts</div>
              </div>
              {liveAlerts.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                  No live violations have been reported in this session yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {liveAlerts.map((alert, index) => (
                    <div
                      key={`${alert.quizCode || "general"}-${alert.time || index}-${index}`}
                      style={{
                        border: "1px solid #fee2e2",
                        background: "#fff7f7",
                        color: "#991b1b",
                        borderRadius: "14px",
                        padding: "12px 14px"
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {alert.student || alert.studentName || "Student"} - {alert.type || "Violation"}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#7f1d1d", marginTop: "4px" }}>
                        Quiz room: {alert.quizCode || "general"} | {alert.time ? new Date(alert.time).toLocaleString() : "just now"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ROW 1: Session Trend + Topic Accuracy Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px", marginBottom: "20px" }}>
              {/* Session Activity Trend */}
              <div className="tp-card">
                <div className="tp-card-header">
                  <div className="tp-card-title">📈 Student Session Activity (Last 7 Days)</div>
                </div>
                <div style={{ height: "260px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="present" name="Tests Taken" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#gPresent)" dot={{ r: 4, fill: "#2563eb" }} />
                      <Area type="monotone" dataKey="late" name="Low Scores" stroke="#f43f5e" strokeWidth={2} fill="none" dot={{ r: 3, fill: "#f43f5e" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Topic Accuracy Bar */}
              <div className="tp-card">
                <div className="tp-card-header">
                  <div className="tp-card-title">🎯 Topic Accuracy (All Students)</div>
                </div>
                {topicData.length === 0 ? (
                  <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", textAlign: "center" }}>
                    <div>
                      <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📋</div>
                      <p>No test data yet.<br />Topics appear once students complete tests.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: "260px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis type="category" dataKey="topic" width={90} tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="accuracy" name="Accuracy %" radius={[0, 6, 6, 0]} barSize={16}>
                          {topicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: Top Performers + Skill Radar + Proctors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              {/* Top Performers */}
              <div className="tp-card">
                <div className="tp-card-title" style={{ marginBottom: "20px" }}>🏆 Top Performers</div>
                {topPerformers.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>👥</div>
                    No data yet
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {topPerformers.map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#e2e8f0", color: i < 3 ? "white" : "#64748b", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "0.75rem", fontWeight: 900, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>{p.name || "Student"}</div>
                          <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "99px", marginTop: "4px" }}>
                            <div style={{ height: "100%", width: `${p.avg}%`, background: COLORS[i], borderRadius: "99px" }} />
                          </div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: "0.9rem", color: COLORS[i] }}>{p.avg}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skill Radar */}
              <div className="tp-card">
                <div className="tp-card-title" style={{ marginBottom: "16px" }}>🕸️ Skill Coverage Radar</div>
                {radarData.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📡</div>
                    No topic data yet
                  </div>
                ) : (
                  <div style={{ height: "200px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Proctor Status */}
              <div className="tp-card">
                <div className="tp-card-title" style={{ marginBottom: "16px" }}>✅ Proctor Enrollment Status</div>
                <div style={{ height: "160px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={proctorData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {proctorData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {proctorData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i] }} />
                      <span style={{ color: "#64748b" }}>{d.name}: <strong style={{ color: "#1e293b" }}>{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ROW 3: Registered Users Table */}
            <div className="tp-card">
              <div className="tp-card-header">
                <div className="tp-card-title">👥 Registered Users Directory</div>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>Total: {users.length}</span>
              </div>

              {/* Delete toast */}
              {deleteMsg && (
                <div style={{ marginBottom: "16px", padding: "14px 20px", borderRadius: "10px", fontWeight: 700, fontSize: "0.9rem", background: deleteMsg.includes("deleted") ? "#d1fae5" : "#fee2e2", color: deleteMsg.includes("deleted") ? "#065f46" : "#991b1b", border: `1px solid ${deleteMsg.includes("deleted") ? "#6ee7b7" : "#fca5a5"}` }}>
                  {deleteMsg.includes("deleted") ? "🗑️" : "❌"} {deleteMsg}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                      {["#", "Name", "Email", "Role", "Joined", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 800, color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 10).map((u, i) => (
                      <tr key={u._id} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: COLORS[i % COLORS.length], color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "0.75rem", fontWeight: 900, flexShrink: 0 }}>
                              {(u.name || "?")[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{u.email}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 800, background: u.role === "teacher" ? "#fef3c7" : "#eff6ff", color: u.role === "teacher" ? "#b45309" : "#1d4ed8" }}>
                            {u.role === "teacher" ? "Admin" : "Student"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {u._id !== currentAdminId ? (
                            <button
                              onClick={() => handleDelete(u._id, u.name)}
                              style={{ padding: "6px 14px", background: "white", color: "#f43f5e", border: "1.5px solid #f43f5e", borderRadius: "7px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s" }}
                              onMouseOver={e => { e.currentTarget.style.background = "#fef2f2"; }}
                              onMouseOut={e => { e.currentTarget.style.background = "white"; }}
                              title={`Permanently delete ${u.name}`}
                            >
                              🗑️ Delete
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No users registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ===== STUDENTS TAB ===== */}
        {activeTab === "Students" && (
          <div style={{ display: "grid", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="tp-card">
                <div className="tp-card-title" style={{ marginBottom: "20px" }}>📊 Score Distribution</div>
                <div style={{ height: "280px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPerformers}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avg" name="Avg Score %" radius={[6, 6, 0, 0]}>
                        {topPerformers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="tp-card">
                <div className="tp-card-title" style={{ marginBottom: "20px" }}>📈 Avg Placement Readiness</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px", gap: "12px" }}>
                  <div style={{ position: "relative", width: "160px", height: "160px" }}>
                    <svg viewBox="0 0 160 160" width="160" height="160">
                      <circle cx="80" cy="80" r="60" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                      <circle cx="80" cy="80" r="60" fill="none" stroke="#2563eb" strokeWidth="16"
                        strokeDasharray={`${(avgReadiness / 100) * 376.99} 376.99`}
                        strokeLinecap="round"
                        transform="rotate(-90 80 80)"
                      />
                    </svg>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#1e293b" }}>{avgReadiness}%</div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}>Readiness</div>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", margin: 0 }}>
                    Avg placement readiness across <strong style={{ color: "#1e293b" }}>{totalStudents}</strong> students
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== TOPICS TAB ===== */}
        {activeTab === "Topics" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="tp-card">
              <div className="tp-card-title" style={{ marginBottom: "20px" }}>🎯 Topic-wise Accuracy</div>
              {topicData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>No topic data yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {topicData.map((t, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                        <span style={{ fontWeight: 700, color: "#334155" }}>{t.topic}</span>
                        <span style={{ fontWeight: 900, color: t.accuracy >= 70 ? "#10b981" : t.accuracy >= 40 ? "#f59e0b" : "#f43f5e" }}>{t.accuracy}%</span>
                      </div>
                      <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "99px" }}>
                        <div style={{ height: "100%", width: `${t.accuracy}%`, background: t.accuracy >= 70 ? "#10b981" : t.accuracy >= 40 ? "#f59e0b" : "#f43f5e", borderRadius: "99px", transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="tp-card">
              <div className="tp-card-title" style={{ marginBottom: "20px" }}>🕸️ Skill Radar View</div>
              <div style={{ height: "320px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData.length ? radarData : [{ subject: "No Data", score: 0 }]}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Accuracy" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ===== RANKS TAB ===== */}
        {activeTab === "Ranks" && (
          <div className="tp-card">
            <div className="tp-card-title" style={{ marginBottom: "24px" }}>🏅 Full Leaderboard</div>
            {topPerformers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>No ranking data yet. Students need to complete tests.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Rank", "Student", "Avg Score", "Badge"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 800, color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 900, fontSize: "1rem", color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#64748b" }}>#{i + 1}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1e293b" }}>{p.name}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 900, color: p.avg >= 80 ? "#10b981" : p.avg >= 60 ? "#f59e0b" : "#f43f5e", fontSize: "1.1rem" }}>{p.avg}%</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 800, background: p.avg >= 80 ? "#d1fae5" : p.avg >= 60 ? "#fef3c7" : "#fee2e2", color: p.avg >= 80 ? "#065f46" : p.avg >= 60 ? "#92400e" : "#991b1b" }}>
                          {p.avg >= 80 ? "🏆 Elite" : p.avg >= 60 ? "⭐ Good" : "📚 Needs Work"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ===== APPROVALS TAB ===== */}
        {activeTab === "Approvals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Admin Access Control</div>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>Pending Admin Approvals</h2>
              </div>
              {pendingAdmins.length > 0 && (
                <span style={{ background: "#fee2e2", color: "#991b1b", padding: "6px 16px", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 800 }}>
                  🔔 {pendingAdmins.length} request{pendingAdmins.length > 1 ? "s" : ""} waiting
                </span>
              )}
            </div>

            {/* Toast message */}
            {approvalMsg && (
              <div style={{ background: approvalMsg.toLowerCase().includes("reject") ? "#fee2e2" : "#d1fae5", color: approvalMsg.toLowerCase().includes("reject") ? "#991b1b" : "#065f46", borderRadius: "10px", padding: "14px 20px", fontWeight: 700, fontSize: "0.9rem", border: `1px solid ${approvalMsg.toLowerCase().includes("reject") ? "#fca5a5" : "#6ee7b7"}` }}>
                {approvalMsg.toLowerCase().includes("reject") ? "❌" : "✅"} {approvalMsg}
              </div>
            )}

            {pendingAdmins.length === 0 ? (
              <div className="tp-card" style={{ textAlign: "center", padding: "60px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>All Clear</div>
                <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>No pending admin approval requests. All is in order.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {pendingAdmins.map((admin, i) => (
                  <div key={admin._id} className="tp-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.2rem", fontWeight: 900, flexShrink: 0 }}>
                        {(admin.name || "A")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.email}</div>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: "99px", background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>
                        PENDING
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.78rem" }}>
                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px", border: "1px solid #f1f5f9" }}>
                        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>ROLE REQUESTED</div>
                        <div style={{ fontWeight: 800, color: "#1e293b" }}>🔐 Admin</div>
                      </div>
                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px", border: "1px solid #f1f5f9" }}>
                        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>REGISTERED</div>
                        <div style={{ fontWeight: 800, color: "#1e293b" }}>
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleApprove(admin._id)}
                        style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #059669, #10b981)", color: "white", border: "none", borderRadius: "10px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", transition: "opacity 0.2s" }}
                        onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
                        onMouseOut={e => e.currentTarget.style.opacity = "1"}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleReject(admin._id)}
                        style={{ flex: 1, padding: "12px", background: "white", color: "#f43f5e", border: "2px solid #f43f5e", borderRadius: "10px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseOver={e => { e.currentTarget.style.background = "#fef2f2"; }}
                        onMouseOut={e => { e.currentTarget.style.background = "white"; }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === "Settings" && (
          <div className="tp-card" style={{ maxWidth: "600px" }}>
            <div className="tp-card-title" style={{ marginBottom: "20px" }}>⚙️ Admin Settings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem" }}>Admin Name</label>
                <input defaultValue="Admin" style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem" }}>Platform Name</label>
                <input defaultValue="Smart Proctor" style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem", boxSizing: "border-box" }} />
              </div>
              <button onClick={() => navigate("/student-dashboard")} style={{ padding: "12px", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
                Preview Student Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
