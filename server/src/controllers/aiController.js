import {
  generatePerformanceFeedback,
  generateLearningRoadmap
} from "../services/aiService.js";
import { callAIJson } from "../services/aiJsonHelper.js";
import {
  generateCodingChallenge,
  runJavaScriptSolution
} from "../services/codingChallengeService.js";

const sanitizeText = (value) => String(value || "").trim();

const buildStudentGuideFallback = (context = {}) => {
  const userName = sanitizeText(context.userName) || "there";
  const experienceLevel = context.experienceLevel === "new" ? "new" : "returning";
  const currentGoal = sanitizeText(context.currentGoal) || "your placement goal";
  const readinessScore = Number(context.readinessScore) || 0;
  const readinessLabel = sanitizeText(context.readinessLabel);
  const roadmapProgress = Number(context.roadmapProgress) || 0;
  const latestTestTitle = sanitizeText(context.latestTestTitle);

  return {
    headline:
      experienceLevel === "new"
        ? `Welcome ${userName}, here is your student dashboard guide`
        : `Welcome back ${userName}, here is your dashboard refresher`,
    intro:
      experienceLevel === "new"
        ? "This dashboard is your placement command center. It brings together readiness tracking, roadmap progress, practice tools, and AI support."
        : "This is a quick guided refresher so you can see the most important dashboard areas right after login.",
    sections: [
      {
        title: "Readiness and progress",
        body: `Start with the readiness widgets, trend charts, and recent performance cards. Your current readiness snapshot is ${readinessScore}/100${readinessLabel ? ` (${readinessLabel})` : ""}.`
      },
      {
        title: "Goal setting and roadmap",
        body: `Use Goal Setting, Career Roadmap, and Placement Planner to keep the dashboard aligned to ${currentGoal}. Your roadmap completion is ${roadmapProgress} percent, which helps you decide what to tackle next.`
      },
      {
        title: "Practice areas",
        body: `Use Interview Prep, Coding Challenges, Interview AI, and analytics views to focus on weak areas and turn each practice session into measurable improvement.${latestTestTitle ? ` Your latest tracked attempt is "${latestTestTitle}".` : ""}`
      },
      {
        title: "AI mentor support",
        body: "Use the AI mentor whenever you want help understanding scores, choosing your next task, preparing answers, or replaying the guided tour."
      }
    ],
    nextActions: [
      "Review your readiness score and latest feedback first.",
      "Check whether your goal and roadmap still match your target role.",
      "Complete one focused practice activity before leaving the dashboard."
    ]
  };
};

const buildTeacherGuideFallback = (context = {}) => {
  const userName = sanitizeText(context.userName) || "Admin";
  const experienceLevel = context.experienceLevel === "new" ? "new" : "returning";
  const totalStudents = Number(context.totalStudents) || 0;
  const totalSessions = Number(context.totalSessions) || 0;
  const avgReadiness = Number(context.avgReadiness) || 0;
  const pendingApprovals = Number(context.pendingApprovals) || 0;
  const liveAlerts = Number(context.liveAlerts) || 0;

  return {
    headline:
      experienceLevel === "new"
        ? `Welcome ${userName}, here is your admin dashboard guide`
        : `Welcome back ${userName}, here is your admin dashboard refresher`,
    intro:
      experienceLevel === "new"
        ? "This dashboard is your control center for monitoring students, reviewing performance, and managing admin operations."
        : "This guided refresher highlights the areas you should review first after login.",
    sections: [
      {
        title: "Overview dashboard",
        body: `Start with the overview cards. They summarize ${totalStudents} students, ${totalSessions} sessions, and an average readiness score of ${avgReadiness} percent.`
      },
      {
        title: "Live monitoring",
        body: `Use Live proctor alerts, the activity trend, topic accuracy, and leaderboard widgets to identify risk and performance patterns quickly. There are currently ${liveAlerts} live alert entries in this session.`
      },
      {
        title: "Admin controls",
        body: `Use Students and Approvals to review accounts, inspect learners, and manage admin access. You currently have ${pendingApprovals} pending admin approval request${pendingApprovals === 1 ? "" : "s"}.`
      },
      {
        title: "Settings and preview",
        body: "Use Settings and Student View when you want to validate the learner journey or quickly jump into the student-facing workflow."
      }
    ],
    nextActions: [
      "Check live alerts and pending approvals first.",
      "Review topic accuracy and top performers for coaching signals.",
      "Open Student View when you need to verify the learner experience."
    ]
  };
};

