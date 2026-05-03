import express from "express";
import { submitProgress, getProgressByStudent, getAllProgressForTeachers } from "../controllers/progressController.js";

const router = express.Router();

router.post("/", submitProgress);
router.get("/student/:studentId", getProgressByStudent);
router.get("/teachers", getAllProgressForTeachers);

export default router;
