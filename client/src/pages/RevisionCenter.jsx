import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { apiUrl } from "../config/api";
import { getStoredUser } from "../services/authService";
import {
  addBookmark,
  getBookmarks,
  getLastActivity,
  getReminderSettings,
  isReminderDue,
  markReminderNotified,
  removeBookmark,
  saveLastActivity,
  saveReminderSettings
} from "../services/studentWorkspace";

const HR_QUESTIONS = [
  "Tell me about yourself.",
  "Describe a challenge you faced in a team and how you handled it.",
  "Why should we hire you for this role?",
  "What is one weakness you are actively improving?",
  "Describe one project you are most proud of."
];

const REVISION_LIBRARY = {
  "Aptitude": {
    flashcards: [
      {
        prompt: "Time and Work",
        answer: "Convert each person's work rate into per-day contribution, then add the rates."
      },
      {
        prompt: "Percentages",
        answer: "Treat percentages as fractions for faster mental simplification."
      },
      {
        prompt: "Profit and Loss",
        answer: "Profit % = profit / cost price * 100. Loss % uses the same pattern."
      }
    ],
    notes: [
      "Speed matters, so use elimination before full calculation.",
      "Write ratios early to avoid repeated arithmetic.",
      "Revise percentage-fraction conversions regularly."
    ],
    mcqs: [
      {
        question: "If A finishes a job in 5 days, A's one-day work is:",
        options: ["5", "1/5", "1/25", "25"],
        correctIndex: 1
      },
      {
        question: "25% of 240 is:",
        options: ["40", "50", "60", "80"],
        correctIndex: 2
      }
    ]
  },
  "Technical": {
    flashcards: [
      {
        prompt: "Normalization",
        answer: "A DBMS process that reduces redundancy and improves data integrity across tables."
      },
      {
        prompt: "Process vs Thread",
        answer: "Processes have isolated memory; threads share memory inside the same process."
      },
      {
        prompt: "HTTP vs HTTPS",
        answer: "HTTPS adds TLS encryption, server authentication, and message integrity."
      }
    ],
    notes: [
      "For DBMS, always connect a concept to a real system use case.",
      "For OS, focus on scheduling, memory, synchronization, and process/thread differences.",
      "For CN, explain protocols with one practical example."
    ],
    mcqs: [
      {
        question: "Which protocol adds encryption to web traffic?",
        options: ["HTTP", "FTP", "HTTPS", "SMTP"],
        correctIndex: 2
      },
      {
        question: "What is the main goal of normalization?",
        options: ["Speed up UI rendering", "Reduce redundancy", "Increase file size", "Encrypt tables"],
        correctIndex: 1
      }
    ]
  },
  "Coding": {
    flashcards: [
      {
        prompt: "Hash map use case",
        answer: "Choose a hash map when you need quick lookup, frequency counts, or complement searches."
      },
      {
        prompt: "Sliding window",
        answer: "Use it for contiguous subarray or substring problems where the range grows and shrinks dynamically."
      },
      {
        prompt: "Dynamic programming",
        answer: "Use it when a problem has overlapping subproblems and optimal substructure."
      }
    ],
    notes: [
      "State the brute-force idea first, then optimize.",
      "For coding interviews, explain time and space complexity after the final approach.",
      "Keep edge cases in mind before coding."
    ],
    mcqs: [
      {
        question: "Which structure is best for O(1) average lookup?",
        options: ["Array", "Hash map", "Queue", "Stack"],
        correctIndex: 1
      },
      {
        question: "Sliding window is most useful for:",
        options: ["Sorting linked lists", "Contiguous ranges", "Tree rotations", "Database joins"],
        correctIndex: 1
      }
    ]
  },
  "Interview": {
    flashcards: [
      {
        prompt: "STAR Framework",
        answer: "Situation, Task, Action, Result. Keep each answer structured and outcome-focused."
      },
      {
        prompt: "Tell me about yourself",
        answer: "Present, past, future. Current skills, relevant experience, then why you fit the role."
      },
      {
        prompt: "Handling weakness questions",
        answer: "Choose a real but non-critical weakness, explain the improvement steps, and show progress."
      }
    ],
    notes: [
      "Use 60-90 second answers for common HR prompts.",
      "Quantify results whenever possible.",
      "End behavioral stories with what changed because of your action."
    ],
    mcqs: [
      {
        question: "What should come last in a STAR answer?",
        options: ["Action", "Result", "Situation", "Task"],
        correctIndex: 1
      },
      {
        question: "Which opening is strongest for 'Tell me about yourself'?",
        options: [
          "I was born in...",
          "I am a hardworking person...",
          "I am a final-year student focused on frontend roles with hands-on React projects.",
          "My hobbies are..."
        ],
        correctIndex: 2
      }
    ]
  }
};

