import express from "express";
import User from "../models/User.js";
import TestAttempt from "../models/TestAttempt.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/admin/users — All users (approved admins only)
router.get("/users", protect(["teacher"]), async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    console.error("Admin users fetch error", error);
    res.status(500).json({ msg: "Failed to load users" });
  }
});

// GET /api/admin/pending — Admins waiting for approval
router.get("/pending", protect(["teacher"]), async (req, res) => {
  try {
    const pending = await User.find(
      { role: "teacher", approvalStatus: "pending" },
      "-password"
    )
      .sort({ createdAt: -1 })
      .lean();
    res.json(pending);
  } catch (error) {
    console.error("Admin pending fetch error", error);
    res.status(500).json({ msg: "Failed to load pending admins" });
  }
});

// POST /api/admin/approve/:userId — Approve a pending admin
router.post("/approve/:userId", protect(["teacher"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.role !== "teacher") return res.status(400).json({ msg: "Only admin accounts require approval" });
    if (user.approvalStatus === "approved") return res.status(400).json({ msg: "Already approved" });

    user.approvalStatus = "approved";
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    await user.save();

    res.json({ msg: `${user.name} has been approved as an admin.`, user });
  } catch (error) {
    console.error("Approve error", error);
    res.status(500).json({ msg: "Failed to approve admin" });
  }
});

// POST /api/admin/reject/:userId — Reject a pending admin
router.post("/reject/:userId", protect(["teacher"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.role !== "teacher") return res.status(400).json({ msg: "Only admin accounts require approval" });

    user.approvalStatus = "rejected";
    await user.save();

    res.json({ msg: `${user.name}'s admin request has been rejected.` });
  } catch (error) {
    console.error("Reject error", error);
    res.status(500).json({ msg: "Failed to reject admin" });
  }
});

// DELETE /api/admin/delete/:userId — Permanently delete any account
router.delete("/delete/:userId", protect(["teacher"]), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Safety: prevent admin from deleting their own account
    // Compare as strings to avoid ObjectId vs string mismatch
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ msg: "You cannot delete your own account." });
    }

    const deletedName = user.name;
    const deletedRole = user.role;

    // Cascade delete: remove all test attempts linked to this student
    if (user.role === "student") {
      // Match by studentId field (stored as name-slug) OR by studentEmail
      await TestAttempt.deleteMany({
        $or: [
          { studentId: String(user._id) },
          { studentId: user.name.replace(/\s+/g, "-").toLowerCase() },
          { studentEmail: user.email }
        ]
      });
    }

    await User.findByIdAndDelete(userId);

    const label = deletedRole === "teacher" ? "Admin" : "Student";
    return res.json({ msg: `"${deletedName}" (${label}) has been permanently deleted.` });

  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ msg: `Server error: ${error.message}` });
  }
});

export default router;
