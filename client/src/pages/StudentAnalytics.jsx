import { useEffect, useState } from "react";
import { apiUrl } from "../config/api";
import { api } from "../services/api";
import { getStoredUser } from "../services/authService";

function getStudentId() {
  try {
    const user = getStoredUser() || {};
    return (
      user.id ||
      user._id ||
      user.studentId ||
      (user.name ? user.name.replace(/\s+/g, "-").toLowerCase() : "student")
    );
  } catch {
    return "student";
  }
}

export default function StudentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const studentId = getStudentId();

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(apiUrl(`/analytics/student/${studentId}`));
        setData(res.data);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to load analytics data."
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [studentId]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading analytics…</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "red" }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: 24 }}>No analytics available yet.</div>;
  }

  const maxScorePoint = Math.max(
    1,
    ...((data.scoreHistory || []).map((item) => item.score || 0))
  );

  return (
    <div style={{ padding: 2 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>My Performance Analytics</h2>
      <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
        Track score growth, topic mastery, and readiness confidence.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginTop: 16,
          marginBottom: 24
        }}
      >
        <AnalyticsCard title="Total Tests" value={data.totalTests} />
        <AnalyticsCard title="Average Score" value={`${data.averageScore}%`} />
        <AnalyticsCard title="Highest Score" value={`${data.highestScore}%`} />
        <AnalyticsCard
          title="Latest Readiness"
          value={
            data.latestReadiness != null
              ? `${data.latestReadiness}/100`
              : "—"
          }
        />
      </div>

      <section
        style={{
          marginBottom: 24,
          borderRadius: 18,
          padding: 16,
          background: "#ffffff",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
          border: "1px solid #e2e8f0"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Progress Graph</h3>
        {data.scoreHistory.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              height: 160,
              paddingTop: 10
            }}
          >
            {data.scoreHistory
              .slice()
              .reverse()
              .slice(-12)
              .map((s, idx) => {
                const h = Math.max(8, Math.round(((s.score || 0) / maxScorePoint) * 120));
                return (
                  <div key={`${s.date}-${idx}`} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      title={`${s.score}%`}
                      style={{
                        height: h,
                        borderRadius: 10,
                        background: "linear-gradient(180deg, #6366f1, #22c55e)",
                        transition: "transform 0.15s ease",
                        boxShadow: "0 6px 14px rgba(99,102,241,0.3)"
                      }}
                    />
                    <div style={{ fontSize: "0.7rem", marginTop: 6, color: "#64748b" }}>
                      {new Date(s.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Topic-wise Performance</h3>
        {data.topicStats.length === 0 ? (
          <p>No topic statistics yet.</p>
        ) : (
          <div>
            {data.topicStats.map((t) => (
              <BarRow
                key={t.topic}
                label={t.topic}
                value={t.accuracy}
                suffix="%"
              />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Difficulty-wise Accuracy</h3>
        {data.difficultyStats.length === 0 ? (
          <p>No difficulty statistics yet.</p>
        ) : (
          <div>
            {data.difficultyStats.map((d) => (
              <BarRow
                key={d.difficulty}
                label={d.difficulty}
                value={d.accuracy}
                suffix="%"
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>Score Progress</h3>
        {data.scoreHistory.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          <ul style={{ paddingLeft: 18, fontSize: "0.9rem" }}>
            {data.scoreHistory.map((s) => (
              <li key={s.date}>
                {new Date(s.date).toLocaleDateString()}: {s.score}%{" "}
                {s.readiness != null && `(Readiness: ${s.readiness}/100)`}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}

function AnalyticsCard({ title, value }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        background: "#ffffff",
        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
        border: "1px solid #e5e7eb"
      }}
    >
      <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{title}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function BarRow({ label, value, suffix }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          marginBottom: 2
        }}
      >
        <span>{label}</span>
        <span>
          {pct}
          {suffix}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, #22c55e, #4f46e5, #f97316)"
          }}
        />
      </div>
    </div>
  );
}

