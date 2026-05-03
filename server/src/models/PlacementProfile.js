import mongoose from "mongoose";

const PlacementProfileSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    studentName: { type: String, default: "" },
    studentEmail: { type: String, default: "" },
    targetRole: { type: String, default: "" },
    targetCompanies: { type: [String], default: [] },
    timelineWeeks: { type: Number, default: 8, min: 1, max: 52 },
    branch: { type: String, default: "" },
    graduationYear: { type: String, default: "" },
    targetPackage: { type: String, default: "" },
    dailyMinutes: { type: Number, default: 90, min: 15, max: 600 },
    resumeSummary: { type: String, default: "" },
    strongestAreas: { type: [String], default: [] },
    weakestAreas: { type: [String], default: [] },
    notes: { type: String, default: "" }
  },
  {
    timestamps: true
  }
);

PlacementProfileSchema.index({ studentId: 1 }, { unique: true });

export default mongoose.model("PlacementProfile", PlacementProfileSchema);
