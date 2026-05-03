// routes/auth.routes.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !role) {
      return res.status(400).json({ msg: "Please fill all required fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters long" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ msg: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if ANY approved admin exists; if not, first teacher gets auto-approved (bootstrapping)
    let approvalStatus = "approved";
    if (role === "teacher") {
      const existingApprovedAdmin = await User.findOne({ role: "teacher", approvalStatus: "approved" });
      if (existingApprovedAdmin) {
        // Other admins exist → new admin must wait for approval
        approvalStatus = "pending";
      }
      // else: first admin ever → auto-approved (bootstrap)
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      approvalStatus
    });

    if (approvalStatus === "pending") {
      // Return a special status — user cannot log in yet
      return res.status(201).json({
        pending: true,
        msg: "Admin account created. Your account is pending approval by an existing admin. You will be able to log in once approved."
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      role: user.role,
      name: user.name,
      id: user._id
    });
  } catch (error) {
    console.error("Register error", error);
    return res.status(500).json({ msg: "Server error during registration" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ msg: "Please provide email and password" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // Block pending/rejected admins from logging in
    if (user.role === "teacher" && user.approvalStatus !== "approved") {
      const statusMsg = user.approvalStatus === "pending"
        ? "Your admin account is pending approval. Please wait for an existing admin to approve your request."
        : "Your admin account has been rejected. Please contact support.";
      return res.status(403).json({ msg: statusMsg, approvalStatus: user.approvalStatus });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      role: user.role,
      name: user.name,
      id: user._id
    });
  } catch (error) {
    console.error("Login error", error);
    return res.status(500).json({ msg: "Server error during login" });
  }
});

export default router;
