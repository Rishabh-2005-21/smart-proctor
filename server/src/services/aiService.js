const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MOCK_QUESTIONS = {
  frontend: [
    { text: "Which React hook is used for side effects?", options: ["useState", "useEffect", "useContext", "useMemo"], correctIndex: 1, topic: "React", difficulty: "easy" },
    { text: "What does CSS stand for?", options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"], correctIndex: 1, topic: "CSS", difficulty: "easy" },
    { text: "In JavaScript, what is 'hoisting'?", options: ["Moving variable declarations to the top", "A way to lift heavy code", "A performance optimization", "A type of loop"], correctIndex: 0, topic: "JavaScript", difficulty: "medium" }
  ],
  backend: [
    { text: "What is the default port for MongoDB?", options: ["27017", "3000", "8080", "5432"], correctIndex: 0, topic: "Database", difficulty: "easy" },
    { text: "What does REST stand for?", options: ["Representational State Transfer", "Remote State Transfer", "Relative State Transfer", "Real-time State Transfer"], correctIndex: 0, topic: "API", difficulty: "medium" },
    { text: "Which Node.js module is used for handling file paths?", options: ["fs", "path", "http", "url"], correctIndex: 1, topic: "Node.js", difficulty: "easy" }
  ],
  general: [
    { text: "What is 15% of 200?", options: ["20", "30", "40", "25"], correctIndex: 1, topic: "Aptitude", difficulty: "easy" },
    { text: "Which sorting algorithm has O(n log n) average time complexity?", options: ["Bubble Sort", "Quick Sort", "Insertion Sort", "Selection Sort"], correctIndex: 1, topic: "Algorithms", difficulty: "medium" }
  ]
};

function getApiKey() {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (groqKey) return { key: groqKey, type: "groq" };
  if (openaiKey) return { key: openaiKey, type: "openai" };
  
  return null; // Return null to trigger mock mode
}

export async function callAI(messages, options = {}) {
  const auth = getApiKey();
  
  if (!auth) {
    console.warn("No API keys found. Performance will rely on static mock data.");
    return null; // Signals mock mode
  }

  const url = auth.type === "groq" ? GROQ_API_URL : OPENAI_API_URL;
  const defaultModel = auth.type === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.key}`
    },
    body: JSON.stringify({
      model: options.model || defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1200
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error (${auth.type}): ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  return content;
}

export async function generateMcqQuestions({
  topics = [],
  difficultyMix = "easy,medium,hard",
  count = 10
}) {
  const prompt = `
Generate ${count} comprehensive Multiple-Choice Questions (MCQs) strictly mimicking a Placement Round 1 Written Test.
The questions MUST cover a diverse mix:
- Quantitative & Logical Aptitude (30%)
- Core CS (OS, DBMS, Networking) (30%)
- Language Basics / Programming Output (${topics.join(", ")}) (40%)

Topics to focus on: ${topics.join(", ") || "general aptitude and computer science fundamentals"}.
Difficulty Mix: ${difficultyMix} (mostly hard for graduation tests).

Return ONLY a valid JSON array of objects:
[{"id":"q1","text":"...","options":["..."],"correctIndex":0,"topic":"...","difficulty":"..."}]
`;

  try {
    const raw = await callAI(
      [
        { role: "system", content: "You generate only structured JSON arrays of MCQs." },
        { role: "user", content: prompt }
      ]
    );

    if (!raw) throw new Error("Mock Mode Triggered");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } else {
        throw new Error("Unable to parse JSON from AI.");
      }
    }

    return parsed.map((q, idx) => ({
      _id: q.id || `q${idx + 1}`,
      text: q.text,
      options: Array.isArray(q.options) ? q.options : [],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      topic: q.topic || (topics[0] || "general"),
      difficulty: q.difficulty || "medium"
    }));

  } catch (err) {
    console.warn("AI generation failed or skipped, providing high-quality static fallback questions:", err.message);
    
    // Choose fallback based on first topic
    const mainTopic = topics[0]?.toLowerCase() || "general";
    let fallbackSet = MOCK_QUESTIONS.general;
    if (mainTopic.includes("front")) fallbackSet = MOCK_QUESTIONS.frontend;
    else if (mainTopic.includes("back")) fallbackSet = MOCK_QUESTIONS.backend;

    // Return mock data padded/truncated to count
    return Array.from({ length: count }, (_, i) => {
      const base = fallbackSet[i % fallbackSet.length];
      return { ...base, _id: `mock_q${i + 1}` };
    });
  }
}

export async function generatePerformanceFeedback({
  score,
  totalQuestions,
  accuracy,
  topicStats,
  difficultyStats,
  violations
}) {
  const prompt = `
You are an AI mentor for placement preparation.
Based on the following test performance data, give a concise analysis:

- Score: ${score} / ${totalQuestions}
- Accuracy: ${(accuracy * 100).toFixed(1)}%
- Topic stats: ${JSON.stringify(topicStats)}
- Difficulty stats: ${JSON.stringify(difficultyStats)}
- Violations / suspected malpractice events: ${violations}

Return STRICT JSON in this shape:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvementSuggestions": ["..."],
  "confidenceScore": 0-100
}
`;

  const raw = await callAI(
    [
      { role: "system", content: "You are an AI mentor. Respond with JSON only." },
      { role: "user", content: prompt }
    ],
    { maxTokens: 800 }
  );

  if (!raw) {
    return {
      strengths: ["Good effort", "Solid understanding of basics"],
      weaknesses: ["Needs more practice on complex scenarios"],
      improvementSuggestions: ["Try more mock tests", "Focus on time management"],
      confidenceScore: Math.round((accuracy || 0) * 100)
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } else {
      throw new Error("Unable to parse feedback JSON from AI response.");
    }
  }

  return {
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    improvementSuggestions: parsed.improvementSuggestions || [],
    confidenceScore:
      typeof parsed.confidenceScore === "number"
        ? parsed.confidenceScore
        : Math.round((accuracy || 0) * 100)
  };
}

export async function generateLearningRoadmap({
  score,
  totalQuestions,
  topicStats,
  difficultyStats,
  historySummary
}) {
  const prompt = `
