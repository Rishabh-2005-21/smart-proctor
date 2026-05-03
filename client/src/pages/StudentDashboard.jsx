import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, BookOpen, TrendingUp, History, User, 
  Target, Award, Calendar, ChevronRight, Activity, Zap, CheckCircle,
  PlayCircle, Clock
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { api, getErrorMessage } from "../services/api";
import { apiUrl } from "../config/api";
import { getStoredUser } from "../services/authService";
import DashboardGuideModal from "../components/common/DashboardGuideModal";
import {
  getBookmarks,
  getLastActivity,
  getReminderSettings,
  isReminderDue,
  saveLastActivity
} from "../services/studentWorkspace";
import {
  buildLocalDashboardGuide,
  consumeDashboardGuide
} from "../utils/dashboardGuide";
import "./StudentDashboard.css";

const parseStudentId = (user) => {
  if (!user) return "";
  const directId = user.id || user._id || user.studentId;
  if (directId) return String(directId);
  return user?.name ? user.name.replace(/\s+/g, "-").toLowerCase() : "";
};

const formatDateLabel = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', className: 'tour-dashboard' },
  { label: 'My Exams', icon: CheckCircle, path: '/interview-prep', className: 'tour-exams' },
  { label: 'Coding Arena', icon: Zap, path: '/coding-challenges', className: 'tour-coding' },
  { label: 'Results & Reports', icon: TrendingUp, path: '/student-analytics', className: 'tour-analytics' },
  { label: 'Activity Logs', icon: History, path: '/student-roadmap', className: 'tour-activity' },
  { label: 'Profile Actions', icon: User, path: '/placement-planner', className: 'tour-profile' }
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser() || {}, []);
  const studentId = parseStudentId(user);

  const [plannerDashboard, setPlannerDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [reminders, setReminders] = useState(() => getReminderSettings());
  const [lastActivity, setLastActivity] = useState(() => getLastActivity());
  const [activityStats, setActivityStats] = useState({ totalTests: 0, averageScore: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [dashboardGuide, setDashboardGuide] = useState(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideLoading, setIsGuideLoading] = useState(false);
  const [guideTrigger] = useState(() => consumeDashboardGuide("student"));
  const [hasRequestedGuide, setHasRequestedGuide] = useState(false);

  const syncWorkspaceState = () => {
    setBookmarks(getBookmarks());
    setReminders(getReminderSettings());
    setLastActivity(getLastActivity());
  };

  useEffect(() => {
    syncWorkspaceState();
    window.addEventListener("storage", syncWorkspaceState);
    window.addEventListener("student-workspace:updated", syncWorkspaceState);
    return () => {
      window.removeEventListener("storage", syncWorkspaceState);
      window.removeEventListener("student-workspace:updated", syncWorkspaceState);
    };
  }, []);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const [plannerResponse, analyticsResponse, historyResponse, progressResponse] =
          await Promise.all([
            api.get(apiUrl(`/planner/dashboard/${encodeURIComponent(studentId)}`)),
            api.get(apiUrl(`/analytics/student/${encodeURIComponent(studentId)}`)),
            api.get(apiUrl(`/tests/history/${encodeURIComponent(studentId)}`)).catch(() => ({ data: [] })),
            api.get(apiUrl(`/progress/student/${encodeURIComponent(studentId)}`)).catch(() => ({ data: [] }))
          ]);

        if (!active) return;
        setPlannerDashboard(plannerResponse.data || null);
        setAnalytics(analyticsResponse.data || null);

        const historyItems = (historyResponse.data || []).slice(0, 4).map((attempt) => ({
          id: attempt._id || `${attempt.testTitle}-${attempt.createdAt}`,
          title: attempt.testTitle || "Practice test",
          detail: attempt.totalQuestions > 0 ? `${Math.round(((attempt.score || 0) / attempt.totalQuestions) * 100)}% score` : "Completed",
          date: attempt.createdAt,
          source: "tests",
          path: "/student-analytics"
        }));

        const progressItems = (progressResponse.data || []).slice(0, 4).map((entry) => ({
          id: entry._id || `${entry.companyOrCategory}-${entry.attemptedAt}`,
          title: entry.companyOrCategory || "Practice session",
          detail: `${entry.overallScore || 0}% in ${entry.testType || "practice"}`,
          date: entry.attemptedAt,
          source: "progress",
          path: "/interview-prep"
        }));

        setRecentItems(
          [...historyItems, ...progressItems]
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
            .slice(0, 6)
        );

        const historyScores = (historyResponse.data || [])
          .map(a => a?.totalQuestions > 0 ? Math.round(((a.score || 0) / a.totalQuestions) * 100) : null)
          .filter(v => v != null);
        const progressScores = (progressResponse.data || []).map(e => Number(e?.overallScore)).filter(v => Number.isFinite(v));
        const mergedScores = [...historyScores, ...progressScores];
        const mergedCount = Math.max((historyResponse.data || []).length, (progressResponse.data || []).length, mergedScores.length);
        const mergedAvg = mergedScores.length > 0 ? Math.round(mergedScores.reduce((s, v) => s + v, 0) / mergedScores.length) : 0;
        setActivityStats({ totalTests: mergedCount, averageScore: mergedAvg });

      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, "Failed to load dashboard."));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => { active = false; };
  }, [studentId]);

  const requestDashboardGuide = useCallback(async ({ forceRefresh = false } = {}) => {
    if (isGuideLoading) return;
    if (!forceRefresh && dashboardGuide) {
      setIsGuideOpen(true);
      return;
    }
    const context = {
      experienceLevel: guideTrigger?.experienceLevel || "returning",
      userName: user?.name || "Student",
      currentGoal: plannerDashboard?.profile?.targetRole || "General placement",
      readinessScore: plannerDashboard?.readiness?.overall || analytics?.latestReadiness || 0,
      roadmapProgress: plannerDashboard?.milestones?.length ? Math.round((plannerDashboard.milestones.filter(m => m.status === "completed").length / plannerDashboard.milestones.length) * 100) : 0,
      latestTestTitle: recentItems.find(i => i.source === "tests")?.title || "",
      weakestTopic: plannerDashboard?.topicMastery?.find(t => t.status === "at-risk")?.topic || "",
      nextAction: plannerDashboard?.dailyPlan?.[0]?.title || ""
    };
    setIsGuideOpen(true);
    setIsGuideLoading(true);
    try {
      const response = await api.post(apiUrl("/ai/dashboard-guide"), { role: "student", context });
      setDashboardGuide(response.data || buildLocalDashboardGuide("student", context));
    } catch {
      setDashboardGuide(buildLocalDashboardGuide("student", context));
    } finally {
      setIsGuideLoading(false);
    }
  }, [dashboardGuide, guideTrigger, isGuideLoading, plannerDashboard, analytics, recentItems, user]);

  useEffect(() => {
    if (!guideTrigger || hasRequestedGuide || loading) return;
    setHasRequestedGuide(true);
    requestDashboardGuide();
  }, [guideTrigger, hasRequestedGuide, loading, requestDashboardGuide]);

  useEffect(() => {
    const handleExternalGuideTrigger = () => requestDashboardGuide({ forceRefresh: true });
    window.addEventListener("open-ai-guide", handleExternalGuideTrigger);
    return () => window.removeEventListener("open-ai-guide", handleExternalGuideTrigger);
  }, [requestDashboardGuide]);

  const openPath = (path, title, detail) => {
    saveLastActivity({ title, path, detail, section: "dashboard" });
    navigate(path);
  };

  const readinessScore = plannerDashboard?.readiness?.overall || analytics?.latestReadiness || 0;
  const currentGoal = plannerDashboard?.profile?.targetRole || plannerDashboard?.profile?.primaryGoal || "Target Placement";
  const roadmapProgress = plannerDashboard?.milestones?.length ? Math.round((plannerDashboard.milestones.filter(i => i.status === "completed").length / plannerDashboard.milestones.length) * 100) : 0;
  const displayTotalTests = Math.max(analytics?.totalTests || 0, activityStats.totalTests || 0);
  const displayAverageScore = Math.max(analytics?.averageScore || 0, activityStats.averageScore || 0);
  const pendingExams = plannerDashboard?.dailyPlan?.length || 0;
  
  const chartData = (analytics?.scoreHistory || [])
    .slice()
    .reverse()
    .slice(-7)
    .map((pt) => {
      const parsed = new Date(pt?.date);
      const safeScore = Number(pt?.score);
      return {
        date: Number.isNaN(parsed.getTime())
          ? "Recent"
          : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Number.isFinite(safeScore) ? safeScore : 0
      };
    });
  const visibleChartData =
    chartData.length === 1
      ? [
          {
            date: "Start",
            score: chartData[0].score
          },
          chartData[0]
        ]
      : chartData;

  if (loading) {
    return <div className="sd-main"><h2>Loading dashboard...</h2></div>;
  }

  return (
    <div className="student-main-dashboard">
      <DashboardGuideModal
        isOpen={isGuideOpen}
        loading={isGuideLoading}
        guide={dashboardGuide}
        onClose={() => setIsGuideOpen(false)}
        onRefresh={() => requestDashboardGuide({ forceRefresh: true })}
        accent="#0f766e"
      />



      <main className="sd-main">
        <div className="sd-header">
          <div>
            <h1 className="sd-greeting">Welcome back, {user?.name?.split(' ')[0] || 'Student'}!</h1>
            <p className="sd-subtitle">Here is what's happening with your exam readiness today.</p>
          </div>
          <div className="sd-header-actions">
            <button className="sd-btn-primary" style={{background: '#1e293b'}} onClick={() => openPath('/interview-prep', 'Practice exams', '')}>
              <PlayCircle size={18} /> Start Attempt
            </button>
          </div>
        </div>

        {error && <div style={{padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '24px'}}>{error}</div>}
        {isReminderDue(reminders) && (
          <div style={{padding: '16px', background: '#fef3c7', color: '#b45309', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between'}}>
            <span><strong>Reminder Due:</strong> {reminders.label}</span>
            <button onClick={() => openPath("/revision-center", "Revision", "")} style={{background: 'none', border: 'none', color: '#b45309', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline'}}>Open Revision</button>
          </div>
        )}

        <div className="sd-kpi-grid tour-kpis">
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-wrapper" style={{background: 'rgba(37,99,235,0.1)', color: '#2563eb'}}><CheckCircle size={24} /></div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-label">Total Exams</div>
              <div className="sd-kpi-value">{displayTotalTests}</div>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-wrapper" style={{background: 'rgba(15,118,110,0.1)', color: '#0f766e'}}><Target size={24} /></div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-label">Average Score</div>
              <div className="sd-kpi-value">{displayAverageScore}%</div>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-wrapper" style={{background: 'rgba(234,179,8,0.1)', color: '#ca8a04'}}><Clock size={24} /></div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-label">Pending Reviews</div>
              <div className="sd-kpi-value">{pendingExams}</div>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon-wrapper" style={{background: 'rgba(139,92,246,0.1)', color: '#7c3aed'}}><Activity size={24} /></div>
            <div className="sd-kpi-info">
              <div className="sd-kpi-label">Readiness Index</div>
              <div className="sd-kpi-value">{readinessScore}</div>
            </div>
          </div>
        </div>

        <div className="sd-dashboard-grid">
          <div className="sd-chart-column tour-progress">
            <div className="sd-panel">
              <div className="sd-panel-header">
                <h3 className="sd-panel-title"><TrendingUp size={20} color="#0f766e" /> Performance Trends</h3>
              </div>
              <div className="sd-chart-container">
                {visibleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.3)" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="score" stroke="#0f766e" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" dot={{ r: 3, fill: "#0f766e" }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'}}>
                    No trend data available. Complete an exam to see your progress chart!
                  </div>
                )}
              </div>
            </div>

            <div className="sd-panel">
              <div className="sd-panel-header">
                <h3 className="sd-panel-title"><Award size={20} color="#0f766e" /> Current Completion</h3>
              </div>
              <div>
                <div className="sd-progress-item">
                  <div className="sd-progress-header"><span>Roadmap Completion</span> <span>{roadmapProgress}%</span></div>
                  <div className="sd-progress-bar-bg"><div className="sd-progress-bar-fill" style={{width: `${roadmapProgress}%`}}></div></div>
                </div>
                <div className="sd-progress-item">
                  <div className="sd-progress-header"><span>Readiness Score</span> <span>{readinessScore} / 100</span></div>
                  <div className="sd-progress-bar-bg"><div className="sd-progress-bar-fill" style={{width: `${Math.min(readinessScore, 100)}%`, background: 'linear-gradient(90deg, #38bdf8, #86efac)'}}></div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="sd-activity-column">
            <div className="sd-panel" style={{height: '100%', marginBottom: 0}}>
              <div className="sd-panel-header">
                <h3 className="sd-panel-title"><History size={20} color="#0f766e" /> Recent Activity</h3>
              </div>
              <div className="sd-activity-list tour-activity">
                {lastActivity?.title && (
                  <div className="sd-activity-item" style={{background: 'rgba(15,118,110,0.06)', border: '1px solid rgba(15,118,110,0.2)'}} onClick={() => openPath(lastActivity.path, lastActivity.title, lastActivity.detail)}>
                    <div className="sd-activity-icon" style={{color: '#0f766e'}}><PlayCircle size={18} /></div>
                    <div className="sd-activity-content">
                      <div className="sd-activity-title">Continue where you left off</div>
                      <div className="sd-activity-desc">{lastActivity.title}</div>
                    </div>
                    <ChevronRight size={16} color="#0f766e" />
                  </div>
                )}
                
                {recentItems.length > 0 ? recentItems.map((item) => (
                  <div key={item.id} className="sd-activity-item" onClick={() => openPath(item.path, item.title, item.detail)}>
                    <div className="sd-activity-icon"><CheckCircle size={16} /></div>
                    <div className="sd-activity-content">
                      <div className="sd-activity-title">{item.title}</div>
                      <div className="sd-activity-desc">{item.detail}</div>
                    </div>
                    <div className="sd-activity-meta">{formatDateLabel(item.date)}</div>
                  </div>
                )) : (
                  <div style={{color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0'}}>
                    No recent activity to show.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
