import express from "express";
import {
  createTest,
  getAllTests,
  getTestById,
  generateQuestions,
  submitTest,
  submitRandomTest,
  getTestHistory
} from "../controllers/testController.js";

const router = express.Router();

router.get("/", getAllTests);
router.get("/by-id/:id", getTestById);
router.post("/", createTest);

// GenAI question generation
router.post("/genai/questions", generateQuestions);

// Submit test + analytics + AI feedback
router.post("/submit", submitTest);
router.post("/submit-random", submitRandomTest);

// Student test history
router.get("/history/:studentId", getTestHistory);

export default router;
