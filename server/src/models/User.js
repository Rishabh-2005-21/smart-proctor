import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, lowercase: true, trim: true },
    password: String,
    // "teacher" acts as admin in this system
    role: { type: String, enum: ["student", "teacher"], default: "student" },
    // Admin approval system
    // Students are always approved. Teachers (admins) start as "pending" until an existing admin approves.
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved" // Students auto-approved; teachers set to "pending" in auth route
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, approvalStatus: 1, createdAt: -1 });

export default mongoose.model("User", userSchema);
