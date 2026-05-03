import express from "express";
import {
  dashboardGuide,
  generateResumeQuestions,
  interviewChat,
  generateCodingProblem,
  evaluateCode,
  studyRecommendations,
  studentChat,
  generateQuestions,
  analyzeGoal,
  interviewScorecard,
  rewriteInterviewAnswer
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/resume-questions", generateResumeQuestions);
router.post("/dashboard-guide", dashboardGuide);
router.post("/interview-chat", interviewChat);
router.post("/interview-scorecard", interviewScorecard);
router.post("/rewrite-answer", rewriteInterviewAnswer);
router.post("/coding-problem", generateCodingProblem);
router.post("/code-eval", evaluateCode);
router.post("/study-recommendations", studyRecommendations);
router.post("/chat", studentChat);
router.post("/genai-questions", generateQuestions);
router.post("/analyze-goal", analyzeGoal);

export default router;

