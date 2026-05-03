import express from "express";
import TestAttempt from "../models/TestAttempt.js";
import User from "../models/User.js";

const router = express.Router();
const toPercentScore = (attempt) => {
  if (!attempt?.totalQuestions) return 0;
  return Math.round(((attempt.score || 0) / attempt.totalQuestions) * 100);
};

// Student-level analytics summary
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }
    const decoded = decodeURIComponent(studentId);
    const normalized = decoded.trim().toLowerCase();
    const slugToName = decoded.replace(/-/g, " ");

    const attempts = await TestAttempt.find({
      $or: [
        { studentId: decoded },
        { studentId: normalized },
        { studentName: decoded },
        { studentName: slugToName }
      ]
    })
      .select("studentId studentName score totalQuestions placementReadinessScore topicStats difficultyStats createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const totalTests = attempts.length;
    const averageScore =
      totalTests === 0
        ? 0
        : Math.round(
            attempts.reduce((sum, a) => sum + toPercentScore(a), 0) / totalTests
          );
    const highestScore = attempts.reduce(
      (max, a) => Math.max(max, toPercentScore(a)),
      0
    );
    const latestReadiness =
      attempts[0]?.placementReadinessScore != null
        ? attempts[0].placementReadinessScore
        : null;

    const topicAggregate = new Map();
    const difficultyAggregate = new Map();

    attempts.forEach((a) => {
      (a.topicStats || []).forEach((t) => {
        if (!topicAggregate.has(t.topic)) {
          topicAggregate.set(t.topic, { topic: t.topic, attempted: 0, correct: 0 });
        }
        const acc = topicAggregate.get(t.topic);
        acc.attempted += t.attempted || 0;
        acc.correct += t.correct || 0;
      });

      (a.difficultyStats || []).forEach((d) => {
        if (!difficultyAggregate.has(d.difficulty)) {
          difficultyAggregate.set(d.difficulty, {
            difficulty: d.difficulty,
            attempted: 0,
            correct: 0
          });
        }
        const acc = difficultyAggregate.get(d.difficulty);
        acc.attempted += d.attempted || 0;
        acc.correct += d.correct || 0;
      });
    });

    const topicStats = Array.from(topicAggregate.values()).map((t) => ({
      ...t,
      accuracy:
        t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0
    }));
    const difficultyStats = Array.from(difficultyAggregate.values()).map(
      (d) => ({
        ...d,
        accuracy:
          d.attempted > 0 ? Math.round((d.correct / d.attempted) * 100) : 0
      })
    );

    const scoreHistory = attempts.map((a) => ({
      date: a.createdAt,
      score: toPercentScore(a),
      readiness: a.placementReadinessScore
    }));

    res.json({
      totalTests,
      averageScore,
      highestScore,
      latestReadiness,
      topicStats,
      difficultyStats,
      scoreHistory
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to compute analytics" });
  }
});

// Leaderboard and placement readiness gamification
router.get("/leaderboard", async (req, res) => {
  try {
    const attempts = await TestAttempt.find()
      .select("studentId studentName score totalQuestions placementReadinessScore createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const byStudent = new Map();

    attempts.forEach((a) => {
      if (!a.studentId) return;
      if (!byStudent.has(a.studentId)) {
        byStudent.set(a.studentId, {
          studentId: a.studentId,
          studentName: a.studentName,
          scores: [],
          readinessScores: []
        });
      }
      const entry = byStudent.get(a.studentId);
      entry.scores.push(toPercentScore(a));
      if (a.placementReadinessScore != null) {
        entry.readinessScores.push(a.placementReadinessScore);
      }
    });

    const leaderboard = Array.from(byStudent.values()).map((s) => {
      const avgScore =
        s.scores.length === 0
          ? 0
          : Math.round(
              s.scores.reduce((sum, v) => sum + v, 0) / s.scores.length
            );
      const bestScore = s.scores.reduce((max, v) => Math.max(max, v), 0);
      const latestReadiness =
        s.readinessScores.length > 0
          ? s.readinessScores[0]
          : null;
      const avgReadiness =
        s.readinessScores.length === 0
          ? 0
          : Math.round(
              s.readinessScores.reduce((sum, v) => sum + v, 0) /
                s.readinessScores.length
            );

      return {
        studentId: s.studentId,
        studentName: s.studentName,
        averageScore: avgScore,
        bestScore,
        averageReadiness: avgReadiness,
        latestReadiness
      };
    });

    const topByScore = [...leaderboard]
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 10);

    const topByReadiness = [...leaderboard]
      .sort((a, b) => b.averageReadiness - a.averageReadiness)
      .slice(0, 10);

    res.json({ topByScore, topByReadiness });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to load leaderboard" });
  }
});

