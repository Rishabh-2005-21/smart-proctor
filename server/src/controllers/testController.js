import Test from "../models/Test.js";
import TestAttempt from "../models/TestAttempt.js";
import {
  generateMcqQuestions,
  generatePerformanceFeedback,
  generateLearningRoadmap,
  callAIChat
} from "../services/aiService.js";

const safeGenerateFeedbackAndRoadmap = async ({
  score,
  totalQuestions,
  accuracy,
  topicStats,
  difficultyStats,
  violations
}) => {
  let aiFeedback = {
    strengths: ["Consistent effort"],
    weaknesses: ["Needs more targeted practice"],
    improvementSuggestions: [
      "Revise weak topics and take focused quizzes daily"
    ],
    confidenceScore: Math.round((accuracy || 0) * 100)
  };
  let aiRoadmap = {
    oneWeekPlan: ["Day 1-2: Fundamentals", "Day 3-7: Timed mixed practice"],
    twoWeekPlan: ["Week 1: Core topics", "Week 2: Advanced mock tests"],
    dailyRecommendations: ["Solve 20 MCQs", "Review mistakes", "Retest weak areas"]
  };

  try {
    aiFeedback = await generatePerformanceFeedback({
      score,
      totalQuestions,
      accuracy,
      topicStats,
      difficultyStats,
      violations: violations || 0
    });
  } catch (e) {
    console.warn("AI feedback generation failed, using fallback:", e.message);
  }

  try {
    aiRoadmap = await generateLearningRoadmap({
      score,
      totalQuestions,
      topicStats,
      difficultyStats,
      historySummary: ""
    });
  } catch (e) {
    console.warn("AI roadmap generation failed, using fallback:", e.message);
  }

  return { aiFeedback, aiRoadmap };
};

// =============================
// 💬 AI Student Chat/Mentor
// =============================
export const studentChat = async (req, res) => {
  try {
    const { messages, context } = req.body || {};
    const response = await callAIChat(messages || [], context || {});
    res.json({ response });
  } catch (error) {
    console.error("studentChat error", error);
    res.status(500).json({ message: "Failed to reach AI mentor" });
  }
};

export const createTest = async (req, res) => {
  try {
    const {
      title,
      assignedTo,
      startTime,
      endTime,
      durationSeconds,
      rules
    } = req.body;

    const questions = Array.isArray(req.body.questions)
      ? req.body.questions
      : [];

    const test = await Test.create({
      title,
      assignedTo,
      startTime,
      endTime,
      durationSeconds,
      rules,
      questions
    });

    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 }).lean();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTestById = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =============================
