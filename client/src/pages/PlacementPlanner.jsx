import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { apiUrl } from "../config/api";
import { getStoredUser } from "../services/authService";
import { addBookmark, saveLastActivity } from "../services/studentWorkspace";

const PLANNER_STORAGE_KEY = "placementPlannerProfile";
const RESUME_PREP_STORAGE_KEY = "placementResumePrep";

const COMPANY_OPTIONS = [
  "Amazon",
  "Google",
  "TCS NQT",
  "Infosys",
  "Wipro",
  "Capgemini"
];

const splitTags = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseStudentId = (user) => {
  if (!user) return "";
  const directId = user.id || user._id || user.studentId;
  if (directId) return String(directId);
  return user?.name ? user.name.replace(/\s+/g, "-").toLowerCase() : "";
};

const emptyForm = {
  targetRole: "",
  targetCompanies: [],
  timelineWeeks: 8,
  branch: "",
  graduationYear: "",
  targetPackage: "",
  dailyMinutes: 90,
  resumeSummary: "",
  strongestAreasText: "",
  weakestAreasText: "",
  notes: ""
};

export default function PlacementPlanner() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser() || {}, []);
  const studentId = parseStudentId(user);
  const [form, setForm] = useState(emptyForm);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumePrep, setResumePrep] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(RESUME_PREP_STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [generatingResumePrep, setGeneratingResumePrep] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadPlanner = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profileResponse, dashboardResponse] = await Promise.all([
        api.get(apiUrl(`/planner/student/${encodeURIComponent(studentId)}`)),
        api.get(apiUrl(`/planner/dashboard/${encodeURIComponent(studentId)}`))
      ]);

      const profile = profileResponse.data?.profile || dashboardResponse.data?.profile || null;
      setDashboard(dashboardResponse.data || null);

      if (profile) {
        setForm({
          targetRole: profile.targetRole || "",
          targetCompanies: Array.isArray(profile.targetCompanies) ? profile.targetCompanies : [],
          timelineWeeks: profile.timelineWeeks || 8,
          branch: profile.branch || "",
          graduationYear: profile.graduationYear || "",
          targetPackage: profile.targetPackage || "",
          dailyMinutes: profile.dailyMinutes || 90,
          resumeSummary: profile.resumeSummary || "",
          strongestAreasText: (profile.strongestAreas || []).join(", "),
          weakestAreasText: (profile.weakestAreas || []).join(", "),
          notes: profile.notes || ""
        });
        window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(profile));
      } else {
        const existingGoal = window.localStorage.getItem("studentGoal") || "";
        setForm((current) => ({
          ...current,
          targetRole: current.targetRole || existingGoal
        }));
      }
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load placement planner.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanner();
  }, [studentId]);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const toggleCompany = (company) => {
    setForm((current) => ({
      ...current,
      targetCompanies: current.targetCompanies.includes(company)
        ? current.targetCompanies.filter((item) => item !== company)
        : [...current.targetCompanies, company]
    }));
  };

  const handleSave = async () => {
    if (!studentId) {
      setError("Student profile is unavailable. Please log in again.");
      return;
    }

    if (!form.targetRole.trim()) {
      setError("Add a target role before saving your planner.");
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const payload = {
        studentName: user?.name || "",
        studentEmail: user?.email || "",
        targetRole: form.targetRole.trim(),
        targetCompanies: form.targetCompanies,
        timelineWeeks: Number(form.timelineWeeks) || 8,
        branch: form.branch.trim(),
        graduationYear: form.graduationYear.trim(),
        targetPackage: form.targetPackage.trim(),
        dailyMinutes: Number(form.dailyMinutes) || 90,
        resumeSummary: form.resumeSummary.trim(),
        strongestAreas: splitTags(form.strongestAreasText),
        weakestAreas: splitTags(form.weakestAreasText),
        notes: form.notes.trim()
      };

      const response = await api.put(
        apiUrl(`/planner/student/${encodeURIComponent(studentId)}`),
        payload
      );

      window.localStorage.setItem("studentGoal", payload.targetRole);
      window.localStorage.setItem(
        PLANNER_STORAGE_KEY,
        JSON.stringify(response.data?.profile || payload)
      );
      window.dispatchEvent(new Event("planner:updated"));

      await loadPlanner();
      setStatus("Placement planner saved.");
      saveLastActivity({
        title: "Placement planner",
        path: "/placement-planner",
        detail: `Updated target role to ${payload.targetRole}`,
        section: "planner"
      });
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Failed to save placement planner.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateResumePrep = async () => {
    const resumeText = form.resumeSummary.trim();

    if (!resumeText) {
      setError("Add a resume summary or project background first.");
      return;
    }

    setGeneratingResumePrep(true);
    setError("");
    setStatus("");

    try {
      const response = await api.post(apiUrl("/ai/resume-questions"), {
        resumeText,
        targetRole: form.targetRole.trim(),
        companies: form.targetCompanies
      });
      setResumePrep(response.data || null);
      window.localStorage.setItem(
        RESUME_PREP_STORAGE_KEY,
        JSON.stringify(response.data || null)
      );
      setStatus("Resume-based prep questions generated.");
      saveLastActivity({
        title: "Resume prep",
        path: "/placement-planner",
        detail: "Generated targeted resume questions",
        section: "planner"
      });

      if (response.data?.companyQuestions?.length) {
        addBookmark({
          id: `resume-prep-${form.targetRole || "general"}`,
          title: `${form.targetRole || "Placement"} resume prep`,
          note: "Company-specific interview questions saved.",
          type: "question-set",
          source: "placement-planner",
          path: "/placement-planner"
        });
      }
    } catch (resumeError) {
      setError(
        resumeError?.response?.data?.message ||
          "Failed to generate resume-based prep questions."
      );
    } finally {
      setGeneratingResumePrep(false);
    }
  };

  const handleResumeFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const trimmed = text.trim();

      if (!trimmed) {
        setError("The selected file does not contain readable text.");
        return;
      }

      setResumeFileName(file.name);
      setForm((current) => ({
        ...current,
        resumeSummary: trimmed
      }));
      setStatus(`Loaded resume text from ${file.name}.`);
      setError("");
    } catch {
      setError("Could not read that file. Upload a text-based resume extract.");
    } finally {
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <h2>Loading placement planner...</h2>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowStyle}>Placement planner</div>
            <h2 style={{ margin: "8px 0" }}>Build a focused placement strategy</h2>
            <p style={mutedStyle}>
              Capture your target role, companies, timeline, and strengths so the app can guide your daily preparation with more context.
            </p>
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={smallLabelStyle}>Student</div>
            <div style={{ fontWeight: 700 }}>{user?.name || "Student"}</div>
            <div style={mutedStyle}>{user?.email || "No email available"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 18 }}>
          <Field label="Target role">
            <input
              value={form.targetRole}
              onChange={(event) => handleChange("targetRole", event.target.value)}
              placeholder="Frontend developer, SDE, Data analyst..."
            />
          </Field>
          <Field label="Timeline (weeks)">
            <input
              type="number"
              min="1"
              max="52"
              value={form.timelineWeeks}
              onChange={(event) => handleChange("timelineWeeks", event.target.value)}
            />
          </Field>
          <Field label="Branch">
            <input
              value={form.branch}
              onChange={(event) => handleChange("branch", event.target.value)}
              placeholder="CSE, IT, ECE..."
            />
          </Field>
          <Field label="Graduation year">
            <input
              value={form.graduationYear}
              onChange={(event) => handleChange("graduationYear", event.target.value)}
              placeholder="2026"
            />
          </Field>
          <Field label="Target package">
            <input
              value={form.targetPackage}
              onChange={(event) => handleChange("targetPackage", event.target.value)}
              placeholder="6 LPA+, 10 LPA+, Internship"
            />
          </Field>
          <Field label="Daily study time (minutes)">
            <input
              type="number"
              min="15"
              max="600"
              value={form.dailyMinutes}
              onChange={(event) => handleChange("dailyMinutes", event.target.value)}
            />
          </Field>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={smallLabelStyle}>Target companies</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {COMPANY_OPTIONS.map((company) => {
              const active = form.targetCompanies.includes(company);

              return (
                <button
                  key={company}
                  type="button"
                  onClick={() => toggleCompany(company)}
                  style={{
                    width: "auto",
                    marginTop: 0,
                    padding: "10px 14px",
                    borderRadius: 999,
                    background: active ? "#1d4ed8" : "#eff6ff",
                    color: active ? "#ffffff" : "#1d4ed8"
                  }}
                >
                  {company}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <Field label="Strongest areas">
            <input
              value={form.strongestAreasText}
              onChange={(event) => handleChange("strongestAreasText", event.target.value)}
              placeholder="React, communication, SQL"
            />
          </Field>
          <Field label="Weakest areas">
            <input
              value={form.weakestAreasText}
              onChange={(event) => handleChange("weakestAreasText", event.target.value)}
              placeholder="Aptitude speed, recursion, HR confidence"
            />
          </Field>
          <Field label="Resume summary or key experience">
            <textarea
              value={form.resumeSummary}
              onChange={(event) => handleChange("resumeSummary", event.target.value)}
              placeholder="Add internships, projects, skills, achievements, and responsibilities..."
              style={textareaStyle}
            />
          </Field>
          <Field label="Upload resume text extract">
            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="file"
                accept=".txt,.md,.json,.csv,text/plain"
                onChange={handleResumeFileUpload}
              />
              <div style={mutedStyle}>
                Upload a text version of your resume if you do not want to paste it manually.
                {resumeFileName ? ` Current file: ${resumeFileName}.` : ""}
              </div>
            </div>
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              placeholder="Any extra constraints, placement deadlines, or personal goals"
              style={textareaStyle}
            />
          </Field>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {status && <div style={successStyle}>{status}</div>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" onClick={handleSave} disabled={saving} style={primaryButtonStyle}>
            {saving ? "Saving..." : "Save placement planner"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/student-roadmap")}
            style={secondaryButtonStyle}
          >
            Open roadmap
          </button>
          <button
            type="button"
            onClick={() => navigate("/interview-prep")}
            style={secondaryButtonStyle}
          >
            Go to practice
          </button>
        </div>
      </section>

      {dashboard && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <MetricCard title="Overall readiness" value={`${dashboard.readiness?.overall || 0}/100`} subtitle="Combined from tests, practice, and consistency" />
            <MetricCard title="Target timeline" value={`${dashboard.profile?.timelineWeeks || 8} weeks`} subtitle="Preparation window currently planned" />
            <MetricCard title="Daily commitment" value={`${dashboard.profile?.dailyMinutes || 90} min`} subtitle="Study budget you set for yourself" />
            <MetricCard title="Latest test" value={dashboard.latestAttempt?.testTitle || "No test yet"} subtitle="Most recent proctored or generated attempt" />
            <MetricCard title="Activity streak" value={`${dashboard.consistency?.streakDays || 0} days`} subtitle="Consecutive active preparation days" />
            <MetricCard title="Sessions this week" value={`${dashboard.consistency?.sessionsLast7Days || 0}`} subtitle="Unique practice days in the last 7 days" />
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Daily action plan</div>
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {(dashboard.dailyPlan || []).map((item, index) => (
                <div key={`${item.title}-${index}`} style={taskCardStyle}>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <div style={{ color: "#1d4ed8", fontWeight: 700, marginTop: 4 }}>{item.duration}</div>
                  <div style={mutedStyle}>{item.detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Placement readiness breakdown</div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {(dashboard.readiness?.categories || []).map((category) => (
                <div key={category.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                    <span>{category.label}</span>
                    <strong>{category.score}%</strong>
                  </div>
                  <div style={progressTrackStyle}>
                    <div
                      style={{
                        ...progressFillStyle,
                        width: `${Math.max(0, Math.min(100, category.score || 0))}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Topic mastery map</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
              {(dashboard.topicMastery || []).slice(0, 12).map((topic) => (
                <div key={topic.topic} style={taskCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{topic.topic}</strong>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          topic.status === "strong"
                            ? "#166534"
                            : topic.status === "improving"
                              ? "#92400e"
                              : "#b91c1c"
                      }}
                    >
                      {topic.status}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: "1.3rem", fontWeight: 800 }}>{topic.score}%</div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Company preparation tracks</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 16 }}>
              {(dashboard.companyPlans || []).map((plan) => (
                <div key={plan.company} style={taskCardStyle}>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{plan.company}</div>
                  <div style={{ marginTop: 10 }}>
                    <div style={smallLabelStyle}>Typical rounds</div>
                    <div style={chipWrapStyle}>
                      {plan.rounds.map((round) => (
                        <span key={round} style={chipStyle}>{round}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={smallLabelStyle}>Focus areas</div>
                    <div style={chipWrapStyle}>
                      {plan.focusAreas.map((area) => (
                        <span key={area} style={chipStyle}>{area}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={smallLabelStyle}>Recommended tests</div>
                    <div style={chipWrapStyle}>
                      {(plan.recommendedTests || []).map((testId) => (
                        <button
                          key={testId}
                          type="button"
                          onClick={() => navigate("/interview-prep")}
                          style={{
                            ...chipStyle,
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          {testId.replace(/-/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Milestones</div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {(dashboard.milestones || []).map((milestone) => (
                <div key={milestone.title} style={taskCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{milestone.title}</strong>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          milestone.status === "completed"
                            ? "#166534"
                            : milestone.status === "in-progress"
                              ? "#92400e"
                              : "#1d4ed8"
                      }}
                    >
                      {milestone.status}
                    </span>
                  </div>
                  <div style={{ ...mutedStyle, marginTop: 6 }}>{milestone.detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={sectionTitleStyle}>Resume-based interview prep</div>
                <div style={mutedStyle}>
                  Generate tailored skill, project, and HR questions from your saved resume summary.
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateResumePrep}
                disabled={generatingResumePrep}
                style={primaryButtonStyle}
              >
                {generatingResumePrep ? "Generating..." : "Generate resume prep"}
              </button>
            </div>

            {resumePrep && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 18 }}>
                {resumePrep.elevatorPitch && (
                  <div style={{ ...taskCardStyle, gridColumn: "1 / -1" }}>
                    <div style={smallLabelStyle}>60-second introduction</div>
                    <div style={{ marginTop: 10, color: "#10203a", lineHeight: 1.6 }}>
                      {resumePrep.elevatorPitch}
                    </div>
                  </div>
                )}
                <QuestionGroup title="Priority skills" items={resumePrep.prioritySkills || []} />
                <QuestionGroup title="Project stories" items={resumePrep.projectStories || []} />
                <QuestionGroup title="Skill questions" items={resumePrep.skillBasedQuestions || []} />
                <QuestionGroup title="Project questions" items={resumePrep.projectBasedQuestions || []} />
                <QuestionGroup title="Interview questions" items={resumePrep.interviewQuestions || []} />
                <QuestionGroup title="Impact bullet tips" items={resumePrep.impactBulletTips || []} />
                {(resumePrep.companyQuestions || []).map((companyBlock) => (
                  <QuestionGroup
                    key={companyBlock.company}
                    title={`${companyBlock.company} questions`}
                    items={companyBlock.questions || []}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={smallLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div style={panelStyle}>
      <div style={smallLabelStyle}>{title}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div style={{ ...mutedStyle, marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

function QuestionGroup({ title, items }) {
  if (!items?.length) return null;

  return (
    <div style={taskCardStyle}>
      <div style={smallLabelStyle}>{title}</div>
      <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#10203a", lineHeight: 1.5 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const panelStyle = {
  background: "rgba(255,255,255,0.9)",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(148,163,184,0.18)"
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
  fontSize: "1.2rem",
  fontWeight: 800
};

const mutedStyle = {
  color: "#5b6c88",
  lineHeight: 1.5
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

const taskCardStyle = {
  border: "1px solid #dbe4f0",
  borderRadius: 18,
  padding: 16,
  background: "#ffffff"
};

const progressTrackStyle = {
  height: 10,
  borderRadius: 999,
  background: "#e2e8f0",
  overflow: "hidden"
};

const progressFillStyle = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #0f766e, #2563eb)"
};

const chipWrapStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 8
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: "0.84rem"
};

const textareaStyle = {
  width: "100%",
  minHeight: 100,
  padding: 12,
  borderRadius: 16,
  border: "1px solid #dbe4f0",
  boxSizing: "border-box",
  resize: "vertical"
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
