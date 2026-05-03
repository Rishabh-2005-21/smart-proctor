const DASHBOARD_GUIDE_TRIGGER_KEY = "dashboardGuideAfterAuth";

const readTrigger = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_GUIDE_TRIGGER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const queueDashboardGuide = ({
  role,
  experienceLevel = "returning"
}) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    role: String(role || "").toLowerCase(),
    experienceLevel: experienceLevel === "new" ? "new" : "returning",
    createdAt: Date.now()
  };

  window.sessionStorage.setItem(
    DASHBOARD_GUIDE_TRIGGER_KEY,
    JSON.stringify(payload)
  );
};

export const consumeDashboardGuide = (expectedRole) => {
  if (typeof window === "undefined") {
    return null;
  }

  const payload = readTrigger();
  const normalizedRole = String(expectedRole || "").toLowerCase();

  if (!payload) {
    return null;
  }

  if (payload.role && normalizedRole && payload.role !== normalizedRole) {
    return null;
  }

  window.sessionStorage.removeItem(DASHBOARD_GUIDE_TRIGGER_KEY);
  return payload;
};

const buildStudentGuide = (context = {}) => {
  const {
    experienceLevel = "returning",
    userName = "there",
    currentGoal = "your placement goal",
    readinessScore = 0,
    readinessLabel = "",
    roadmapProgress = 0,
    latestTestTitle = ""
  } = context;

  const isNewUser = experienceLevel === "new";
  const readinessText = readinessLabel
    ? `${readinessScore}/100 (${readinessLabel})`
    : `${readinessScore}/100`;
  const latestAttemptText = latestTestTitle
    ? `Your latest tracked attempt is "${latestTestTitle}".`
    : "Your next test attempt will start populating the analytics cards here.";

  return {
    headline: isNewUser
      ? `Welcome ${userName}, here is your student dashboard guide`
      : `Welcome back ${userName}, here is your dashboard refresher`,
    intro: isNewUser
      ? "This dashboard is your main placement workspace. It combines readiness tracking, roadmap progress, focused practice, and AI coaching in one place."
      : "This is a quick tour of the key areas to check after you sign in so you can get back into prep quickly.",
    sections: [
      {
        title: "Readiness overview",
        body: `Start with the readiness cards, trends, and recent performance widgets. Your current readiness snapshot is ${readinessText}. ${latestAttemptText}`
      },
      {
        title: "Goal and roadmap",
        body: `Use Goal Setting, Career Roadmap, and Placement Planner to align the dashboard to ${currentGoal}. Your roadmap progress is currently ${roadmapProgress} percent, so this is the best place to decide what to work on next.`
      },
      {
        title: "Practice and analytics",
        body: "Move into Coding Challenges, Interview AI, targeted practice, and analytics whenever you want to turn weak areas into action. These sections help you practice, review mistakes, and improve the next readiness update."
      },
      {
        title: "AI mentor support",
        body: "Use the AI Mentor button whenever you want help understanding a score, choosing the next task, preparing for interviews, or replaying the guided tour."
      }
    ],
    nextActions: [
      "Review your readiness score and the latest feedback first.",
      "Update your goal if your target role or company focus changed.",
      "Pick one practice area and complete one focused session today."
    ]
  };
};

const buildTeacherGuide = (context = {}) => {
  const {
    experienceLevel = "returning",
    userName = "Admin",
    totalStudents = 0,
    totalSessions = 0,
    avgReadiness = 0,
    pendingApprovals = 0,
    liveAlerts = 0
  } = context;

  const isNewUser = experienceLevel === "new";

  return {
    headline: isNewUser
      ? `Welcome ${userName}, here is your admin dashboard guide`
      : `Welcome back ${userName}, here is your admin dashboard refresher`,
    intro: isNewUser
      ? "This dashboard is your control center for monitoring students, reviewing performance, and managing admin access."
      : "This is a quick walkthrough of the key admin areas so you can spot what matters immediately after login.",
    sections: [
      {
        title: "Overview dashboard",
        body: `Start on the Overview Dashboard tab. It summarizes ${totalStudents} students, ${totalSessions} sessions, and an average readiness of ${avgReadiness} percent so you can assess platform health at a glance.`
      },
      {
        title: "Live monitoring and trends",
        body: `Watch the live proctor alerts, session activity trend, topic accuracy, and leaderboard sections to identify risk, engagement, and top performers quickly. There are currently ${liveAlerts} live alert entries in this session.`
      },
      {
        title: "Approvals and user control",
        body: `Use the Approvals and Students areas to review new admin requests, inspect users, and remove accounts when needed. You currently have ${pendingApprovals} pending admin approval request${pendingApprovals === 1 ? "" : "s"}.`
      },
      {
        title: "Settings and student view",
        body: "Use Settings to preview the learner experience and switch to Student View when you need to verify what students see."
      }
    ],
    nextActions: [
      "Check live alerts and pending approvals first.",
      "Review topic accuracy and top performers to spot coaching needs.",
      "Open Student View when you want to validate the learner-side workflow."
    ]
  };
};

export const buildLocalDashboardGuide = (role, context = {}) =>
  String(role || "").toLowerCase() === "teacher"
    ? buildTeacherGuide(context)
    : buildStudentGuide(context);