const buildDashboardGuideFallback = (role, context = {}) =>
  role === "teacher"
    ? buildTeacherGuideFallback(context)
    : buildStudentGuideFallback(context);

const normalizeGuidePayload = (payload, fallback) => {
  const sections = Array.isArray(payload?.sections)
    ? payload.sections
        .map((section) => ({
          title: sanitizeText(section?.title),
          body: sanitizeText(section?.body)
        }))
        .filter((section) => section.title && section.body)
        .slice(0, 5)
    : [];

  const nextActions = Array.isArray(payload?.nextActions)
    ? payload.nextActions
        .map((action) => sanitizeText(action))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    headline: sanitizeText(payload?.headline) || fallback.headline,
    intro: sanitizeText(payload?.intro) || fallback.intro,
    sections: sections.length ? sections : fallback.sections,
    nextActions: nextActions.length ? nextActions : fallback.nextActions
  };
};

export const dashboardGuide = async (req, res) => {
  try {
    const role = sanitizeText(req.body?.role).toLowerCase();
    const context =
      req.body?.context && typeof req.body.context === "object"
        ? req.body.context
        : {};

    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ message: "role must be student or teacher" });
    }

    const fallback = buildDashboardGuideFallback(role, context);
    const systemPrompt = `
You are an onboarding assistant for the Smart Proctor platform.
Write a clear dashboard walkthrough for a ${role} user.
Mention the actual dashboard areas they can use right now.
Keep the tone practical, warm, and concise.
Tailor the explanation for a ${context.experienceLevel === "new" ? "new" : "returning"} user.

Return STRICT JSON in this shape:
{
  "headline": "...",
  "intro": "...",
  "sections": [
    { "title": "...", "body": "..." }
  ],
  "nextActions": ["...", "...", "..."]
}
`;

    const userPrompt = `Dashboard context:\n${JSON.stringify({
      role,
      ...context
    })}`;

    const data = await callAIJson(systemPrompt, userPrompt);
    return res.json(normalizeGuidePayload(data, fallback));
  } catch (error) {
    console.error("dashboardGuide error", error);
    const role = sanitizeText(req.body?.role).toLowerCase() === "teacher"
      ? "teacher"
      : "student";
    const context =
      req.body?.context && typeof req.body.context === "object"
        ? req.body.context
        : {};
    return res.json(buildDashboardGuideFallback(role, context));
  }
};