// 🎯 GenAI Question Generation
// =============================
export const generateQuestions = async (req, res) => {
  try {
    const { topics, difficultyMix, count } = req.body || {};
    const questions = await generateMcqQuestions({
      topics: Array.isArray(topics) ? topics : [],
      difficultyMix: difficultyMix || "easy,medium,hard",
      count: Number(count) || 10
    });
    res.json({ questions });
  } catch (error) {
    console.error("generateQuestions error", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to generate questions" });
  }
};

// =============================
// 📤 Submit Test + Analytics + AI
// =============================
export const submitTest = async (req, res) => {
  try {
    const {
      quizId,
      answers,
      violations,
      studentId,
      studentName,
      studentEmail,
      questionMeta
    } = req.body;

    if (!quizId || !answers) {
      return res
        .status(400)
        .json({ message: "quizId and answers are required" });
    }

    const test = await Test.findById(quizId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const questions = Array.isArray(test.questions) ? test.questions : [];

    let correctCount = 0;
    const questionResults = questions.map((q) => {
      const selected = answers[q._id] ?? answers[q.id];
      const meta = questionMeta?.[q._id] || questionMeta?.[q.id] || {};

      // If no correct option is known, we treat all as practice MCQs
      const correctOption =
        typeof meta.correctIndex === "number" &&
        Array.isArray(q.options) &&
        q.options[meta.correctIndex]
          ? q.options[meta.correctIndex]
          : undefined;

      const isCorrect =
        !!correctOption && selected != null && selected === correctOption;

      if (isCorrect) {
        correctCount += 1;
      }

      return {
        questionId: q._id || q.id,
        text: q.text,
        topic: meta.topic || "general",
        difficulty: meta.difficulty || "medium",
        selectedOption: selected,
        correctOption,
        isCorrect,
        timeTakenSeconds:
          typeof meta.timeTakenSeconds === "number"
            ? meta.timeTakenSeconds
            : undefined
      };
    });

    const totalQuestions = questions.length || Object.keys(answers).length;
    const score = correctCount;
    const accuracy =
      totalQuestions > 0 ? correctCount / totalQuestions : 0;

    const topicMap = new Map();
    const diffMap = new Map();

    questionResults.forEach((qr) => {
      const topicKey = qr.topic || "general";
      const diffKey = qr.difficulty || "medium";

      if (!topicMap.has(topicKey)) {
        topicMap.set(topicKey, { topic: topicKey, attempted: 0, correct: 0 });
      }
      if (!diffMap.has(diffKey)) {
        diffMap.set(diffKey, {
          difficulty: diffKey,
          attempted: 0,
          correct: 0
        });
      }

      const tStat = topicMap.get(topicKey);
      tStat.attempted += 1;
      if (qr.isCorrect) tStat.correct += 1;

      const dStat = diffMap.get(diffKey);
      dStat.attempted += 1;
      if (qr.isCorrect) dStat.correct += 1;
    });

    const topicStats = Array.from(topicMap.values());
    const difficultyStats = Array.from(diffMap.values());

    // Simple readiness score: base on accuracy and difficulty mix
    const hardStat = difficultyStats.find((d) => d.difficulty === "hard");
    const hardAccuracy =
      hardStat && hardStat.attempted
        ? hardStat.correct / hardStat.attempted
        : 0;
    let placementReadinessScore = Math.round(
      accuracy * 70 + hardAccuracy * 30
    );
    if (violations && violations > 0) {
      placementReadinessScore = Math.max(
        0,
        placementReadinessScore - Math.min(violations * 5, 15)
      );
    }

    let placementReadinessLabel = "Not Ready";
    if (placementReadinessScore >= 80) {
      placementReadinessLabel = "Placement-Ready";
    } else if (placementReadinessScore >= 60) {
      placementReadinessLabel = "Moderately Ready";
    } else if (placementReadinessScore >= 40) {
      placementReadinessLabel = "Emerging";
    }

    // AI feedback + roadmap (fault-tolerant so submit never fails)
    const { aiFeedback, aiRoadmap } = await safeGenerateFeedbackAndRoadmap({
      score,
      totalQuestions,
      accuracy,
      topicStats,
      difficultyStats,
      violations
    });

    const attempt = await TestAttempt.create({
      studentId,
      studentName,
      studentEmail,
      testId: test._id.toString(),
      testTitle: test.title,
      score,
      totalQuestions,
      correctCount,
      accuracy,
      violations: violations || 0,
      placementReadinessScore,
      placementReadinessLabel,
      questions: questionResults,
      topicStats,
      difficultyStats,
      aiFeedback,
      aiRoadmap
    });

    res.status(201).json({
      message: "Test submitted successfully",
      attempt
    });
  } catch (error) {
    console.error("submitTest error", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to submit test" });
  }
};

// =============================
// 📤 Submit Random/AI Test
// =============================
export const submitRandomTest = async (req, res) => {
  try {
    const {
      testId,
      testTitle,
      questions,
      answers,
      violations,
      studentId,
      studentName,
      studentEmail,
      questionMeta
    } = req.body;

    if (!questions || !answers) {
      return res
        .status(400)
        .json({ message: "questions and answers are required" });
    }

    let correctCount = 0;
    const questionResults = (questions).map((q) => {
      const selected = answers[q._id] ?? answers[q.id];
      const correctOption = q.correctAnswer;
      const isCorrect = !!correctOption && selected != null && selected === correctOption;

      if (isCorrect) {
        correctCount += 1;
      }

      const meta = questionMeta?.[q._id] || questionMeta?.[q.id] || {};

      return {
        questionId: q._id || q.id,
        text: q.text,
        topic: q.topic || meta.topic || "general",
        difficulty: q.difficulty || meta.difficulty || "medium",
        selectedOption: selected,
        correctOption,
        isCorrect,
        timeTakenSeconds: typeof meta.timeTakenSeconds === "number" ? meta.timeTakenSeconds : undefined
      };
    });

    const totalQuestions = questions.length || Object.keys(answers).length;
    const score = correctCount;
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

    const topicMap = new Map();
    const diffMap = new Map();

    questionResults.forEach((qr) => {
      const topicKey = qr.topic;
      const diffKey = qr.difficulty;

      if (!topicMap.has(topicKey)) topicMap.set(topicKey, { topic: topicKey, attempted: 0, correct: 0 });
      if (!diffMap.has(diffKey)) diffMap.set(diffKey, { difficulty: diffKey, attempted: 0, correct: 0 });

      const tStat = topicMap.get(topicKey);
      tStat.attempted += 1;
      if (qr.isCorrect) tStat.correct += 1;

      const dStat = diffMap.get(diffKey);
      dStat.attempted += 1;
      if (qr.isCorrect) dStat.correct += 1;
    });

    const topicStats = Array.from(topicMap.values());
    const difficultyStats = Array.from(diffMap.values());

    const hardStat = difficultyStats.find((d) => d.difficulty === "hard");
    const hardAccuracy = hardStat && hardStat.attempted ? hardStat.correct / hardStat.attempted : 0;
    
    let placementReadinessScore = Math.round(accuracy * 70 + hardAccuracy * 30);
    if (violations && violations > 0) {
      placementReadinessScore = Math.max(0, placementReadinessScore - Math.min(violations * 5, 15));
    }

    let placementReadinessLabel = "Not Ready";
    if (placementReadinessScore >= 80) placementReadinessLabel = "Placement-Ready";
    else if (placementReadinessScore >= 60) placementReadinessLabel = "Moderately Ready";
    else if (placementReadinessScore >= 40) placementReadinessLabel = "Emerging";

    // AI feedback + roadmap (fault-tolerant so submit never fails)
    const { aiFeedback, aiRoadmap } = await safeGenerateFeedbackAndRoadmap({
      score,
      totalQuestions,
      accuracy,
      topicStats,
      difficultyStats,
      violations
    });

    const attempt = await TestAttempt.create({
      studentId,
      studentName,
      studentEmail,
      testId: testId || "random_ai_test",
      testTitle: testTitle || "Random AI Placement Test",
      score,
      totalQuestions,
      correctCount,
      accuracy,
      violations: violations || 0,
      placementReadinessScore,
      placementReadinessLabel,
      questions: questionResults,
      topicStats,
      difficultyStats,
      aiFeedback,
      aiRoadmap
    });

    res.status(201).json({
      message: "Test submitted successfully",
      attempt
    });
  } catch (error) {
    console.error("submitRandomTest error", error);
    res.status(500).json({ message: error.message || "Failed to submit test" });
  }
};

// =============================
// 📚 Test History for a Student
// =============================
export const getTestHistory = async (req, res) => {
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
      .select(
        "studentId studentName studentEmail testId testTitle score totalQuestions correctCount accuracy violations placementReadinessScore placementReadinessLabel topicStats difficultyStats aiFeedback aiRoadmap createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();
    res.json(attempts);
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch history" });
  }
};
