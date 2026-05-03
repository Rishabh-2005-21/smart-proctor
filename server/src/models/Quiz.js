const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  title: String,
  code: String,
  startTime: Date,
  endTime: Date,
  duration: Number,
  questions: Array
});

module.exports = mongoose.model("Quiz", quizSchema);
