import StudentProgress from "../models/StudentProgress.js";

export const submitProgress = async (req, res) => {
  try {
    const progress = await StudentProgress.create(req.body);
    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProgressByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const list = await StudentProgress.find({ studentId })
      .sort({ attemptedAt: -1 })
      .lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllProgressForTeachers = async (req, res) => {
  try {
    const list = await StudentProgress.find().sort({ attemptedAt: -1 }).lean();
    const byStudent = list.reduce((acc, p) => {
      if (!acc[p.studentId]) acc[p.studentId] = { studentName: p.studentName, attempts: [] };
      acc[p.studentId].attempts.push(p);
      return acc;
    }, {});
    res.json({ byStudent, recent: list.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
