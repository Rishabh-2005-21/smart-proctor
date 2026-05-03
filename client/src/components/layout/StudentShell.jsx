import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getLastActivity } from "../../services/studentWorkspace";
import HelpChatbot from "../common/HelpChatbot";

import { 
  LayoutDashboard, BookOpen, TrendingUp, History, User, 
  Target, Award, Calendar, ChevronRight, Activity, Zap, CheckCircle,
  MessageSquare, Compass, LogOut, PlayCircle, HelpCircle
} from "lucide-react";

import "./StudentShell.css";
import "../common/HelpChatbot.css";

const studentNavItems = [
  {
    to: "/student-dashboard",
    label: "Overview",
    subtitle: "Main dashboard",
    icon: LayoutDashboard,
    className: "tour-dashboard"
  },
  {
    to: "/interview-prep",
    label: "Practice",
    subtitle: "Tests and focus quizzes",
    icon: CheckCircle,
    className: "tour-exams"
  },
  {
    to: "/coding-challenges",
    label: "Coding Arena",
    subtitle: "Runnable challenge arena",
    icon: Zap,
    className: "tour-coding"
  },
  {
    to: "/student-analytics",
    label: "Results & Reports",
    subtitle: "Scores and insights",
    icon: TrendingUp,
    className: "tour-analytics"
  },
  {
    to: "/student-roadmap",
    label: "Activity Logs",
    subtitle: "Milestones and path",
    icon: History,
    className: "tour-activity"
  },
  {
    to: "/placement-planner",
    label: "Profile Actions",
    subtitle: "Targets and companies",
    icon: User,
    className: "tour-profile"
  }
];

const extraNavItems = [
  {
    to: "/interview-chat",
    label: "Interview AI",
    subtitle: "Mock interview coach",
    icon: MessageSquare
  },
  {
    to: "/revision-center",
    label: "Revision Center",
    subtitle: "Flashcards and reminders",
    icon: BookOpen
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    subtitle: "Compare momentum",
    icon: Award
  }
];

function getRoadmapProfile() {
  try {
    return JSON.parse(window.localStorage.getItem("studentRoadmapProfile")) || null;
  } catch {
    return null;
  }
}

function getPlannerProfile() {
  try {
    return JSON.parse(window.localStorage.getItem("placementPlannerProfile")) || null;
  } catch {
    return null;
  }
}

export default function StudentShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(() => getRoadmapProfile());
  const [plannerProfile, setPlannerProfile] = useState(() => getPlannerProfile());
  const [lastActivity, setLastActivity] = useState(() => getLastActivity());
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const syncProfile = () => {
      setProfile(getRoadmapProfile());
      setPlannerProfile(getPlannerProfile());
      setLastActivity(getLastActivity());
    };

    window.addEventListener("storage", syncProfile);
    window.addEventListener("roadmap:updated", syncProfile);
    window.addEventListener("planner:updated", syncProfile);
    window.addEventListener("student-workspace:updated", syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("roadmap:updated", syncProfile);
      window.removeEventListener("planner:updated", syncProfile);
      window.removeEventListener("student-workspace:updated", syncProfile);
    };
  }, []);

  const activeGoal =
    profile?.primaryGoal ||
    plannerProfile?.targetRole ||
    window.localStorage.getItem("studentGoal") ||
    "General Placement";

  const activePage = useMemo(() => {
    const allItems = [...studentNavItems, ...extraNavItems];
    return (
      allItems.find((item) => location.pathname.startsWith(item.to)) ||
      studentNavItems[0]
    );
  }, [location.pathname]);


  const userInitials = (user?.name || "Student")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="student-shell-app">
      {/* NEW SIDEBAR IMPLEMENTATION MERGED FROM DASHBOARD */}
      <aside className="sd-sidebar">
        <div className="sd-brand">
          <div className="sd-avatar" style={{width: '32px', height: '32px', fontSize: '0.9rem'}}><Target size={18} /></div>
          SmartProctor
        </div>
        
        <div className="sd-nav">
          <div className="sd-nav-title">Menu Overview</div>
          {studentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to) || (item.to === '/student-dashboard' && location.pathname === '/');
            return (
              <button
                key={item.to}
                className={`sd-nav-item ${isActive ? 'active' : ''} ${item.className || ''}`}
                onClick={() => navigate(item.to)}
              >
                <Icon className="sd-nav-icon" />
                {item.label}
              </button>
            );
          })}
          
          <div className="sd-nav-title" style={{marginTop: '24px'}}>Extras</div>
          {extraNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                className={`sd-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.to)}
              >
                <Icon className="sd-nav-icon" />
                {item.label}
              </button>
            );
          })}
        </div>
        
        <div className="sd-sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {lastActivity?.path && (
            <button
               className="sd-nav-item" 
               style={{background: 'rgba(15,118,110,0.1)', color: '#0f766e', fontWeight: 'bold'}}
               onClick={() => navigate(lastActivity.path)}
            >
              <PlayCircle className="sd-nav-icon" style={{color: '#0f766e'}} />
              Continue Act...
            </button>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sd-user-profile">
              <div className="sd-avatar" style={{fontSize: '0.9rem'}}>{userInitials}</div>
              <div className="sd-user-info">
                <span className="sd-user-name" style={{maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{user?.name || 'Student'}</span>
                <span className="sd-user-role" style={{maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{activeGoal}</span>
              </div>
            </div>
            <button onClick={handleLogout} style={{background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px'}} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* TOPBAR + CONTENT */}
      <div className="student-shell-app__main">
        <header className="student-shell-app__topbar">
          <div>
            <div className="student-shell-app__topbar-eyebrow">Workspace</div>
            <h1 className="student-shell-app__topbar-title">{activePage.label}</h1>
            <p className="student-shell-app__topbar-copy">
              {activePage.subtitle}
            </p>
          </div>
          <div className="student-shell-app__topbar-right">
            
            <button
              type="button"
              className="student-shell-app__topbar-help sd-guide-trigger"
              onClick={() => window.dispatchEvent(new Event("open-ai-guide"))}
              title="Open AI Guide"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Zap size={18} /> Guide
            </button>

            <button
              type="button"
              className="student-shell-app__topbar-help"
              onClick={() => setIsHelpOpen(true)}
              title="Ask Chatbot"
            >
              <HelpCircle size={18} style={{marginRight: '6px'}} /> Help
            </button>
            <div className="student-shell-app__topbar-avatar" title={user?.name || "Student"}>
              {userInitials}
            </div>
          </div>
        </header>

        <main className="student-shell-app__content">
          <Outlet />
        </main>
      </div>

      <HelpChatbot
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        user={user}
        activePageLabel={activePage.label}
      />
    </div>
  );
}
