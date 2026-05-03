// Sample tests for interview prep: aptitude + technical, by company/category
export const SAMPLE_TESTS = [
  {
    id: "aptitude-general",
    title: "Aptitude – General",
    companyOrCategory: "General",
    testType: "aptitude",
    durationMinutes: 15,
    skillWeights: { Quantitative: 1, Logical: 1, Verbal: 1 },
    questions: [
      { id: 1, skill: "Quantitative", text: "If 3x + 7 = 22, what is x?", options: ["4", "5", "6", "7"], correct: 1 },
      { id: 2, skill: "Quantitative", text: "20% of 150 is?", options: ["25", "30", "35", "40"], correct: 1 },
      { id: 3, skill: "Logical", text: "Next in sequence: 2, 4, 8, 16, ?", options: ["24", "32", "28", "30"], correct: 1 },
      { id: 4, skill: "Logical", text: "All cats are animals. Tom is a cat. Therefore?", options: ["Tom is an animal", "Tom is not an animal", "Cannot say", "Tom is a dog"], correct: 0 },
      { id: 5, skill: "Verbal", text: "Choose the correct spelling.", options: ["Occurrence", "Occurence", "Ocurrence", "Occurrance"], correct: 0 },
      { id: 6, skill: "Verbal", text: "Synonym of 'Benevolent':", options: ["Cruel", "Kind", "Strict", "Neutral"], correct: 1 },
    ],
  },
  {
    id: "technical-general",
    title: "Technical – Programming Basics",
    companyOrCategory: "General",
    testType: "technical",
    durationMinutes: 15,
    skillWeights: { Programming: 1, DataStructures: 1, ProblemSolving: 1 },
    questions: [
      { id: 1, skill: "Programming", text: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correct: 1 },
      { id: 2, skill: "Programming", text: "Which is not a primitive in JavaScript?", options: ["number", "string", "array", "boolean"], correct: 2 },
      { id: 3, skill: "DataStructures", text: "LIFO is used in:", options: ["Queue", "Stack", "Array", "Linked List"], correct: 1 },
      { id: 4, skill: "DataStructures", text: "Best data structure for quick lookup by key?", options: ["Array", "Hash Map", "Linked List", "Stack"], correct: 1 },
      { id: 5, skill: "ProblemSolving", text: "Which approach is used in Merge Sort?", options: ["Greedy", "Divide and Conquer", "Dynamic Programming", "Backtracking"], correct: 1 },
      { id: 6, skill: "ProblemSolving", text: "Recursion uses which data structure internally?", options: ["Queue", "Stack", "Array", "Tree"], correct: 1 },
    ],
  },
  {
    id: "core-os-dbms",
    title: "Core CS Fundamentals (OS & DBMS)",
    companyOrCategory: "Technical Core",
    testType: "technical",
    durationMinutes: 20,
    isDynamic: true,
    topics: ["Operating Systems", "Database Management", "SQL"],
    skillWeights: { OperatingSystems: 1, DBMS: 1 },
    questions: [] // Populated dynamically if isDynamic
  },
  {
    id: "core-networking",
    title: "Networking & Security",
    companyOrCategory: "Technical Core",
    testType: "technical",
    durationMinutes: 15,
    isDynamic: true,
    topics: ["Computer Networks", "Cyber Security", "Protocols"],
    skillWeights: { Networking: 1 },
    questions: []
  },
  {
    id: "placement-soft-skills",
    title: "Placement Soft Skills & HR",
    companyOrCategory: "Placement Ready",
    testType: "behavioral",
    durationMinutes: 10,
    isDynamic: true,
    topics: ["Professional Etiquette", "Conflict Resolution", "HR Questions"],
    skillWeights: { SoftSkills: 1 },
    questions: []
  },
  {
    id: "advanced-aptitude",
    title: "Advanced Aptitude Challenge",
    companyOrCategory: "Elite",
    testType: "aptitude",
    durationMinutes: 30,
    isDynamic: true,
    topics: ["Probability", "Permutations", "Data Interpretation", "Cryptarithmetic"],
    skillWeights: { Quantitative: 1.5, Logical: 1.5 },
    questions: []
  },
  {
    id: "company-google",
    title: "Google – Aptitude & Technical",
    companyOrCategory: "Google",
    testType: "company_mock",
    durationMinutes: 20,
    skillWeights: { Quantitative: 1, Logical: 1, Programming: 1, ProblemSolving: 1 },
    questions: [
      { id: 1, skill: "Quantitative", text: "In how many ways can 5 books be arranged?", options: ["100", "120", "80", "60"], correct: 1 },
      { id: 2, skill: "Logical", text: "If A > B and B > C, then?", options: ["A < C", "A > C", "A = C", "Cannot say"], correct: 1 },
      { id: 3, skill: "Programming", text: "What does 'idempotent' mean in APIs?", options: ["Same request, same effect", "One-time only", "Async", "Cached"], correct: 0 },
      { id: 4, skill: "ProblemSolving", text: "Best way to find duplicate in an array of n numbers (1 to n-1)?", options: ["Nested loop", "Hash set", "Sort then scan", "Both B and C"], correct: 3 },
    ],
  },
  {
    id: "company-amazon",
    title: "Amazon – Aptitude & Technical",
    companyOrCategory: "Amazon",
    testType: "company_mock",
    durationMinutes: 20,
    skillWeights: { Quantitative: 1, Logical: 1, Programming: 1, SystemDesign: 1 },
    questions: [
      { id: 1, skill: "Quantitative", text: "A train travels 120 km in 2 hours. Speed in m/s?", options: ["15", "50/3", "20", "25"], correct: 1 },
      { id: 2, skill: "Logical", text: "Odd one out: 2, 4, 8, 16, 31", options: ["2", "8", "16", "31"], correct: 3 },
      { id: 3, skill: "Programming", text: "Which structure is used for BFS?", options: ["Stack", "Queue", "Heap", "Set"], correct: 1 },
      { id: 4, skill: "SystemDesign", text: "Which is a characteristic of a scalable system?", options: ["Single server", "Stateless services", "Tight coupling", "No cache"], correct: 1 },
    ],
  },
  {
    id: "dbms-sql-pro",
    title: "Advanced DBMS & SQL",
    companyOrCategory: "Deep Dive",
    testType: "technical",
    durationMinutes: 20,
    isDynamic: true,
    topics: ["Indexing", "Transactions/ACID", "Normalization", "SQL Joins"],
    skillWeights: { DBMS: 2 },
    questions: []
  },
  {
    id: "os-kernel-pro",
    title: "OS Internals & Kernel",
    companyOrCategory: "Deep Dive",
    testType: "technical",
    durationMinutes: 20,
    isDynamic: true,
    topics: ["Memory Management", "Process Scheduling", "Deadlocks", "Virtual Memory"],
    skillWeights: { OperatingSystems: 2 },
    questions: []
  },
  {
    id: "programming-languages-core",
    title: "Language Mastery (Java/Python/C++)",
    companyOrCategory: "Deep Dive",
    testType: "technical",
    durationMinutes: 25,
    isDynamic: true,
    topics: ["OOPs Concepts", "Exception Handling", "Memory Management", "Multi-threading"],
    skillWeights: { Programming: 2 },
    questions: []
  },
  {
    id: "company-tcs-nqt",
    title: "TCS NQT Mock Challenge",
    companyOrCategory: "TCS",
    testType: "company_mock",
    durationMinutes: 20,
    isDynamic: true,
    topics: ["TCS NQT Aptitude", "TCS Technical Coding", "Verbal Ability"],
    skillWeights: { Quantitative: 1.5, Logical: 1.5, Programming: 1.5 },
    questions: []
  },
];