export default function RevisionCenter() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser() || {}, []);
  const [selectedTrack, setSelectedTrack] = useState("Aptitude");
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [reminders, setReminders] = useState(() => getReminderSettings());
  const [lastActivity, setLastActivity] = useState(() => getLastActivity());
  const [revealedFlashcards, setRevealedFlashcards] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [question, setQuestion] = useState(HR_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const currentTrack = REVISION_LIBRARY[selectedTrack];
  const dueReminder = isReminderDue(reminders);
  const mistakeCount = bookmarks.filter((item) => item.type === "mistake").length;

  useEffect(() => {
    saveLastActivity({
      title: "Revision center",
      path: "/revision-center",
      detail: `Reviewing ${selectedTrack}`,
      section: "revision"
    });
  }, [selectedTrack]);

  useEffect(() => {
    const sync = () => {
      setBookmarks(getBookmarks());
      setReminders(getReminderSettings());
      setLastActivity(getLastActivity());
    };

    window.addEventListener("storage", sync);
    window.addEventListener("student-workspace:updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("student-workspace:updated", sync);
    };
  }, []);

  useEffect(() => {
    if (
      dueReminder &&
      reminders.browserNotifications &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("Smart Proctor revision reminder", {
        body: `${reminders.label}. Open your revision center and continue your prep.`
      });
      markReminderNotified();
      setReminders(getReminderSettings());
    }
  }, [dueReminder, reminders]);

  const toggleFlashcard = (prompt) => {
    setRevealedFlashcards((current) => ({
      ...current,
      [prompt]: !current[prompt]
    }));
  };

  const handleRewriteAnswer = async () => {
    if (!question.trim() || !answer.trim()) {
      setError("Add both the interview question and your draft answer first.");
      return;
    }

    try {
      setRewriting(true);
      setError("");
      setStatus("");

      const response = await api.post(apiUrl("/ai/rewrite-answer"), {
        question,
        answer,
        targetRole: window.localStorage.getItem("studentGoal") || "General placement",
        company: (() => {
          try {
            const plannerProfile = JSON.parse(
              window.localStorage.getItem("placementPlannerProfile")
            );
            return plannerProfile?.targetCompanies?.[0] || "";
          } catch {
            return "";
          }
        })()
      });

      setRewriteResult(response.data || null);
      setStatus("Interview answer rewritten.");

      addBookmark({
        id: `rewrite-${question}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: question,
        note: "Saved rewritten interview answer",
        type: "answer",
        source: "revision-center",
        path: "/revision-center"
      });
    } catch (rewriteError) {
      setError(getErrorMessage(rewriteError, "Failed to rewrite your answer."));
    } finally {
      setRewriting(false);
    }
  };

  const handleReminderSave = async () => {
    if (
      reminders.browserNotifications &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      await Notification.requestPermission();
    }

    saveReminderSettings(reminders);
    setStatus("Revision reminders updated.");
  };

  const handleOpenBookmark = (bookmark) => {
    if (bookmark.path) {
      navigate(bookmark.path);
      return;
    }

    setStatus(`Saved note: ${bookmark.title}`);
  };

  const quizScore = currentTrack.mcqs.reduce((score, mcq, index) => {
    return score + (quizAnswers[index] === mcq.correctIndex ? 1 : 0);
  }, 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowStyle}>Revision center</div>
            <h2 style={{ margin: "8px 0" }}>Turn weak areas into repeatable revision routines</h2>
            <p style={mutedStyle}>
              Review fast notes, keep important questions bookmarked, and rewrite interview answers into stronger versions.
            </p>
          </div>
          <div style={metricGridStyle}>
            <MetricCard title="Saved items" value={String(bookmarks.length)} subtitle="Bookmarks and review items" />
            <MetricCard title="Mistakes to revisit" value={String(mistakeCount)} subtitle="Weak areas captured from practice" />
            <MetricCard
              title="Reminder"
              value={reminders.enabled ? reminders.time : "Off"}
              subtitle={dueReminder ? "Due now" : "Daily check-in"}
            />
          </div>
        </div>

        {dueReminder && (
          <div style={alertStyle}>
            <strong>Revision check-in:</strong> {reminders.label} is due now. Review one flashcard set or continue your latest practice flow.
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          {Object.keys(REVISION_LIBRARY).map((track) => (
            <button
              key={track}
              type="button"
              onClick={() => setSelectedTrack(track)}
              style={{
                ...chipButtonStyle,
                background: selectedTrack === track ? "#1d4ed8" : "#eff6ff",
                color: selectedTrack === track ? "#ffffff" : "#1d4ed8"
              }}
            >
              {track}
            </button>
          ))}
          {lastActivity?.path && (
            <button
              type="button"
              onClick={() => navigate(lastActivity.path)}
              style={secondaryButtonStyle}
            >
              Continue: {lastActivity.title}
            </button>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {status && <div style={successStyle}>{status}</div>}
      </section>

      <section style={panelStyle}>
        <div style={sectionTitleStyle}>Flashcards and last-minute notes</div>
        <p style={{ ...mutedStyle, marginTop: 6 }}>Click on a placement round to reveal key points and flashcard concepts.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
          {Object.entries(REVISION_LIBRARY).map(([roundName, data]) => {
            const isRevealed = revealedFlashcards[roundName];
            return (
              <button
                key={roundName}
                type="button"
                onClick={() => toggleFlashcard(roundName)}
                style={{
                  ...flashcardStyle,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  height: "auto",
                  minHeight: "110px",
                }}
              >
                <div style={smallLabelStyle}>{roundName}</div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", marginTop: 8 }}>Important Topics & Key Notes</div>
                {isRevealed ? (
                  <div style={{ marginTop: 12, width: "100%", textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>Important Key Points:</div>
                    <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, lineHeight: 1.6, color: "#10203a" }}>
                      {data.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                    <div style={{ fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>Flashcard Concepts:</div>
                    <ul style={{ margin: "0", paddingLeft: 18, lineHeight: 1.6, color: "#10203a" }}>
                      {data.flashcards.map((fc) => (
                        <li key={fc.prompt} style={{ marginBottom: 4 }}>
                          <strong>{fc.prompt}:</strong> {fc.answer}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ ...mutedStyle, marginTop: 10 }}>
                    Click to reveal notes and key points
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionTitleStyle}>Quick revision quiz</div>
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          {currentTrack.mcqs.map((mcq, index) => (
            <div key={mcq.question} style={taskCardStyle}>
              <div style={{ fontWeight: 700 }}>{mcq.question}</div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {mcq.options.map((option, optionIndex) => {
                  const selected = quizAnswers[index] === optionIndex;
                  const checked = quizAnswers[index] != null;
                  const isCorrect = optionIndex === mcq.correctIndex;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setQuizAnswers((current) => ({
                          ...current,
                          [index]: optionIndex
                        }))
                      }
                      style={{
                        ...quizOptionStyle,
                        background:
                          checked && selected
                            ? isCorrect
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(239,68,68,0.1)"
                            : "#ffffff",
                        borderColor:
                          checked && selected
                            ? isCorrect
                              ? "rgba(34,197,94,0.3)"
                              : "rgba(239,68,68,0.25)"
                            : "#dbe4f0"
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...mutedStyle, marginTop: 16 }}>
          Quiz score: {quizScore}/{currentTrack.mcqs.length}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionTitleStyle}>Saved bookmarks and mistakes</div>
        {bookmarks.length === 0 ? (
          <p style={{ ...mutedStyle, marginTop: 12 }}>
            Your saved questions and weak areas will show up here as you practice.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} style={taskCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={smallLabelStyle}>{bookmark.type}</div>
                    <div style={{ fontWeight: 800, marginTop: 6 }}>{bookmark.title}</div>
                    {bookmark.note && <div style={{ ...mutedStyle, marginTop: 6 }}>{bookmark.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleOpenBookmark(bookmark)} style={secondaryButtonStyle}>
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBookmark(bookmark.id)}
                      style={{ ...secondaryButtonStyle, background: "#7f1d1d" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <div style={sectionTitleStyle}>Interview answer lab</div>
        <p style={{ ...mutedStyle, marginTop: 10 }}>
          Draft your answer, then let the coach rewrite it into a stronger placement-ready response.
        </p>

        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={smallLabelStyle}>Interview question</span>
            <select value={question} onChange={(event) => setQuestion(event.target.value)}>
              {HR_QUESTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={smallLabelStyle}>Your draft answer</span>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write your current answer here..."
              style={textareaStyle}
            />
          </label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={handleRewriteAnswer} disabled={rewriting} style={primaryButtonStyle}>
              {rewriting ? "Rewriting..." : "Rewrite my answer"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/interview-chat")}
              style={secondaryButtonStyle}
            >
              Practice in interview AI
            </button>
          </div>
        </div>

        {rewriteResult && (
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <div style={taskCardStyle}>
              <div style={smallLabelStyle}>Stronger answer</div>
              <div style={{ marginTop: 10, lineHeight: 1.7, color: "#10203a" }}>
                {rewriteResult.rewrittenAnswer}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <ListCard title="Strengths" items={rewriteResult.strengths || []} />
              <ListCard title="Gaps" items={rewriteResult.gaps || []} />
              <ListCard title="Coaching notes" items={rewriteResult.coachingNotes || []} />
            </div>
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <div style={sectionTitleStyle}>Reminder settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={smallLabelStyle}>Reminder label</span>
            <input
              value={reminders.label}
              onChange={(event) =>
                setReminders((current) => ({ ...current, label: event.target.value }))
              }
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={smallLabelStyle}>Reminder time</span>
            <input
              type="time"
              value={reminders.time}
              onChange={(event) =>
                setReminders((current) => ({ ...current, time: event.target.value }))
              }
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 18 }}>
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={reminders.enabled}
              onChange={(event) =>
                setReminders((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            Enable daily reminder
          </label>
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={reminders.browserNotifications}
              onChange={(event) =>
                setReminders((current) => ({
                  ...current,
                  browserNotifications: event.target.checked
                }))
              }
            />
            Use browser notifications
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" onClick={handleReminderSave} style={primaryButtonStyle}>
            Save reminder
          </button>
          <button
            type="button"
            onClick={() =>
              saveLastActivity({
                title: "Revision reminder check-in",
                path: "/revision-center",
                detail: reminders.label,
                section: "revision"
              })
            }
            style={secondaryButtonStyle}
          >
            Set as current focus
          </button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div style={metricCardStyle}>
      <div style={smallLabelStyle}>{title}</div>
      <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div style={{ ...mutedStyle, marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

function ListCard({ title, items }) {
  if (!items?.length) return null;

  return (
    <div style={taskCardStyle}>
      <div style={smallLabelStyle}>{title}</div>
      <ul style={{ margin: "12px 0 0", paddingLeft: 18, lineHeight: 1.6, color: "#10203a" }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const panelStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(148,163,184,0.18)"
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  minWidth: "min(100%, 520px)"
};

const metricCardStyle = {
  borderRadius: 18,
  padding: 16,
  background: "#f8fafc",
  border: "1px solid #dbe4f0"
};

const taskCardStyle = {
  borderRadius: 18,
  padding: 16,
  background: "#ffffff",
  border: "1px solid #dbe4f0"
};

const flashcardStyle = {
  width: "100%",
  marginTop: 0,
  textAlign: "left",
  borderRadius: 18,
  padding: 18,
  background: "linear-gradient(135deg, #ffffff, #eff6ff)",
  border: "1px solid rgba(37,99,235,0.12)",
  cursor: "pointer",
  boxSizing: "border-box",
  overflowWrap: "break-word",
  color: "#0f172a"
};

const quizOptionStyle = {
  width: "100%",
  marginTop: 0,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #dbe4f0",
  background: "#ffffff",
  color: "#10203a",
  textAlign: "left"
};

const textareaStyle = {
  width: "100%",
  minHeight: 140,
  padding: 12,
  borderRadius: 16,
  border: "1px solid #dbe4f0",
  boxSizing: "border-box",
  resize: "vertical"
};

const primaryButtonStyle = {
  width: "auto",
  marginTop: 0,
  padding: "12px 18px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #0f766e, #2563eb)"
};

const secondaryButtonStyle = {
  width: "auto",
  marginTop: 0,
  padding: "12px 18px",
  borderRadius: 14,
  background: "#10203a"
};

const chipButtonStyle = {
  width: "auto",
  marginTop: 0,
  padding: "10px 14px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  fontWeight: 700
};

const alertStyle = {
  marginTop: 16,
  padding: 14,
  borderRadius: 16,
  background: "rgba(245,158,11,0.1)",
  border: "1px solid rgba(245,158,11,0.22)",
  color: "#92400e"
};

const errorStyle = {
  marginTop: 14,
  padding: 12,
  borderRadius: 14,
  background: "rgba(239,68,68,0.08)",
  color: "#b91c1c",
  border: "1px solid rgba(239,68,68,0.16)"
};

const successStyle = {
  marginTop: 14,
  padding: 12,
  borderRadius: 14,
  background: "rgba(34,197,94,0.08)",
  color: "#166534",
  border: "1px solid rgba(34,197,94,0.16)"
};

const toggleLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#10203a"
};

const eyebrowStyle = {
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#5271a7"
};

const smallLabelStyle = {
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#5271a7"
};

const sectionTitleStyle = {
  fontSize: "1.15rem",
  fontWeight: 800
};

const mutedStyle = {
  color: "#5b6c88",
  lineHeight: 1.6
};
