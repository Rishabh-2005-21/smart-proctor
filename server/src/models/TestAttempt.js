import mongoose from "mongoose";

const questionResultSchema = new mongoose.Schema(
  {
    questionId: String,
    text: String,
    topic: String,
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    selectedOption: String,
    correctOption: String,
    isCorrect: Boolean,
    timeTakenSeconds: Number
  },
  { _id: false }
);

const topicStatSchema = new mongoose.Schema(
  {
    topic: String,
    attempted: Number,
    correct: Number
  },
  { _id: false }
);

const difficultyStatSchema = new mongoose.Schema(
  {
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"]
    },
    attempted: Number,
    correct: Number
  },
  { _id: false }
);

const aiFeedbackSchema = new mongoose.Schema(
  {
    strengths: [String],
    weaknesses: [String],
    improvementSuggestions: [String],
    confidenceScore: Number
  },
  { _id: false }
);

const aiRoadmapSchema = new mongoose.Schema(
  {
    oneWeekPlan: [String],
    twoWeekPlan: [String],
    dailyRecommendations: [String]
  },
  { _id: false }
);

const TestAttemptSchema = new mongoose.Schema(
  {
    studentId: String,
    studentName: String,
    studentEmail: String,
    testId: String,
    testTitle: String,
    score: Number,
    totalQuestions: Number,
    correctCount: Number,
    accuracy: Number,
    violations: Number,
    placementReadinessScore: Number,
    placementReadinessLabel: String,
    questions: [questionResultSchema],
    topicStats: [topicStatSchema],
    difficultyStats: [difficultyStatSchema],
    aiFeedback: aiFeedbackSchema,
    aiRoadmap: aiRoadmapSchema
  },
  {
    timestamps: true
  }
);

TestAttemptSchema.index({ studentId: 1, createdAt: -1 });
TestAttemptSchema.index({ studentName: 1, createdAt: -1 });
TestAttemptSchema.index({ testId: 1 });
TestAttemptSchema.index({ createdAt: -1 });

export default mongoose.model("TestAttempt", TestAttemptSchema);

