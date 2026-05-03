import express from "express";
import PlacementProfile from "../models/PlacementProfile.js";
import TestAttempt from "../models/TestAttempt.js";
import StudentProgress from "../models/StudentProgress.js";

const router = express.Router();

const COMPANY_BLUEPRINTS = {
  Amazon: {
    rounds: ["Aptitude", "DSA", "Behavioral", "Leadership Principles"],
    focusAreas: ["DSA patterns", "Problem solving under time pressure", "Project clarity"],
    recommendedTests: ["company-amazon", "technical-general", "placement-soft-skills"]
  },
  Google: {
    rounds: ["Coding", "Algorithms", "Core CS", "Behavioral"],
    focusAreas: ["Algorithms", "Data structures", "Communication clarity"],
    recommendedTests: ["company-google", "technical-general", "core-os-dbms"]
  },
  "TCS NQT": {
    rounds: ["Aptitude", "Verbal", "Coding", "Interview"],
    focusAreas: ["Quantitative aptitude", "Verbal ability", "Coding basics"],
    recommendedTests: ["company-tcs-nqt", "aptitude-general", "technical-general"]
  },
  Infosys: {
    rounds: ["Aptitude", "Technical", "HR"],
    focusAreas: ["Reasoning", "OOP basics", "HR readiness"],
    recommendedTests: ["aptitude-general", "technical-general", "placement-soft-skills"]
  },
  Wipro: {
    rounds: ["Aptitude", "Technical", "Communication"],
    focusAreas: ["Verbal ability", "Core CS", "Structured answers"],
    recommendedTests: ["aptitude-general", "technical-general", "placement-soft-skills"]
  },
  "Capgemini": {
    rounds: ["Aptitude", "Pseudo code", "Technical interview"],
    focusAreas: ["Pseudo code logic", "Aptitude", "Communication"],
    recommendedTests: ["advanced-aptitude", "technical-general", "placement-soft-skills"]
  }
};

const FALLBACK_COMPANY = {
  rounds: ["Aptitude", "Technical", "HR interview"],
  focusAreas: ["Aptitude speed", "Core technical answers", "Interview confidence"],
  recommendedTests: ["aptitude-general", "technical-general", "placement-soft-skills"]
};

const normalizeStudentId = (value) => decodeURIComponent(String(value || "").trim());

const toPercentScore = (attempt) => {
  if (!attempt?.totalQuestions) return 0;
  return Math.round(((attempt.score || 0) / attempt.totalQuestions) * 100);
};

const mean = (values = []) => {
  const safeValues = values.filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (!safeValues.length) return 0;
  return Math.round(safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length);
};

const scoreToStatus = (score) => {
  if (score >= 75) return "strong";
  if (score >= 50) return "improving";
  return "at-risk";
};

const deriveCompanyPlans = (targetCompanies = []) => {
  const companies = targetCompanies.length ? targetCompanies : ["General Placement"];

  return companies.map((company) => {
    const blueprint = COMPANY_BLUEPRINTS[company] || FALLBACK_COMPANY;

    return {
      company,
      rounds: blueprint.rounds,
      focusAreas: blueprint.focusAreas,
      recommendedTests: blueprint.recommendedTests
    };
  });
};

const buildTopicMastery = (attempts = [], progressEntries = []) => {
  const topicMap = new Map();

  attempts.forEach((attempt) => {
    (attempt.topicStats || []).forEach((topic) => {
      if (!topicMap.has(topic.topic)) {
        topicMap.set(topic.topic, []);
      }

      const accuracy = topic.attempted
        ? Math.round((topic.correct / topic.attempted) * 100)
        : 0;

      topicMap.get(topic.topic).push(accuracy);
    });
  });

  progressEntries.forEach((entry) => {
    (entry.skillScores || []).forEach((skill) => {
      if (!topicMap.has(skill.name)) {
        topicMap.set(skill.name, []);
      }

      topicMap.get(skill.name).push(skill.score || 0);
    });
  });

  return Array.from(topicMap.entries())
    .map(([topic, scores]) => {
      const score = mean(scores);

      return {
        topic,
        score,
        status: scoreToStatus(score)
      };
    })
    .sort((a, b) => b.score - a.score);
};

