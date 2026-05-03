import { useEffect, useState } from "react";
import { apiUrl } from "../config/api";
import { api } from "../services/api";

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(apiUrl("/analytics/leaderboard"));
        setData(res.data);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to load leaderboard."
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading leaderboard…</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "red" }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: 24 }}>No leaderboard data.</div>;
  }

  return (
    <div style={{ padding: 2 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>Placement Leaderboard</h2>
      <p style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: 0 }}>
        Top performers by score and readiness. Keep practicing to climb faster.
      </p>

      <section
        style={{
          marginTop: 16,
          marginBottom: 24,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
          padding: 16
        }}
      >
        <h3>Top Scorers</h3>
        {data.topByScore.length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {data.topByScore.map((s, idx) => (
              <div
                key={s.studentId}
                style={{
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    #{idx + 1} {s.studentName || s.studentId}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>
                    Avg {s.averageScore}% | Readiness {s.averageReadiness}/100
                  </div>
                </div>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#111827",
                    color: "#e5e7eb",
                    fontWeight: 700,
                    fontSize: "0.8rem"
                  }}
                >
                  Best {s.bestScore}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
          padding: 16
        }}
      >
        <h3>Top by Readiness Index</h3>
        {data.topByReadiness.length === 0 ? (
          <p>No data yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {data.topByReadiness.map((s, idx) => (
              <div
                key={s.studentId}
                style={{
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    #{idx + 1} {s.studentName || s.studentId}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>
                    Best score {s.bestScore}% | Avg {s.averageScore}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "linear-gradient(90deg,#4f46e5,#22c55e)",
                    color: "#eff6ff",
                    fontWeight: 700,
                    fontSize: "0.8rem"
                  }}
                >
                  {s.averageReadiness}/100
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