// Simple resume-based question generation: expects extracted text on client-side
export const generateResumeQuestions = async (req, res) => {
  try {
    const { resumeText, targetRole, companies } = req.body || {};
    if (!resumeText) {
      return res
        .status(400)
        .json({ message: "resumeText is required in request body" });
    }

    const systemPrompt =
      "You are an interviewer generating questions based on a candidate resume.";
    const userPrompt = `
From this resume text, generate three types of questions:
- skillBasedQuestions: conceptual or practical questions about listed skills
- projectBasedQuestions: questions about projects and impact
- interviewQuestions: HR / behavioral questions adapted to the profile

Target role: ${targetRole || "General placement"}
Target companies: ${Array.isArray(companies) && companies.length ? companies.join(", ") : "General placement companies"}

Resume:
${resumeText}

Return STRICT JSON:
{
  "skillBasedQuestions": ["..."],
  "projectBasedQuestions": ["..."],
  "interviewQuestions": ["..."],
  "prioritySkills": ["..."],
  "projectStories": ["..."],
  "elevatorPitch": "...",
  "impactBulletTips": ["..."],
  "companyQuestions": [
    {
      "company": "...",
      "questions": ["..."]
    }
  ]
}
`;

    const data = await callAIJson(systemPrompt, userPrompt);
    const safeCompanies = Array.isArray(companies)
      ? companies.map((company) => String(company).trim()).filter(Boolean)
      : [];

    res.json({
      skillBasedQuestions: data?.skillBasedQuestions || [],
      projectBasedQuestions: data?.projectBasedQuestions || [],
      interviewQuestions: data?.interviewQuestions || [],
      prioritySkills: data?.prioritySkills || [],
      projectStories: data?.projectStories || [],
      elevatorPitch:
        data?.elevatorPitch ||
        `I'm preparing for ${targetRole || "placement roles"} and I bring hands-on experience from my projects, core skills, and consistent practice.`,
      impactBulletTips: data?.impactBulletTips || [],
      companyQuestions:
        data?.companyQuestions?.length
          ? data.companyQuestions
          : safeCompanies.map((company) => ({
              company,
              questions: [
                `Why do you want to join ${company} for a ${targetRole || "technical"} role?`,
                `Which project from your resume best fits ${company}'s expectations and why?`
              ]
            }))
    });
  } catch (error) {
    console.error("generateResumeQuestions error", error);
    const resumeText = String(req.body?.resumeText || "");
    const targetRole = String(req.body?.targetRole || "placement role");
    const safeCompanies = Array.isArray(req.body?.companies)
      ? req.body.companies.map((company) => String(company).trim()).filter(Boolean)
      : [];
    const keywords = resumeText
      .split(/[\n,.:;-]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 3)
      .slice(0, 6);

    res.json({
      skillBasedQuestions: keywords.slice(0, 3).map((skill) => `Explain how you used ${skill} in a practical scenario.`),
      projectBasedQuestions: [
        "Describe one project you are most proud of and the impact it created.",
        "What challenge did you face in a project and how did you solve it?"
      ],
      interviewQuestions: [
        "Tell me about yourself in a placement interview setting.",
        "Why are you interested in this role?"
      ],
      prioritySkills: keywords.slice(0, 4),
      projectStories: [
        "Problem you solved",
        "Technical decisions you made",
        "Impact or measurable outcome"
      ],
      elevatorPitch: `I'm targeting ${targetRole} opportunities and I can explain my strongest projects, technical skills, and measurable outcomes clearly.`,
      impactBulletTips: [
        "Mention the problem, your exact responsibility, and the measurable result.",
        "Connect each project story back to the target role.",
        "Keep one 60-second version and one deeper technical version ready."
      ],
      companyQuestions: safeCompanies.map((company) => ({
        company,
        questions: [
          `Why are you interested in ${company}?`,
          `How does your project experience make you a fit for ${company}?`
        ]
      }))
    });
  }
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const buildHeuristicInterviewScorecard = (history = [], mode = "mixed") => {
  const candidateAnswers = history.filter(
    (message) => message?.role === "candidate" && typeof message?.content === "string"
  );
  const lastAnswer = candidateAnswers[candidateAnswers.length - 1]?.content || "";
  const wordCount = lastAnswer.trim().split(/\s+/).filter(Boolean).length;
  const answerCount = candidateAnswers.length;

  const clarity = clampScore(45 + Math.min(wordCount, 120) * 0.35);
  const structure = clampScore(40 + Math.min(wordCount, 90) * 0.3);
  const relevance = clampScore(55 + answerCount * 5);
  const technicalDepth =
    mode === "technical"
      ? clampScore(40 + Math.min(wordCount, 140) * 0.3)
      : clampScore(35 + Math.min(wordCount, 100) * 0.22);
  const confidence = clampScore(50 + Math.min(answerCount, 5) * 7);
  const overall = clampScore(
    (clarity + structure + relevance + technicalDepth + confidence) / 5
  );

  return {
    overall,
    categories: [
      { label: "Clarity", score: clarity },
      { label: "Structure", score: structure },
      { label: "Relevance", score: relevance },
      { label: "Technical depth", score: technicalDepth },
      { label: "Confidence", score: confidence }
    ],
    strengths: [
      overall >= 70 ? "Answers are developing good depth." : "You are building answer momentum.",
      wordCount >= 40 ? "You are giving more complete responses." : "Your answers are concise enough to improve quickly."
    ],
    improvements: [
      wordCount < 40 ? "Add one example or measurable outcome to each answer." : "Tighten the opening so your answer lands faster.",
      mode === "technical"
        ? "Explain tradeoffs and real use cases more explicitly."
        : "Use STAR or a clear beginning-middle-end structure."
    ],
    nextDrills: [
      "Re-answer the last question in under 90 seconds.",
      mode === "technical"
        ? "Practice one concept explanation with an example."
        : "Practice one HR answer with a stronger example."
    ]
  };
};

// Chat-based interview simulation
export const interviewChat = async (req, res) => {
  try {
    const { history, mode } = req.body || {};
    const safeHistory = Array.isArray(history) ? history : [];
    const modeLabel = mode || "mixed";

    const QUESTION_BANK = {
      hr: [
        "Tell me about yourself in 60 seconds.",
        "Why do you want to join our company?",
        "Describe a conflict in a team and how you resolved it.",
        "What is your biggest strength and an example for it?",
        "What is one weakness you are currently improving?",
        "Describe a time you failed and what you learned.",
        "How do you prioritize tasks with tight deadlines?",
        "Why should we hire you for this role?",
        "Where do you see yourself in 3 years?",
        "What motivates you to keep learning?"
      ],
      technical: [
        "Explain the difference between stack and queue with use cases.",
        "What is time complexity and why is Big-O important?",
        "How does binary search work and when can it be used?",
        "What is normalization in DBMS and why is it useful?",
        "Explain process vs thread in operating systems.",
        "What is recursion and when is it a good choice?",
        "How does hashing help in problem solving?",
        "What is the difference between HTTP and HTTPS?",
        "Explain REST API with one real example.",
        "What is dynamic programming in simple words?"
      ]
    };
    QUESTION_BANK.mixed = [...QUESTION_BANK.hr, ...QUESTION_BANK.technical];

    const askedQuestions = new Set(
      safeHistory
        .filter((m) => m?.role === "interviewer" && typeof m?.content === "string")
        .map((m) => m.content.trim())
    );
    const availableQuestions = (QUESTION_BANK[modeLabel] || QUESTION_BANK.mixed).filter(
      (q) => !askedQuestions.has(q)
    );
    const nextFromBank =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)] ||
      "Can you summarize your key strengths for this role?";

    // If this is the very first turn or no candidate answer is present yet, just ask a fresh question.
    const hasCandidateAnswer = safeHistory.some((m) => m?.role === "candidate");
    if (!hasCandidateAnswer) {
      return res.json({
        reply: "Great. Let's begin your interview practice.",
        nextQuestion: nextFromBank,
        scorecard: null
      });
    }

    const lastCandidateMessage =
      [...safeHistory]
        .reverse()
        .find((m) => m?.role === "candidate" && typeof m?.content === "string")
        ?.content || "";

    const systemPrompt = `
You are an AI interview panel for campus placements.
Mode: ${modeLabel} (one of "hr", "technical", "mixed").
Give a very short evaluation of the candidate answer.
Do NOT repeat previous questions.
Use this next question exactly as provided:
"${nextFromBank}"

Return STRICT JSON:
{
  "reply": "interviewer answer text",
  "nextQuestion": "next interviewer question",
  "scorecard": {
    "overall": 0-100,
    "categories": [
      { "label": "Clarity", "score": 0-100 },
      { "label": "Structure", "score": 0-100 },
      { "label": "Relevance", "score": 0-100 },
      { "label": "Technical depth", "score": 0-100 },
      { "label": "Confidence", "score": 0-100 }
    ],
    "strengths": ["..."],
    "improvements": ["..."],
    "nextDrills": ["..."]
  }
}
`;

    const userPrompt = `Candidate's latest answer:\n${lastCandidateMessage}\nRespond as the interviewer now.`;

    const { callAIJson } = await import("../services/aiJsonHelper.js");
    const data = await callAIJson(systemPrompt, userPrompt);
    const fallbackScorecard = buildHeuristicInterviewScorecard(safeHistory, modeLabel);

    res.json({
      reply: data?.reply || "Thank you for that answer.",
      nextQuestion: data?.nextQuestion || nextFromBank,
      scorecard: data?.scorecard || fallbackScorecard
    });
  } catch (error) {
    console.error("interviewChat error", error);
    const safeHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const modeLabel = req.body?.mode || "mixed";
    res.json({
      reply: "Thanks. Let's keep improving that answer.",
      nextQuestion: "Can you re-answer that with one stronger example?",
      scorecard: buildHeuristicInterviewScorecard(safeHistory, modeLabel)
    });
  }
};