const buildReadinessBreakdown = (attempts = [], progressEntries = []) => {
  const latestAttempt = attempts[0];
  const technical = latestAttempt?.topicStats?.length
    ? mean(
        latestAttempt.topicStats.map((topic) =>
          topic.attempted ? Math.round((topic.correct / topic.attempted) * 100) : 0
        )
      )
    : mean(attempts.map(toPercentScore));

  const aptitude = mean(
    progressEntries
      .filter((entry) => ["aptitude", "company_mock"].includes(entry.testType))
      .map((entry) => entry.overallScore || 0)
  ) || mean(attempts.map(toPercentScore));

  const interview = mean(
    progressEntries
      .filter((entry) => ["behavioral", "technical", "Focus Quiz"].includes(entry.testType))
      .map((entry) => entry.overallScore || 0)
  ) || Math.max(0, technical - 5);

  const recentAttemptCount = attempts.filter((attempt) => {
    const createdAt = new Date(attempt.createdAt).getTime();
    return Date.now() - createdAt <= 14 * 24 * 60 * 60 * 1000;
  }).length;
  const consistency = Math.min(100, recentAttemptCount * 20);

  const overall = mean([
    latestAttempt?.placementReadinessScore || 0,
    aptitude,
    technical,
    interview,
    consistency
  ]);

  return {
    overall,
    categories: [
      { label: "Aptitude", score: aptitude },
      { label: "Technical", score: technical },
      { label: "Interview", score: interview },
      { label: "Consistency", score: consistency }
    ]
  };
};

