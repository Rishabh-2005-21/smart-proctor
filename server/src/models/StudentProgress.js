import mongoose from "mongoose";

const skillScoreSchema = new mongoose.Schema({
  name: String,
  score: Number,
  maxScore: Number,
}, { _id: false });

const StudentProgressSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  testType: {
    type: String,
    enum: ["aptitude", "technical", "company_mock", "behavioral", "simulation", "Focus Quiz"],
    default: "aptitude"
  },
  companyOrCategory: { type: String, default: "General" },
  skillScores: [skillScoreSchema],
  overallScore: { type: Number, default: 0 },
  strengths: [String],
  weaknesses: [String],
  recommendedCourseIds: [String],
  recommendedCourseNames: [String],
  attemptedAt: { type: Date, default: Date.now },
});

StudentProgressSchema.index({ studentId: 1, attemptedAt: -1 });
StudentProgressSchema.index({ attemptedAt: -1 });

export default mongoose.model("StudentProgress", StudentProgressSchema);
