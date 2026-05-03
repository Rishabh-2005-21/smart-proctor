import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getStoredUser } from "../services/authService";
import { apiUrl } from "../config/api";

const STORAGE_KEYS = {
  goal: "studentGoal",
  roadmap: "studentRoadmap",
  profile: "studentRoadmapProfile"
};

const RESOURCE_LIBRARY = {
  frontend: [
    { name: "MDN Web Docs", url: "https://developer.mozilla.org" },
    { name: "React Docs", url: "https://react.dev" }
  ],
  backend: [
    { name: "Node.js Guides", url: "https://nodejs.org/en/learn" },
    { name: "MongoDB Manual", url: "https://www.mongodb.com/docs/manual/" }
  ],
  data: [
    { name: "Kaggle Learn", url: "https://www.kaggle.com/learn" },
    { name: "Pandas Guide", url: "https://pandas.pydata.org/docs/" }
  ],
  general: [
    { name: "NeetCode", url: "https://neetcode.io/" },
    { name: "Roadmap.sh", url: "https://roadmap.sh/" }
  ]
};

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function inferResourceGroup(goal) {
  const normalized = String(goal || "").toLowerCase();

  if (normalized.includes("front")) return "frontend";
  if (normalized.includes("back") || normalized.includes("api")) return "backend";
  if (normalized.includes("data") || normalized.includes("analyst")) return "data";
  return "general";
}

function normalizeProfile(rawProfile, fallbackGoal) {
  const primaryGoal = rawProfile?.primaryGoal || fallbackGoal || "General Placement";
  const focusLevel = rawProfile?.focusLevel || "intermediate";
  const coreSkills = Array.isArray(rawProfile?.coreSkills) && rawProfile.coreSkills.length
    ? rawProfile.coreSkills.slice(0, 5)
    : ["Problem Solving", "Core CS", "Communication", "Mock Tests", "Revision"];
  const suggestedTests = Array.isArray(rawProfile?.suggestedTests) && rawProfile.suggestedTests.length
    ? rawProfile.suggestedTests.slice(0, 4)
    : coreSkills.slice(0, 3);

  return {
    primaryGoal,
    focusLevel,
    coreSkills,
    suggestedTests
  };
}

function buildRoadmap(profile) {
  const resources = RESOURCE_LIBRARY[inferResourceGroup(profile.primaryGoal)] || RESOURCE_LIBRARY.general;
  const primarySkill = profile.coreSkills[0] || "Problem Solving";
  const secondarySkill = profile.coreSkills[1] || "Communication";
  const tertiarySkill = profile.coreSkills[2] || "Core CS";

  return [
    {
      id: 1,
      title: "Anchor your target role",
      timeframe: "Week 1",
      description: `Define the success criteria for becoming a ${profile.primaryGoal} and list the companies or domains you want to target.`,
      status: "completed",
      resources: resources.slice(0, 1)
    },
    {
      id: 2,
      title: `Strengthen ${primarySkill}`,
      timeframe: "Week 1-2",
      description: `Spend focused study time on ${primarySkill} and capture one or two weak areas after each session.`,
      status: "in-progress",
      resources
    },
    {
      id: 3,
      title: `Practice ${secondarySkill} and ${tertiarySkill}`,
      timeframe: "Week 2-3",
      description: "Use short practice loops: review fundamentals, take a timed test, then write down what to improve next.",
      status: "locked",
      resources: [{ name: "Smart Proctor Practice", url: "/interview-prep" }]
    },
    {
      id: 4,
      title: "Run interview simulations",
      timeframe: "Week 3-4",
      description: "Blend coding, mock interviews, and analytics review so your preparation starts looking like the real process.",
      status: "locked",
      resources: [
        { name: "Interview AI", url: "/interview-chat" },
        { name: "Coding Arena", url: "/coding-challenges" }
      ]
    },
    {
      id: 5,
      title: "Complete the proctored capstone",
      timeframe: "Final week",
      description: "Take the final roadmap exam, review the feedback, and decide which skills need one more improvement sprint.",
      status: "locked",
      resources: [{ name: "Final assessment", url: "/quiz?type=roadmap" }]
    }
  ];
}