// Courses recommended per skill (weakness)
export const COURSES_BY_SKILL = {
  Quantitative: ["Quantitative Aptitude Basics", "Number Systems & Percentages", "Algebra for Placements"],
  Logical: ["Logical Reasoning Fundamentals", "Pattern Recognition", "Critical Thinking"],
  Verbal: ["English for Interviews", "Vocabulary Builder", "Grammar & Comprehension"],
  Programming: ["Programming Fundamentals", "DSA in Your Language", "Code Practice"],
  DataStructures: ["Data Structures Mastery", "Arrays & Strings", "Trees and Graphs"],
  ProblemSolving: ["Problem Solving Patterns", "Algorithm Design", "Competitive Coding Basics"],
  SystemDesign: ["System Design Primer", "Scalability & APIs", "Low-Level Design"],
};

export function getRecommendedCourses(skillNames) {
  const names = new Set();
  (skillNames || []).forEach((skill) => {
    (COURSES_BY_SKILL[skill] || []).forEach((c) => names.add(c));
  });
  return Array.from(names);
}

// Compute strengths (top 2 skills), weaknesses (bottom 2), and overall %
export function analyzeAttempt(questions, answers, skillWeights) {
  const skillCorrect = {};
  const skillTotal = {};
  const weights = skillWeights || {};

  questions.forEach((q) => {
    const sk = q.skill || "Other";
    if (!skillTotal[sk]) skillTotal[sk] = 0;
    if (!skillCorrect[sk]) skillCorrect[sk] = 0;
    skillTotal[sk] += weights[sk] || 1;
    const chosen = answers[q.id];
    if (chosen === q.correct) skillCorrect[sk] += weights[sk] || 1;
  });

  const skillScores = Object.keys(skillTotal).map((name) => ({
    name,
    score: skillTotal[name] ? Math.round((skillCorrect[name] / skillTotal[name]) * 100) : 0,
    maxScore: 100,
  }));

  const sorted = [...skillScores].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2).filter((s) => s.score >= 50).map((s) => s.name);
  const weaknesses = sorted.slice(-2).filter((s) => s.score < 80).map((s) => s.name);

  const totalScore = skillScores.length
    ? Math.round(skillScores.reduce((sum, s) => sum + s.score, 0) / skillScores.length)
    : 0;

  return { skillScores, strengths, weaknesses, overallScore: totalScore };
}