const buildConsistencyInsights = (attempts = [], progressEntries = []) => {
  const timestamps = [
    ...attempts.map((attempt) => attempt.createdAt),
    ...progressEntries.map((entry) => entry.attemptedAt)
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  const uniqueDays = Array.from(
    new Set(
      timestamps.map((date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      )
    )
  ).sort((a, b) => b - a);

  let streakDays = 0;
  let cursor = new Date();
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());

  for (const dayTime of uniqueDays) {
    const day = new Date(dayTime);
    const diffDays = Math.round((cursor.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      streakDays += 1;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    } else if (diffDays === 1 && streakDays === 0) {
      streakDays += 1;
      cursor = new Date(day.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return {
    streakDays,
    sessionsLast7Days: uniqueDays.filter(
      (dayTime) => Date.now() - dayTime <= 7 * 24 * 60 * 60 * 1000
    ).length
  };
};

const buildMilestones = (profile, readiness, topicMastery) => {
  const weakest = topicMastery.find((topic) => topic.status === "at-risk");

  return [
    {
      title: "Reach readiness 70+",
      status: readiness.overall >= 70 ? "completed" : "in-progress",
      detail:
        readiness.overall >= 70
          ? "You have crossed the 70+ readiness mark."
          : `Current readiness is ${readiness.overall}/100.`
    },
    {
      title: "Remove one at-risk topic",
      status: weakest ? "in-progress" : "completed",
      detail: weakest
        ? `Current focus topic: ${weakest.topic}.`
        : "No topic is currently marked at risk."
    },
    {
      title: `Hold the plan for ${profile.timelineWeeks || 8} weeks`,
      status: "planned",
      detail: `Daily study target is ${profile.dailyMinutes || 90} minutes.`
    }
  ];
};

const buildDailyPlan = ({
  profile,
  readiness,
  topicMastery,
  companyPlans
}) => {
  const weakestTopic = topicMastery.find((topic) => topic.status === "at-risk") || topicMastery[topicMastery.length - 1];
  const improvingTopic = topicMastery.find((topic) => topic.status === "improving");
  const companyPlan = companyPlans[0];

  return [
    {
      title: weakestTopic
        ? `Recover ${weakestTopic.topic}`
        : "Take one mixed practice test",
      duration: `${Math.max(30, Math.round((profile.dailyMinutes || 90) * 0.4))} min`,
      detail: weakestTopic
        ? `Your current mastery is ${weakestTopic.score}%. Run a focused drill and review every mistake.`
        : "Start with a timed mixed quiz to create a fresh baseline."
    },
    {
      title: companyPlan
        ? `Prepare for ${companyPlan.company}`
        : "Company-specific round practice",
      duration: `${Math.max(20, Math.round((profile.dailyMinutes || 90) * 0.3))} min`,
      detail: companyPlan
        ? `Focus today on ${companyPlan.focusAreas.slice(0, 2).join(" and ")}.`
        : "Practice one company-style aptitude or technical round."
    },
    {
      title: readiness.overall < 70 ? "Boost interview readiness" : "Refine strong answers",
      duration: `${Math.max(15, Math.round((profile.dailyMinutes || 90) * 0.3))} min`,
      detail: improvingTopic
        ? `Explain ${improvingTopic.topic} out loud and then do one interview-style response practice.`
        : "Practice one HR answer and one project explanation today."
    }
  ];
};

router.get("/student/:studentId", async (req, res) => {
  try {
    const studentId = normalizeStudentId(req.params.studentId);
    const profile = await PlacementProfile.findOne({ studentId }).lean();

    res.json({
      profile: profile || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load placement profile" });
  }
});

router.put("/student/:studentId", async (req, res) => {
  try {
    const studentId = normalizeStudentId(req.params.studentId);

    const payload = {
      studentId,
      studentName: req.body?.studentName || "",
      studentEmail: req.body?.studentEmail || "",
      targetRole: String(req.body?.targetRole || "").trim(),
      targetCompanies: Array.isArray(req.body?.targetCompanies)
        ? req.body.targetCompanies.map((company) => String(company).trim()).filter(Boolean)
        : [],
      timelineWeeks: Number(req.body?.timelineWeeks) || 8,
      branch: String(req.body?.branch || "").trim(),
      graduationYear: String(req.body?.graduationYear || "").trim(),
      targetPackage: String(req.body?.targetPackage || "").trim(),
      dailyMinutes: Number(req.body?.dailyMinutes) || 90,
      resumeSummary: String(req.body?.resumeSummary || "").trim(),
      strongestAreas: Array.isArray(req.body?.strongestAreas)
        ? req.body.strongestAreas.map((item) => String(item).trim()).filter(Boolean)
        : [],
      weakestAreas: Array.isArray(req.body?.weakestAreas)
        ? req.body.weakestAreas.map((item) => String(item).trim()).filter(Boolean)
        : [],
      notes: String(req.body?.notes || "").trim()
    };

    const profile = await PlacementProfile.findOneAndUpdate(
      { studentId },
      payload,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to save placement profile" });
  }
});

router.get("/dashboard/:studentId", async (req, res) => {
  try {
    const studentId = normalizeStudentId(req.params.studentId);

    const [profile, attempts, progressEntries] = await Promise.all([
      PlacementProfile.findOne({ studentId }).lean(),
      TestAttempt.find({ studentId })
        .select("studentId studentName testTitle score totalQuestions placementReadinessScore topicStats difficultyStats aiFeedback createdAt")
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      StudentProgress.find({ studentId })
        .select("testType companyOrCategory overallScore skillScores strengths weaknesses attemptedAt")
        .sort({ attemptedAt: -1 })
        .limit(20)
        .lean()
    ]);

    const safeProfile =
      profile || {
        studentId,
        targetRole: "",
        targetCompanies: [],
        timelineWeeks: 8,
        dailyMinutes: 90,
        strongestAreas: [],
        weakestAreas: []
      };

    const companyPlans = deriveCompanyPlans(safeProfile.targetCompanies);
    const topicMastery = buildTopicMastery(attempts, progressEntries);
    const readiness = buildReadinessBreakdown(attempts, progressEntries);
    const consistency = buildConsistencyInsights(attempts, progressEntries);
    const milestones = buildMilestones(safeProfile, readiness, topicMastery);
    const dailyPlan = buildDailyPlan({
      profile: safeProfile,
      readiness,
      topicMastery,
      companyPlans
    });

    const latestAttempt = attempts[0] || null;

    res.json({
      profile: safeProfile,
      readiness,
      consistency,
      milestones,
      topicMastery,
      dailyPlan,
      companyPlans,
      latestAttempt,
      recentProgress: progressEntries.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load planner dashboard" });
  }
});

export default router;
