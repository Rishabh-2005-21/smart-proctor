const fs = require('fs');

const filePath = 'client/src/pages/StudentDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add testHistory state
const stateCode = `  const [todaySuggestions, setTodaySuggestions] = useState(null);
  const [testHistory, setTestHistory] = useState([]);`;
content = content.replace(/  const \[todaySuggestions, setTodaySuggestions\] = useState\(null\);/g, stateCode);

// 2. Modify useEffect to assign testHistory and stats
const effectRegex = /        const attempts = res\.data \|\| \[\];\s+if \(!attempts\.length\) return;\s+const latest = attempts\[0\];\s+setTodaySuggestions\(\{[\s\S]*?\}\);/;
const newEffect = `        const attempts = res.data || [];
        if (!attempts.length) return;
        setTestHistory(attempts);
        const latest = attempts[0];
        setTodaySuggestions({
          readiness: latest.placementReadinessScore,
          label: latest.placementReadinessLabel,
          roadmap: latest.aiRoadmap,
          feedback: latest.aiFeedback,
          stats: latest.topicStats || []
        });`;
content = content.replace(effectRegex, newEffect);

// 3. Replace the entire return (...) block
const returnRegex = /  const activeSection =[\s\S]*\}\s*$/;
const newReturn = `  const initials = studentName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  const readinessScore = todaySuggestions?.readiness || 0;
  const domainStats = todaySuggestions?.stats?.length > 0 ? todaySuggestions.stats : [
    { topic: "System Design", attempted: 10, correct: 9 },
    { topic: "Communication", attempted: 15, correct: 13 },
    { topic: "Algorithms", attempted: 20, correct: 18 }
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: theme === "dark" ? "#0f172a" : "#f4f7f6", fontFamily: "Inter, Arial, sans-serif", color: theme === "dark" ? "#f8fafc" : "#1f2937" }}>
      {/* Left Sidebar */}
      <nav style={{ width: "80px", background: theme === "dark" ? "#1e293b" : "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", borderRight: theme === "dark" ? "1px solid #334155" : "1px solid #e5e7eb", flexShrink: 0 }}>
        <div style={{ background: theme === "dark" ? "#6366f1" : "#111827", color: "#fff", borderRadius: "12px", width: "45px", height: "45px", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "1.4rem", marginBottom: "40px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>⚡</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", color: theme === "dark" ? "#64748b" : "#9ca3af", fontSize: "1.5rem" }}>
          <span style={{ cursor: "pointer", color: "#6366f1" }}>🏠</span>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/interview-prep")}>📄</span>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/leaderboard")}>🏆</span>
          <span style={{ cursor: "pointer", fontSize: "1.2rem", marginTop: "10px" }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</span>
        </div>
      </nav>

      {/* Main Wrapper */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Navbar */}
        <header style={{ height: "70px", background: theme === "dark" ? "#1e293b" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.5px" }}>ElevateAI</div>
          <div style={{ display: "flex", gap: "40px", fontSize: "0.95rem", fontWeight: 600, color: theme === "dark" ? "#94a3b8" : "#4b5563" }}>
            <span style={{ color: theme === "dark" ? "#fff" : "#111827", cursor: "pointer" }}>Dashboard</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/quiz?type=random")}>Practice</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/student-analytics")}>Resources</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/leaderboard")}>Community</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.95rem", fontWeight: 700 }}>
            <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#ffffff", width: "36px", height: "36px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "0.8rem", boxShadow: "0 4px 10px rgba(99,102,241,0.3)" }}>{initials}</div>
            <span>{studentName.split(' ')[0]}</span>
          </div>
        </header>

        {/* Content Area */}
        <main style={{ padding: "40px", flex: 1, display: "flex", gap: "32px", overflowY: "auto" }}>
          {/* Left Column (Main) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "40px", minWidth: 0 }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "1.5px", color: theme === "dark" ? "#94a3b8" : "#6b7280", textTransform: "uppercase" }}>Career Dashboard</div>
                <h1 style={{ margin: "8px 0 0", fontSize: "2.8rem", fontWeight: 900, letterSpacing: "-1px", color: theme === "dark" ? "#f8fafc" : "#111827" }}>Good Morning</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                <button onClick={() => navigate("/interview-prep")} className="premium-hover" style={{ display: "flex", alignItems: "center", gap: "10px", background: theme === "dark" ? "#334155" : "#ffffff", padding: "10px 20px", borderRadius: "99px", border: theme === "dark" ? "1px solid #475569" : "1px solid #e5e7eb", fontSize: "0.9rem", fontWeight: 700, color: theme === "dark" ? "#f8fafc" : "#374151", cursor: "pointer", boxShadow: theme === "dark" ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.05)" }}>
                  Watch walkthrough <span style={{ color: "#f43f5e", fontSize: "1.1rem" }}>▶</span>
                </button>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", color: theme === "dark" ? "#94a3b8" : "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>Average Readiness</div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 900 }}>{readinessScore} <span style={{ fontSize: "1.2rem", color: theme === "dark" ? "#475569" : "#cbd5e1" }}>/ 100</span></div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {["Tech", "Behavioral", "Case Study", "Leadership", "Marketing", "+"].map((tab, idx) => (
                <button key={tab} className="sleek-btn" style={{ padding: "10px 24px", borderRadius: "99px", border: "none", fontSize: "0.9rem", fontWeight: 700, background: idx === 0 ? (theme === "dark" ? "#f8fafc" : "#111827") : (theme === "dark" ? "#1e293b" : "#ffffff"), color: idx === 0 ? (theme === "dark" ? "#0f172a" : "#ffffff") : (theme === "dark" ? "#94a3b8" : "#6b7280"), cursor: "pointer", boxShadow: idx !== 0 && theme !== "dark" ? "0 2px 8px rgba(0,0,0,0.04)" : "none" }}>{tab}</button>
              ))}
            </div>

            {/* Recent Simulations */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: "1.5px", color: theme === "dark" ? "#94a3b8" : "#9ca3af", textTransform: "uppercase" }}>Recent Simulations</div>
                <div onClick={() => navigate("/student-analytics")} style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6366f1", cursor: "pointer" }}>View All History</div>
              </div>
              <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "16px" }}>
                
                {/* Practice Card */}
                <div onClick={() => navigate("/quiz?type=random")} className="premium-hover" style={{ cursor: "pointer", flexShrink: 0, width: "180px", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#ffffff", border: theme === "dark" ? "2px dashed #334155" : "2px dashed #cbd5e1", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <div style={{ fontSize: "2.5rem", color: theme === "dark" ? "#475569" : "#cbd5e1", fontWeight: 300 }}>+</div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>Practice</div>
                  <div style={{ fontSize: "0.8rem", color: theme === "dark" ? "#94a3b8" : "#9ca3af", textAlign: "center", lineHeight: "1.4" }}>Conduct live AI sessions & improve your skills.</div>
                </div>
                
                {/* Map Test Attempts */}
                {testHistory.slice(0, 3).map((attempt, idx) => (
                  <div key={idx} className="premium-hover" style={{ flexShrink: 0, width: "220px", background: theme === "dark" ? "#1e293b" : "#ffffff", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: theme === "dark" ? "0 4px 24px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: ["#ebf4ff", "#f3e8ff", "#fee2e2"][idx%3], display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.4rem" }}>{["🧑‍💻","👩‍💼","🧑‍🎓"][idx%3]}</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6366f1", background: theme === "dark" ? "rgba(99,102,241,0.1)" : "#eef2ff", padding: "4px 8px", borderRadius: "6px" }}>{new Date(attempt.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{attempt.testTitle}</div>
                      <div style={{ fontSize: "0.75rem", color: theme === "dark" ? "#64748b" : "#9ca3af", textTransform: "uppercase", fontWeight: 800 }}>{idx === 0 ? "Today" : "Completed"}</div>
                    </div>
                    <div style={{ marginTop: "auto" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: theme === "dark" ? "#94a3b8" : "#6b7280", marginBottom: "10px", fontWeight: 600 }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></div> Coach GenAI
                      </div>
                      <div style={{ width: "100%", height: "6px", background: theme === "dark" ? "#334155" : "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ width: \`\${Math.round(attempt.accuracy * 100)}%\`, height: "100%", background: ["#6366f1", "#8b5cf6", "#10b981"][idx%3], borderRadius: "99px" }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interview Domains */}
            <div>
              <div style={{ display: "flex", gap: "40px", marginBottom: "20px", paddingLeft: "24px", paddingRight: "24px" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1.5px", color: theme === "dark" ? "#64748b" : "#9ca3af", textTransform: "uppercase", width: "35%" }}>Interview Domains</div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1.5px", color: theme === "dark" ? "#64748b" : "#9ca3af", textTransform: "uppercase", width: "20%", textAlign: "center" }}>Engagement</div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1.5px", color: theme === "dark" ? "#64748b" : "#9ca3af", textTransform: "uppercase", width: "20%", textAlign: "center" }}>Score</div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1.5px", color: theme === "dark" ? "#64748b" : "#9ca3af", textTransform: "uppercase", width: "25%", textAlign: "right" }}>Improvement</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {domainStats.map((stat, idx) => (
                  <div key={idx} className="premium-hover glass-card" style={{ background: theme === "dark" ? "#1e293b" : "#ffffff", borderRadius: "20px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "40px", boxShadow: theme === "dark" ? "none" : "0 4px 16px rgba(0,0,0,0.04)", border: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", width: "35%" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: theme === "dark" ? "rgba(255,255,255,0.05)" : ["#fef3c7", "#d1fae5", "#ffedd5"][idx%3], display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.4rem" }}>{["🏛️","🗣️","🧠"][idx%3] || "📊"}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: theme === "dark" ? "#f8fafc" : "#111827" }}>{stat.topic}</div>
                        <div style={{ fontSize: "0.75rem", color: theme === "dark" ? "#64748b" : "#6b7280", fontWeight: 700, textTransform: "uppercase", marginTop: "4px" }}>{stat.attempted} Questions</div>
                      </div>
                    </div>
                    <div style={{ width: "20%", textAlign: "center", fontWeight: 800, fontSize: "1.1rem", color: theme === "dark" ? "#e2e8f0" : "#1f2937" }}>{Math.min(100, stat.attempted * 5)}%</div>
                    <div style={{ width: "20%", textAlign: "center", fontWeight: 800, fontSize: "1.1rem", color: theme === "dark" ? "#e2e8f0" : "#1f2937" }}>{stat.attempted > 0 ? Math.round((stat.correct/stat.attempted)*100) : 0}%</div>
                    <div style={{ width: "25%", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "20px" }}>
                      <div style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e", padding: "6px 10px", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 800 }}>+{Math.floor(stat.correct/2)} pts</div>
                      <button onClick={() => navigate("/student-analytics")} className="sleek-btn" style={{ background: theme === "dark" ? "#0f172a" : "#111827", color: "#ffffff", border: "none", borderRadius: "99px", padding: "12px 24px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", letterSpacing: "0.5px" }}>ANALYTIC REPORT</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Sidebar) */}
          <div style={{ width: "300px", display: "flex", flexDirection: "column", gap: "32px", flexShrink: 0 }}>
            
            {/* Partner Colleges Stat */}
            <div className="premium-hover" style={{ background: theme === "dark" ? "#1e293b" : "#ffffff", borderRadius: "28px", padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: theme === "dark" ? "none" : "0 8px 32px rgba(0,0,0,0.06)" }}>
               <div style={{ fontSize: "4rem", fontWeight: 900, color: "#6366f1", letterSpacing: "-2px", lineHeight: "1" }}>742</div>
               <div style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: "1.5px", color: theme === "dark" ? "#94a3b8" : "#9ca3af", textTransform: "uppercase", marginTop: "12px", marginBottom: "20px" }}>Partner Colleges</div>
               <div style={{ fontSize: "0.85rem", color: theme === "dark" ? "#64748b" : "#6b7280", lineHeight: "1.6", fontWeight: 500 }}>Join 700+ leading institutions in the AI career revolution.</div>
            </div>

            {/* Goal Setting */}
            <div onClick={() => navigate("/interview-prep")} className="premium-hover" style={{ cursor: "pointer", background: theme === "dark" ? "#1e293b" : "#ffffff", borderRadius: "28px", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", border: theme === "dark" ? "1px solid #334155" : "1px solid #f8fafc", boxShadow: theme === "dark" ? "none" : "0 8px 32px rgba(0,0,0,0.06)" }}>
               <div style={{ fontSize: "1.8rem", color: theme === "dark" ? "#64748b" : "#9ca3af", marginBottom: "16px", fontWeight: 300 }}>+</div>
               <div style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px", color: theme === "dark" ? "#f8fafc" : "#111827" }}>Goal Setting</div>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px", color: theme === "dark" ? "#64748b" : "#9ca3af", textTransform: "uppercase" }}>Update your targets</div>
            </div>

            {/* Ready to level up (Gradient Card) */}
            {todaySuggestions && (
              <div className="premium-hover" onClick={() => navigate("/student-analytics")} style={{ 
                cursor: "pointer",
                background: "linear-gradient(135deg, #f472b6, #fb923c, #fcd34d)",
                borderRadius: "28px",
                padding: "32px 24px",
                color: "#ffffff",
                boxShadow: "0 16px 40px rgba(244, 114, 182, 0.4)",
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                position: "relative",
                overflow: "hidden",
                marginTop: "auto"
              }}>
                <div style={{ position: "absolute", right: "-20px", top: "-20px", fontSize: "10rem", opacity: 0.1 }}>📈</div>
                <div style={{ fontSize: "2.4rem", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" }}>👋</div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "6px", color: "#fff" }}>Hi {studentName.split(' ')[0]}</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, opacity: 0.95, lineHeight: "1.5", color: "#fff" }}>
                    Ready to level up? <br/> Your readiness is {todaySuggestions.readiness}/100.
                  </div>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
`;

content = content.replace(returnRegex, newReturn);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Rewrite complete!');
