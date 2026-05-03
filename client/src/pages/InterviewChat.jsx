import { useMemo, useState } from "react";
import { api } from "../services/api";
import { apiUrl } from "../config/api";
import { getStoredUser } from "../services/authService";
import { addBookmark, saveLastActivity } from "../services/studentWorkspace";

export default function InterviewChat() {
  const user = useMemo(() => getStoredUser() || {}, []);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("mixed");
  const [loading, setLoading] = useState(false);
  const [latestScorecard, setLatestScorecard] = useState(null);
  const [sessionReview, setSessionReview] = useState(null);

  const startInterview = async (selectedMode = mode) => {
    try {
      setLoading(true);
      setHistory([]);
      setLatestScorecard(null);
      setSessionReview(null);

      const response = await api.post(apiUrl("/ai/interview-chat"), {
        history: [],
        mode: selectedMode
      });

      const reply = response.data?.reply || "Great. Let's begin.";
      const nextQuestion =
        response.data?.nextQuestion || "Tell me about yourself in 60 seconds.";

      setHistory([
        { role: "interviewer", content: reply },
        { role: "interviewer", content: nextQuestion }
      ]);
      saveLastActivity({
        title: "Interview AI",
        path: "/interview-chat",
        detail: `Started ${selectedMode} interview`,
        section: "interview"
      });
    } catch (error) {
      setHistory([
        {
          role: "interviewer",
          content:
            error?.response?.data?.message ||
            "Could not start interview. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const nextHistory = [...history, { role: "candidate", content: trimmed }];
    setHistory(nextHistory);
    setInput("");
    setSessionReview(null);

    try {
      setLoading(true);
      const response = await api.post(apiUrl("/ai/interview-chat"), {
        history: nextHistory,
        mode
      });

      const reply = response.data?.reply || "Thank you for your answer.";
      const nextQuestion =
        response.data?.nextQuestion || "That's all for now. Good job.";

      setLatestScorecard(response.data?.scorecard || null);
      setHistory((prev) => [
        ...prev,
        { role: "interviewer", content: reply },
        { role: "interviewer", content: nextQuestion }
      ]);
      saveLastActivity({
        title: "Interview AI",
        path: "/interview-chat",
        detail: `Answered ${mode} interview question`,
        section: "interview"
      });
    } catch (error) {
      setHistory((prev) => [
        ...prev,
        {
          role: "interviewer",
          content:
            error?.response?.data?.message ||
            "I could not process your answer. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSessionReview = async () => {
    try {
      setLoading(true);
      const response = await api.post(apiUrl("/ai/interview-scorecard"), {
        history,
        mode
      });
      setSessionReview(response.data || null);
      saveLastActivity({
        title: "Interview AI review",
        path: "/interview-chat",
        detail: "Generated session scorecard",
        section: "interview"
      });
    } catch (error) {
      setSessionReview({
        overall: 0,
        categories: [],
        strengths: [],
        improvements: [
          error?.response?.data?.message || "Could not generate the session review."
        ],
        nextDrills: []
      });
    } finally {
      setLoading(false);
    }
  };

  const candidateAnswerCount = history.filter((message) => message.role === "candidate").length;

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1180,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(300px, 0.9fr)",
        gap: 20,
        minHeight: "70vh",
        boxSizing: "border-box"
      }}
    >
      <section
        style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: 24,
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          padding: 20,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <h2 style={{ marginTop: 0 }}>AI Interview Simulation</h2>
        <p style={{ fontSize: "0.95rem", color: "#5b6c88" }}>
          Practice HR and technical interviews, get instant answer feedback, and request a full session review when you are done.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <label>
            Mode{" "}
            <select
              value={mode}
              onChange={(event) => {
                const selectedMode = event.target.value;
                setMode(selectedMode);
                setHistory([]);
                setLatestScorecard(null);
                setSessionReview(null);
              }}
            >
              <option value="mixed">Mixed</option>
              <option value="hr">HR</option>
              <option value="technical">Technical</option>
            </select>
          </label>
          <button type="button" onClick={() => startInterview(mode)} disabled={loading}>
            Start new interview
          </button>
          {candidateAnswerCount > 0 && (
            <button
              type="button"
              onClick={handleGenerateSessionReview}
              disabled={loading}
              style={{ background: "#10203a" }}
            >
              Generate session review
            </button>
          )}
          <div style={{ marginLeft: "auto", color: "#5b6c88", fontSize: "0.9rem" }}>
            Candidate: {user?.name || "Student"}
          </div>
          {sessionReview && (
            <button
              type="button"
              onClick={() =>
                addBookmark({
                  id: `interview-review-${mode}-${candidateAnswerCount}`,
                  title: `${mode.toUpperCase()} interview review`,
                  note: (sessionReview.improvements || []).slice(0, 2).join(" | "),
                  type: "mistake",
                  source: "interview-ai",
                  path: "/interview-chat"
                })
              }
              style={{ background: "#7c3aed" }}
            >
              Save review
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1,
            borderRadius: 18,
            border: "1px solid #e5e7eb",
            padding: 14,
            overflowY: "auto",
            marginBottom: 12,
            background: "#f8fafc",
            minHeight: 360
          }}
        >
          {history.length === 0 && (
            <div style={{ fontSize: "0.92rem", color: "#6b7280" }}>
              Click "Start new interview" to begin with a fresh question.
            </div>
          )}
          {history.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                marginBottom: 10,
                textAlign: message.role === "candidate" ? "right" : "left"
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: message.role === "candidate" ? "#2563eb" : "#ffffff",
                  color: message.role === "candidate" ? "#eff6ff" : "#10203a",
                  maxWidth: "78%",
                  border: message.role === "candidate" ? "none" : "1px solid #e5e7eb"
                }}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your answer..."
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid #d1d5db"
            }}
          />
          <button type="button" onClick={handleSend} disabled={loading}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </section>

      <aside
        style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: 24,
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          padding: 20,
          display: "grid",
          gap: 16,
          alignContent: "start"
        }}
      >
        <div>
          <div style={eyebrowStyle}>Latest answer scorecard</div>
          {latestScorecard ? (
            <ScorecardPanel scorecard={latestScorecard} />
          ) : (
            <p style={mutedStyle}>
              Answer at least one question to see a structured scorecard here.
            </p>
          )}
        </div>

        <div>
          <div style={eyebrowStyle}>Session review</div>
          {sessionReview ? (
            <ScorecardPanel scorecard={sessionReview} />
          ) : (
            <p style={mutedStyle}>
              Generate a session review after a few answers to see strengths, improvements, and next drills.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function ScorecardPanel({ scorecard }) {
  return (
    <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
      <div
        style={{
          borderRadius: 18,
          padding: 16,
          background: "#eff6ff",
          color: "#1d4ed8"
        }}
      >
        <div style={eyebrowStyle}>Overall</div>
        <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: 6 }}>
          {scorecard?.overall || 0}/100
        </div>
      </div>

      {Array.isArray(scorecard?.categories) && scorecard.categories.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {scorecard.categories.map((category) => (
            <div key={category.label}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
                <span>{category.label}</span>
                <strong>{category.score}%</strong>
              </div>
              <div style={trackStyle}>
                <div
                  style={{
                    ...fillStyle,
                    width: `${Math.max(0, Math.min(100, category.score || 0))}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ListCard title="Strengths" items={scorecard?.strengths || []} />
      <ListCard title="Improvements" items={scorecard?.improvements || []} />
      <ListCard title="Next drills" items={scorecard?.nextDrills || []} />
    </div>
  );
}

function ListCard({ title, items }) {
  if (!items.length) return null;

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: "#ffffff",
        border: "1px solid #e5e7eb"
      }}
    >
      <div style={eyebrowStyle}>{title}</div>
      <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const eyebrowStyle = {
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#5271a7"
};

const mutedStyle = {
  color: "#5b6c88",
  lineHeight: 1.6
};

const trackStyle = {
  height: 9,
  borderRadius: 999,
  background: "#e2e8f0",
  overflow: "hidden"
};

const fillStyle = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #0f766e, #2563eb)"
};