function persistRoadmap(goal, profile, roadmap) {
  window.localStorage.setItem(STORAGE_KEYS.goal, goal);
  window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  window.localStorage.setItem(STORAGE_KEYS.roadmap, JSON.stringify(roadmap));
  window.localStorage.removeItem("lastDashboardGoal");
  window.dispatchEvent(new Event("roadmap:updated"));
}

function updateRoadmap(list, stepId, targetStatus) {
  const nextRoadmap = list.map((step) =>
    step.id === stepId ? { ...step, status: targetStatus } : step
  );

  if (targetStatus === "completed") {
    const currentIndex = nextRoadmap.findIndex((step) => step.id === stepId);
    const nextStep = nextRoadmap[currentIndex + 1];

    if (nextStep && nextStep.status === "locked") {
      nextRoadmap[currentIndex + 1] = { ...nextStep, status: "in-progress" };
    }
  }

  return nextRoadmap;
}

export default function StudentRoadmap() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser() || {}, []);
  const [goalInput, setGoalInput] = useState(
    () => window.localStorage.getItem(STORAGE_KEYS.goal) || ""
  );
  const [backgroundInput, setBackgroundInput] = useState("");
  const [profile, setProfile] = useState(() => readJson(STORAGE_KEYS.profile, null));
  const [roadmap, setRoadmap] = useState(() => readJson(STORAGE_KEYS.roadmap, null));
  const [testHistory, setTestHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    api
      .get(apiUrl(`/tests/history/${user.id}`))
      .then((response) => setTestHistory(response.data || []))
      .catch(() => setTestHistory([]));
  }, [user?.id]);

  const completionPercentage = roadmap?.length
    ? Math.round(
        (roadmap.filter((step) => step.status === "completed").length / roadmap.length) * 100
      )
    : 0;

  const existingFinal = testHistory.find((attempt) => attempt.testId === "roadmap_final");

  const handleGenerate = async () => {
    if (!goalInput.trim()) {
      setError("Add a target role or outcome before generating a roadmap.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const response = await api.post(apiUrl("/ai/analyze-goal"), {
        goalText: goalInput.trim(),
        resumeSummary: backgroundInput.trim() || null
      });

      const normalizedProfile = normalizeProfile(response.data, goalInput.trim());
      const nextRoadmap = buildRoadmap(normalizedProfile);

      setProfile(normalizedProfile);
      setRoadmap(nextRoadmap);
      setGoalInput(normalizedProfile.primaryGoal);
      persistRoadmap(normalizedProfile.primaryGoal, normalizedProfile, nextRoadmap);
    } catch {
      const fallbackProfile = normalizeProfile(null, goalInput.trim());
      const nextRoadmap = buildRoadmap(fallbackProfile);
      setProfile(fallbackProfile);
      setRoadmap(nextRoadmap);
      setGoalInput(fallbackProfile.primaryGoal);
      persistRoadmap(fallbackProfile.primaryGoal, fallbackProfile, nextRoadmap);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkStarted = (stepId) => {
    if (!roadmap) return;

    const nextRoadmap = updateRoadmap(roadmap, stepId, "in-progress");
    setRoadmap(nextRoadmap);
    persistRoadmap(goalInput, profile, nextRoadmap);
  };

  const handleMarkDone = (stepId) => {
    if (!roadmap) return;

    const nextRoadmap = updateRoadmap(roadmap, stepId, "completed");
    setRoadmap(nextRoadmap);
    persistRoadmap(goalInput, profile, nextRoadmap);
  };

  const handleReset = () => {
    if (!window.confirm("Reset your current roadmap and goal?")) return;

    window.localStorage.removeItem(STORAGE_KEYS.goal);
    window.localStorage.removeItem(STORAGE_KEYS.profile);
    window.localStorage.removeItem(STORAGE_KEYS.roadmap);
    window.localStorage.removeItem("lastDashboardGoal");
    window.dispatchEvent(new Event("roadmap:updated"));

    setGoalInput("");
    setBackgroundInput("");
    setProfile(null);
    setRoadmap(null);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          background: "rgba(255,255,255,0.9)",
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148,163,184,0.18)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5271a7" }}>
              Personalized roadmap
            </div>
            <h2 style={{ margin: "8px 0 8px", fontSize: "2rem" }}>Build your next study sprint</h2>
            <p style={{ margin: 0, color: "#5b6c88", maxWidth: 720 }}>
              Tell Smart Proctor what role you are aiming for and it will create a focused roadmap, skill priorities, and suggested practice areas.
            </p>
          </div>

          {roadmap && (
            <div style={{ minWidth: 180 }}>
              <div style={{ color: "#5271a7", fontWeight: 700, fontSize: "0.8rem" }}>
                Completion progress
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#1d4ed8" }}>
                {completionPercentage}%
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
          <textarea
            value={goalInput}
            onChange={(event) => setGoalInput(event.target.value)}
            placeholder="Example: Fullstack developer role focused on React, Node.js, and placements"
            style={{
              width: "100%",
              minHeight: 96,
              borderRadius: 18,
              border: "1px solid #dbe4f0",
              padding: 16,
              font: "inherit",
              resize: "vertical",
              boxSizing: "border-box"
            }}
          />
          <textarea
            value={backgroundInput}
            onChange={(event) => setBackgroundInput(event.target.value)}
            placeholder="Optional: add your current background, strengths, or resume summary for a better plan"
            style={{
              width: "100%",
              minHeight: 84,
              borderRadius: 18,
              border: "1px solid #dbe4f0",
              padding: 16,
              font: "inherit",
              resize: "vertical",
              boxSizing: "border-box"
            }}
          />

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#b91c1c",
                borderRadius: 14,
                padding: 12,
                border: "1px solid rgba(239,68,68,0.14)"
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                width: "auto",
                marginTop: 0,
                padding: "12px 18px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #0f766e, #2563eb)"
              }}
            >
              {isGenerating ? "Generating roadmap..." : roadmap ? "Regenerate roadmap" : "Generate roadmap"}
            </button>
            {roadmap && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/interview-prep")}
                  style={{
                    width: "auto",
                    marginTop: 0,
                    padding: "12px 18px",
                    borderRadius: 14,
                    background: "#10203a"
                  }}
                >
                  Go to practice
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    width: "auto",
                    marginTop: 0,
                    padding: "12px 18px",
                    borderRadius: 14,
                    background: "#e2e8f0",
                    color: "#10203a"
                  }}
                >
                  Reset roadmap
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {profile && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16
          }}
        >
          <InfoCard title="Primary goal" value={profile.primaryGoal} />
          <InfoCard title="Focus level" value={profile.focusLevel} />
          <InfoCard title="Core skills">
            <ChipRow items={profile.coreSkills} />
          </InfoCard>
          <InfoCard title="Suggested tests">
            <ChipRow items={profile.suggestedTests} actionLabel="Open practice" onAction={() => navigate("/interview-prep")} />
          </InfoCard>
        </section>
      )}

      {roadmap && (
        <section
          style={{
            background: "rgba(255,255,255,0.9)",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
            border: "1px solid rgba(148,163,184,0.18)"
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            {roadmap.map((step) => (
              <div
                key={step.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: 18,
                  padding: 18,
                  borderRadius: 22,
                  border: "1px solid #e2e8f0",
                  background: step.status === "locked" ? "#f8fafc" : "#ffffff",
                  opacity: step.status === "locked" ? 0.76 : 1
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    background:
                      step.status === "completed"
                        ? "#2563eb"
                        : step.status === "in-progress"
                          ? "#dbeafe"
                          : "#e2e8f0",
                    color: step.status === "completed" ? "#ffffff" : "#10203a"
                  }}
                >
                  {step.status === "completed" ? "Done" : step.status === "in-progress" ? "Now" : step.id}
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "#5271a7", fontWeight: 700 }}>
                        {step.timeframe}
                      </div>
                      <h3 style={{ margin: "6px 0 8px" }}>{step.title}</h3>
                    </div>
                    <div
                      style={{
                        alignSelf: "flex-start",
                        padding: "8px 12px",
                        borderRadius: 999,
                        background:
                          step.status === "completed"
                            ? "rgba(37,99,235,0.08)"
                            : step.status === "in-progress"
                              ? "rgba(15,118,110,0.08)"
                              : "rgba(148,163,184,0.16)",
                        color:
                          step.status === "completed"
                            ? "#1d4ed8"
                            : step.status === "in-progress"
                              ? "#0f766e"
                              : "#64748b",
                        fontWeight: 700,
                        fontSize: "0.82rem"
                      }}
                    >
                      {step.status.replace("-", " ")}
                    </div>
                  </div>

                  <p style={{ margin: "0 0 14px", color: "#5b6c88", lineHeight: 1.6 }}>
                    {step.description}
                  </p>

                  {step.status !== "locked" &&
                    Array.isArray(step.resources) &&
                    step.resources.length > 0 && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                      {step.resources.map((resource) => {
                        const isInternal = resource.url.startsWith("/");

                        return isInternal ? (
                          <button
                            key={resource.name}
                            type="button"
                            onClick={() => navigate(resource.url)}
                            style={{
                              width: "auto",
                              marginTop: 0,
                              padding: "10px 14px",
                              borderRadius: 999,
                              background: "#eff6ff",
                              color: "#1d4ed8"
                            }}
                          >
                            {resource.name}
                          </button>
                        ) : (
                          <a
                            key={resource.name}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              textDecoration: "none",
                              padding: "10px 14px",
                              borderRadius: 999,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontWeight: 700
                            }}
                          >
                            {resource.name}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {step.status === "locked" && step.id === 3 && roadmap[1]?.status === "completed" && (
                      <button
                        type="button"
                        onClick={() => handleMarkStarted(step.id)}
                        style={{
                          width: "auto",
                          marginTop: 0,
                          padding: "10px 16px",
                          borderRadius: 12
                        }}
                      >
                        Start this step
                      </button>
                    )}
                    {step.status === "locked" && step.id > 3 && roadmap[step.id - 2]?.status === "completed" && (
                      <button
                        type="button"
                        onClick={() => handleMarkStarted(step.id)}
                        style={{
                          width: "auto",
                          marginTop: 0,
                          padding: "10px 16px",
                          borderRadius: 12
                        }}
                      >
                        Start this step
                      </button>
                    )}
                    {step.status === "in-progress" && (
                      <button
                        type="button"
                        onClick={() => handleMarkDone(step.id)}
                        style={{
                          width: "auto",
                          marginTop: 0,
                          padding: "10px 16px",
                          borderRadius: 12
                        }}
                      >
                        Mark as complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {roadmap && completionPercentage === 100 && (
        <section
          style={{
            background: "linear-gradient(135deg, #10203a, #2563eb)",
            color: "#ffffff",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.78 }}>
                Final checkpoint
              </div>
              <h2 style={{ margin: "8px 0 10px" }}>
                {existingFinal ? "Your final roadmap report is ready" : "Take your proctored final exam"}
              </h2>
              <p style={{ margin: 0, maxWidth: 700, lineHeight: 1.6, opacity: 0.88 }}>
                Finish the roadmap with a full timed assessment so your dashboard and analytics can reflect your latest readiness level.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/quiz?type=roadmap&goal=${encodeURIComponent(goalInput)}`)}
              style={{
                width: "auto",
                marginTop: 0,
                padding: "14px 20px",
                borderRadius: 16,
                background: "#ffffff",
                color: "#10203a",
                fontWeight: 800
              }}
            >
              {existingFinal ? "Open final report" : "Start final exam"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCard({ title, value, children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        borderRadius: 22,
        padding: 18,
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)"
      }}
    >
      <div style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5271a7" }}>
        {title}
      </div>
      {value ? (
        <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 10 }}>{value}</div>
      ) : (
        <div style={{ marginTop: 12 }}>{children}</div>
      )}
    </div>
  );
}

function ChipRow({ items, actionLabel, onAction }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 700,
              fontSize: "0.86rem"
            }}
          >
            {item}
          </span>
        ))}
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            width: "auto",
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 12,
            background: "#10203a"
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