// Admin-level dashboard summary (Global stats)
router.get("/admin/summary", async (req, res) => {
  try {
    const allAttempts = await TestAttempt.find()
      .select("studentId studentName score totalQuestions placementReadinessScore topicStats difficultyStats createdAt")
      .sort({ createdAt: 1 })
      .lean();
    const allUsers = await User.find({}, "name role careerGoal").lean();
    const totalAttempts = allAttempts.length;
    
    // Calculate global metrics
    const avgScore = totalAttempts === 0 ? 0 : Math.round(allAttempts.reduce((sum, a) => sum + toPercentScore(a), 0) / totalAttempts);
    const avgReadiness = totalAttempts === 0 ? 0 : Math.round(allAttempts.reduce((sum, a) => sum + (a.placementReadinessScore || 0), 0) / totalAttempts);
    const totalAwards = allAttempts.filter(a => toPercentScore(a) >= 80).length;
    
    // 1. Topic Accuracy (across all students)
    const topicMap = {};
    const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
    allAttempts.forEach(a => {
      (a.topicStats || []).forEach(ts => {
        if (!topicMap[ts.topic]) topicMap[ts.topic] = { attempted: 0, correct: 0 };
        topicMap[ts.topic].attempted += ts.attempted;
        topicMap[ts.topic].correct += ts.correct;
      });

      (a.difficultyStats || []).forEach((stat) => {
        if (difficultyBreakdown[stat.difficulty] != null) {
          difficultyBreakdown[stat.difficulty] += stat.attempted || 0;
        }
      });
    });
    const topicAccuracy = Object.keys(topicMap).map(topic => ({
      topic,
      accuracy: Math.round((topicMap[topic].correct / topicMap[topic].attempted) * 100) || 0
    })).sort((a,b) => b.accuracy - a.accuracy).slice(0, 6);

    // 2. Career Goal Distribution
    const goalMap = {};
    allUsers.forEach(u => {
      if (u.role === "student" && u.careerGoal) {
        goalMap[u.careerGoal] = (goalMap[u.careerGoal] || 0) + 1;
      }
    });
    const goalDistribution = Object.keys(goalMap).map(goal => ({
      name: goal,
      value: goalMap[goal]
    })).sort((a,b) => b.value - a.value).slice(0, 5);

    // 3. Top Performers (Leaderboard snippet)
    const studentStats = {};
    allAttempts.forEach(a => {
      if (!a.studentId) return;
      if (!studentStats[a.studentId]) studentStats[a.studentId] = { name: a.studentName, totalScore: 0, count: 0 };
      studentStats[a.studentId].totalScore += toPercentScore(a);
      studentStats[a.studentId].count += 1;
    });
    const topPerformers = Object.values(studentStats).map(s => ({
      name: s.name,
      avg: Math.round(s.totalScore / s.count)
    })).sort((a,b) => b.avg - a.avg).slice(0, 5);

    // 4. 7-day Attendance Trend
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      last7Days.push({
        day: dateStr,
        fullDate: d.toDateString(),
        present: 0,
        absent: 0,
        late: 0
      });
    }

    allAttempts.forEach(a => {
      const attemptDate = new Date(a.createdAt).toDateString();
      const dayBucket = last7Days.find(d => d.fullDate === attemptDate);
      if (dayBucket) {
        dayBucket.present += 1;
        dayBucket.late += (toPercentScore(a) < 40 ? 1 : 0); // Logic: Low scores count as "struggling/late" interaction
      }
    });

    res.json({
      totalAttempts,
      avgReadiness,
      avgScore,
      totalAwards,
      topicAccuracy,
      difficultyBreakdown,
      goalDistribution,
      topPerformers,
      attendanceTrend: last7Days.map(({ day, present, absent, late }) => ({ day, present, absent, late }))
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to aggregate admin analytics" });
  }
});

export default router;

