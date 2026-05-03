// models/Violation.js
import mongoose from "mongoose";

export default mongoose.model(
  "Violation",
  new mongoose.Schema({
    studentId: String,
    testId: String,
    type: String,
    time: { default: Date.now }
  })
);