export const interviewScorecard = async (req, res) => {
  try {
    const { history, mode } = req.body || {};
    const safeHistory = Array.isArray(history) ? history : [];
    const modeLabel = mode || "mixed";
    const candidateAnswers = safeHistory.filter((message) => message?.role === "candidate");

    if (!candidateAnswers.length) {
      return res.json({
        overall: 0,
        categories: [],
        strengths: [],
        improvements: ["Complete at least one answer to generate a session review."],
        nextDrills: []
      });
    }

    const heuristicScorecard = buildHeuristicInterviewScorecard(safeHistory, modeLabel);

    const systemPrompt = `
You are an AI interview coach summarizing a mock interview session.
Mode: ${modeLabel}.
Return STRICT JSON:
{
  "overall": 0-100,
  "categories": [
    { "label": "Clarity", "score": 0-100 },
    { "label": "Structure", "score": 0-100 },
    { "label": "Relevance", "score": 0-100 },
    { "label": "Technical depth", "score": 0-100 },
    { "label": "Confidence", "score": 0-100 }
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "nextDrills": ["..."]
}
`;

    const userPrompt = `Interview history:\n${JSON.stringify(safeHistory)}`;
    const data = await callAIJson(systemPrompt, userPrompt);

    res.json({
      overall: data?.overall ?? heuristicScorecard.overall,
      categories: data?.categories?.length ? data.categories : heuristicScorecard.categories,
      strengths: data?.strengths?.length ? data.strengths : heuristicScorecard.strengths,
      improvements: data?.improvements?.length ? data.improvements : heuristicScorecard.improvements,
      nextDrills: data?.nextDrills?.length ? data.nextDrills : heuristicScorecard.nextDrills
    });
  } catch (error) {
    console.error("interviewScorecard error", error);
    const safeHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const modeLabel = req.body?.mode || "mixed";
    res.json(buildHeuristicInterviewScorecard(safeHistory, modeLabel));
  }
};