You are an AI mentor for placement preparation.
Create a short 1-week and 2-week learning roadmap based on this profile:

- Latest test score: ${score} / ${totalQuestions}
- Topic stats: ${JSON.stringify(topicStats)}
- Difficulty stats: ${JSON.stringify(difficultyStats)}
- Past performance history summary: ${historySummary || "not available"}

Return STRICT JSON in this shape:
{
  "oneWeekPlan": ["Day 1: ...", "Day 2: ..."],
  "twoWeekPlan": ["Week 1: ...", "Week 2: ..."],
  "dailyRecommendations": ["Revise X", "Practice Y", "..."]
}
`;

  const raw = await callAI(
    [
      { role: "system", content: "You are an AI mentor. Respond with JSON only." },
      { role: "user", content: prompt }
    ],
    { maxTokens: 900 }
  );

  if (!raw) {
    return {
      oneWeekPlan: ["Day 1-3: Fundamentals", "Day 4-7: Practice Problems"],
      twoWeekPlan: ["Week 1: Foundations", "Week 2: Advanced Topics"],
      dailyRecommendations: ["Review mistakes", "Take 1 quiz daily"]
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } else {
      throw new Error("Unable to parse roadmap JSON from AI response.");
    }
  }

  return {
    oneWeekPlan: parsed.oneWeekPlan || [],
    twoWeekPlan: parsed.twoWeekPlan || [],
    dailyRecommendations: parsed.dailyRecommendations || []
  };
}

export async function callAIChat(messages, context = {}) {
  const auth = getApiKey();
  const systemPrompt = `
You are the "Smart Proctor Placement Mentor". 
Your goal is to help students with:
1. Understanding their dashboard and readiness scores.
2. Career roadmap guidance (how to set goals and follow the path).
3. Technical interview concepts (DSA, OS, DBMS, etc.).
4. Soft skills and HR interview tips.
You are MULTILINGUAL. Respond in the same language the student uses (Hindi, English, Spanish, etc.).
Keep responses concise, helpful, and professional.
Context: ${JSON.stringify(context)}
`;

  try {
    const content = await callAI([
      { role: "system", content: systemPrompt },
      ...messages
    ]);
    return content || "I'm sorry, I me having trouble connecting right now. Please try again later.";
  } catch (err) {
    console.error("callAIChat error", err);
    return "I'm in offline mode right now, but I can tell you that staying consistent is key!";
  }
}