export const rewriteInterviewAnswer = async (req, res) => {
  try {
    const { question, answer, targetRole, company } = req.body || {};

    if (!question || !answer) {
      return res.status(400).json({
        message: "question and answer are required in request body"
      });
    }

    const systemPrompt = `
You are an interview coach helping a student improve a draft answer for placements.
Keep the rewrite realistic, confident, and concise.
Return STRICT JSON:
{
  "rewrittenAnswer": "...",
  "strengths": ["..."],
  "gaps": ["..."],
  "coachingNotes": ["..."],
  "starBreakdown": {
    "situation": "...",
    "task": "...",
    "action": "...",
    "result": "..."
  }
}
`;

    const userPrompt = `
Question: ${question}
Candidate's answer: ${answer}
Target role: ${targetRole || "General placement"}
Target company: ${company || "General company"}

Rewrite the answer so it sounds stronger in a placement interview.
`;

    const data = await callAIJson(systemPrompt, userPrompt);

    if (!data?.rewrittenAnswer) {
      throw new Error("Rewrite response was empty");
    }

    res.json({
      rewrittenAnswer: data.rewrittenAnswer,
      strengths: data?.strengths || [],
      gaps: data?.gaps || [],
      coachingNotes: data?.coachingNotes || [],
      starBreakdown: data?.starBreakdown || {
        situation: "",
        task: "",
        action: "",
        result: ""
      }
    });
  } catch (error) {
    console.error("rewriteInterviewAnswer error", error);
    const answer = String(req.body?.answer || "").trim();
    const question = String(req.body?.question || "").trim();

    res.json({
      rewrittenAnswer: `For "${question}", I would answer like this: ${answer} I would also highlight my responsibility clearly, explain the action I took, and mention the outcome or learning in a more structured way.`,
      strengths: [
        "You already have the core content to build on."
      ],
      gaps: [
        "The answer needs a clearer structure.",
        "Add one measurable outcome or specific example."
      ],
      coachingNotes: [
        "Open with the core point in the first sentence.",
        "Use STAR structure when the question is behavioral.",
        "End by linking the story back to the role you want."
      ],
      starBreakdown: {
        situation: "Set the background in one line.",
        task: "Describe what was expected from you.",
        action: "Explain what you specifically did.",
        result: "Share the impact, learning, or measurable outcome."
      }
    });
  }
};

// Coding challenge: generate problem statement
export const generateCodingProblem = async (req, res) => {
  try {
    const { difficulty, topic } = req.body || {};
    const challenge = generateCodingChallenge({ difficulty, topic });
    res.json(challenge);
  } catch (error) {
    console.error("generateCodingProblem error", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to generate coding problem" });
  }
};

// Coding challenge: evaluate code using AI (lightweight)
export const evaluateCode = async (req, res) => {
  try {
    const { problem, code, language, runMode } = req.body || {};
    if (!problem || !code) {
      return res
        .status(400)
        .json({ message: "problem and code are required in request body" });
    }

    const selectedLanguage = language || "JavaScript";
    const selectedRunMode = runMode === "all" ? "all" : "public";

    if (selectedLanguage === "JavaScript") {
      const execution = runJavaScriptSolution({
        problem,
        code,
        runMode: selectedRunMode
      });

      if (execution) {
        return res.json(execution);
      }
    }

    const systemPrompt =
      "You are a coding interviewer. Evaluate candidate code for a given problem.";
    const userPrompt = `
Problem:
${JSON.stringify(problem)}

Language: ${selectedLanguage}

Candidate code:
${code}

Return STRICT JSON:
{
  "summary": "Short evaluation of correctness and style",
  "passed": true/false,
  "passRate": 0-100,
  "timeComplexity": "Big-O estimate",
  "spaceComplexity": "Big-O estimate",
  "edgeCaseCoverage": "low|medium|high",
  "issues": ["point 1", "point 2"],
  "suggestions": ["improvement 1", "improvement 2"],
  "nextStepPlan": ["step 1", "step 2", "step 3"]
}
`;

    const data = await callAIJson(systemPrompt, userPrompt);
    res.json({
      summary: data?.summary || "AI review complete.",
      passed: !!data?.passed,
      passRate:
        typeof data?.passRate === "number"
          ? Math.max(0, Math.min(100, Math.round(data.passRate)))
          : data?.passed
            ? 75
            : 45,
      timeComplexity: data?.timeComplexity || "Not estimated",
      spaceComplexity: data?.spaceComplexity || "Not estimated",
      edgeCaseCoverage: data?.edgeCaseCoverage || "medium",
      issues: Array.isArray(data?.issues) ? data.issues : [],
      suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
      nextStepPlan: Array.isArray(data?.nextStepPlan) ? data.nextStepPlan : []
    });
  } catch (error) {
    console.error("evaluateCode error", error);
    const selectedLanguage = req.body?.language || "JavaScript";

    if (selectedLanguage === "JavaScript") {
      return res.status(400).json({
        message: error.message || "Failed to run your JavaScript solution."
      });
    }

    res.status(500).json({ message: error.message || "Failed to evaluate code" });
  }
};

// Study recommendation engine built on performance stats + AI roadmap helpers
export const studyRecommendations = async (req, res) => {
  try {
    const { latestAttempt, historySummary } = req.body || {};
    if (!latestAttempt) {
      return res
        .status(400)
        .json({ message: "latestAttempt is required in request body" });
    }

    const score = latestAttempt.score || 0;
    const totalQuestions = latestAttempt.totalQuestions || 0;
    const topicStats = latestAttempt.topicStats || [];
    const difficultyStats = latestAttempt.difficultyStats || [];

    const [feedback, roadmap] = await Promise.all([
      generatePerformanceFeedback({
        score,
        totalQuestions,
        accuracy: latestAttempt.accuracy || 0,
        topicStats,
        difficultyStats,
        violations: latestAttempt.violations || 0
      }),
      generateLearningRoadmap({
        score,
        totalQuestions,
        topicStats,
        difficultyStats,
        historySummary: historySummary || ""
      })
    ]);

    res.json({ feedback, roadmap });
  } catch (error) {
    console.error("studyRecommendations error", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to generate recommendations" });
  }
};

// =============================
// 💬 AI Student Chat/Mentor
// =============================
export const studentChat = async (req, res) => {
  try {
    const { messages, context } = req.body || {};
    const { callAIChat } = await import("../services/aiService.js");
    const response = await callAIChat(messages || [], context || {});
    res.json({ response });
  } catch (error) {
    console.error("studentChat error", error);
    res.status(500).json({ message: "Failed to reach AI mentor" });
  }
};

// =============================
// 🎯 GenAI Question Generation
// =============================
export const generateQuestions = async (req, res) => {
  try {
    const { topics, difficultyMix, count } = req.body || {};
    const { generateMcqQuestions } = await import("../services/aiService.js");
    const questions = await generateMcqQuestions({
      topics: Array.isArray(topics) ? topics : [],
      difficultyMix: difficultyMix || "easy,medium,hard",
      count: Number(count) || 10
    });
    res.json({ questions });
  } catch (error) {
    console.error("generateQuestions error", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to generate questions" });
  }
};

// Analyze user goal / resume for a personalized path
export const analyzeGoal = async (req, res) => {
  try {
    const { goalText, resumeSummary } = req.body || {};
    const systemPrompt = "You are a career consultant specialized in tech placements.";
    const userPrompt = `
Analyze this goal/resume and extract:
1. primaryGoal (e.g., "Fullstack Developer", "Data Scientist")
2. focusLevel (e.g., "beginner", "intermediate", "advanced")
3. coreSkills (array of 5 important skills)
4. suggestedTests (array of 3 topics relevant to this goal)

Input:
Goal: ${goalText || "General Placement"}
Resume: ${resumeSummary || "Not provided"}

Return STRICT JSON:
{
  "primaryGoal": "...",
  "focusLevel": "...",
  "coreSkills": ["...", "..."],
  "suggestedTests": ["...", "..."]
}
`;

    const data = await callAIJson(systemPrompt, userPrompt);
    // If AI fails, provide a silent fallback to prevent Axios errors on client
    if (!data || !data.primaryGoal) {
      return res.json({ primaryGoal: goalText || "General Placement" });
    }
    res.json(data);
  } catch (error) {
    console.error("analyzeGoal error", error);
    // Absolute fallback: returning original text as the goal
    res.json({ primaryGoal: req.body?.goalText || "General Placement" });
  }
};

