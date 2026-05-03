import { useMemo, useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { apiUrl } from "../config/api";
import { getStoredUser } from "../services/authService";
import { addBookmark, saveLastActivity } from "../services/studentWorkspace";

const TOPICS = [
  "arrays / strings / basic algorithms",
  "hash maps and sets",
  "recursion and backtracking",
  "dynamic programming",
  "graphs and trees"
];

const LANGUAGE_OPTIONS = ["JavaScript", "Python", "C++", "Java"];

const getStarterCode = (problem, language) =>
  problem?.starterCode?.[language] || "";

const parseStudentId = (user) => {
  if (!user) return "";
  const directId = user.id || user._id || user.studentId;
  if (directId) return String(directId);
  return user?.name ? user.name.replace(/\s+/g, "-").toLowerCase() : "";
};

export default function CodingChallenges() {
  const user = useMemo(() => getStoredUser() || {}, []);
  const studentId = parseStudentId(user);
  const studentName = user?.name || "Student";

  const [problem, setProblem] = useState(null);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [workingMode, setWorkingMode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fetchProblem = async () => {
    try {
      setLoadingProblem(true);
      setProblem(null);
      setRunResult(null);
      setSubmitResult(null);
      setError("");
      setStatus("");

      const response = await api.post(apiUrl("/ai/coding-problem"), {
        difficulty,
        topic
      });

      setProblem(response.data || null);
      setCode(getStarterCode(response.data, language));
      saveLastActivity({
        title: response.data?.title || "Coding challenge",
        path: "/coding-challenges",
        detail: `${difficulty} • ${topic}`,
        section: "coding"
      });
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Failed to generate coding problem."));
    } finally {
      setLoadingProblem(false);
    }
  };

  const handleLanguageChange = (selectedLanguage) => {
    const previousStarter = getStarterCode(problem, language);
    const nextStarter = getStarterCode(problem, selectedLanguage);

    setLanguage(selectedLanguage);
    setCode((currentCode) =>
      !currentCode.trim() || currentCode === previousStarter ? nextStarter : currentCode
    );
  };

  const saveCodingProgress = async (result) => {
    if (!studentId || !problem || !result) {
      return;
    }

    const passRate = Number(result.passRate ?? (result.passed ? 100 : 45)) || 0;
    const payload = {
      studentId,
      studentName,
      testType: "technical",
      companyOrCategory: `Coding Arena: ${problem.title}`,
      skillScores: [
        {
          name: problem.topic || topic,
          score: passRate,
          maxScore: 100
        }
      ],
      overallScore: passRate,
      strengths: result.passed
        ? [
            `Solved ${problem.title}`,
            `Handled ${result.totalTests || 0} submission tests successfully`
          ]
        : [`Working on ${problem.topic || topic}`],
      weaknesses: result.passed
        ? []
        : [
            problem.topic || topic,
            ...(result.issues || []).slice(0, 1)
          ].filter(Boolean),
      recommendedCourseIds: [],
      recommendedCourseNames: (result.suggestions || []).slice(0, 2)
    };

    try {
      await api.post(apiUrl("/progress"), payload);
    } catch {
      // Progress logging should not block practice feedback.
    }
  };

  const handleEvaluate = async (runMode) => {
    if (!problem || !code.trim()) {
      setError("Generate a challenge and add your solution first.");
      return;
    }

    try {
      setWorkingMode(runMode);
      setError("");
      setStatus("");

      const response = await api.post(apiUrl("/ai/code-eval"), {
        problem,
        code,
        language,
        runMode
      });

      if (runMode === "public") {
        setRunResult(response.data || null);
        setStatus(
          response.data?.executionMode === "javascript-runner"
            ? "Public tests executed."
            : "AI review completed."
        );
      } else {
        setSubmitResult(response.data || null);
        setStatus(
          response.data?.executionMode === "javascript-runner"
            ? "Submission tests executed and progress updated."
            : "Submission review completed."
        );
        await saveCodingProgress(response.data || null);
        saveLastActivity({
          title: problem.title,
          path: "/coding-challenges",
          detail: response.data?.passed
            ? "Solved submission tests"
            : "Needs revision on submission tests",
          section: "coding"
        });

        if (!response.data?.passed) {
          addBookmark({
            id: `coding-mistake-${problem.id}`,
            title: problem.title,
            note: (response.data?.issues || [])[0] || "Review this coding challenge again.",
            type: "mistake",
            source: "coding-arena",
            path: "/coding-challenges"
          });
        }
      }
    } catch (evaluationError) {
      setError(getErrorMessage(evaluationError, "Failed to evaluate your solution."));
    } finally {
      setWorkingMode("");
    }
  };

  return (
    <div style={pageStyle}>
      <section style={panelStyle}>
        <div style={headerWrapStyle}>
          <div>
            <div style={eyebrowStyle}>Coding arena</div>
            <h2 style={{ margin: "8px 0" }}>Practice with runnable interview challenges</h2>
            <p style={mutedStyle}>
              Generate a structured challenge, code in the built-in editor, run public tests,
              then submit for a deeper review. JavaScript supports live execution today.
            </p>
          </div>
          <div style={profileCardStyle}>
            <div style={smallLabelStyle}>Candidate</div>
            <div style={{ fontWeight: 800 }}>{studentName}</div>
            <div style={mutedStyle}>{problem?.topic || topic}</div>
          </div>
        </div>

        <div style={controlsGridStyle}>
          <Field label="Difficulty">
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>

          <Field label="Topic">
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              {TOPICS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language">
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <button
            type="button"
            onClick={fetchProblem}
            disabled={loadingProblem}
            style={primaryButtonStyle}
          >
            {loadingProblem ? "Generating problem..." : "Generate coding problem"}
          </button>
          {problem && (
            <button
              type="button"
              onClick={() => setCode(getStarterCode(problem, language))}
              style={secondaryButtonStyle}
            >
              Reset starter code
            </button>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {status && <div style={successStyle}>{status}</div>}
      </section>

      {problem && (
        <>
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={smallLabelStyle}>
                  {problem.difficulty} challenge
                </div>
                <h3 style={{ margin: "8px 0" }}>{problem.title}</h3>
              </div>
              <div style={chipWrapStyle}>
                <span style={chipStyle}>{problem.topic}</span>
                <span style={chipStyle}>{problem.functionName}()</span>
                <button
                  type="button"
                  onClick={() =>
                    addBookmark({
                      id: `coding-${problem.id}`,
                      title: problem.title,
                      note: `${problem.topic} • ${problem.difficulty}`,
                      type: "challenge",
                      source: "coding-arena",
                      path: "/coding-challenges"
                    })
                  }
                  style={{ ...chipStyle, border: "none", cursor: "pointer" }}
                >
                  Save for revision
                </button>
              </div>
            </div>

            <p style={{ ...mutedStyle, marginTop: 10 }}>{problem.description}</p>

            <div style={problemGridStyle}>
              <InfoCard title="Function signature">
                <code>
                  {problem.functionName}
                  ({(problem.parameters || []).join(", ")})
                </code>
              </InfoCard>
              <InfoCard title="Input format">{problem.inputFormat}</InfoCard>
              <InfoCard title="Output format">{problem.outputFormat}</InfoCard>
            </div>

            {Array.isArray(problem.constraints) && problem.constraints.length > 0 && (
              <InfoList title="Constraints" items={problem.constraints} />
            )}

            {Array.isArray(problem.hints) && problem.hints.length > 0 && (
              <InfoList title="Approach hints" items={problem.hints} />
            )}

            {Array.isArray(problem.publicTests) && problem.publicTests.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={sectionTitleStyle}>Public tests</div>
                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  {problem.publicTests.map((testCase, index) => (
                    <div key={`public-test-${index}`} style={testCardStyle}>
                      <div style={{ fontWeight: 700 }}>Test {index + 1}</div>
                      <div style={{ ...mutedStyle, marginTop: 6 }}>
                        <strong>Input:</strong> {JSON.stringify(testCase.input)}
                      </div>
                      <div style={mutedStyle}>
                        <strong>Expected:</strong> {JSON.stringify(testCase.expected)}
                      </div>
                      {testCase.explanation && (
                        <div style={mutedStyle}>
                          <strong>Why:</strong> {testCase.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={sectionTitleStyle}>Your solution</div>
                <div style={mutedStyle}>
                  {language === "JavaScript"
                    ? "Run public tests instantly, then submit to execute the full submission suite."
                    : "Live execution currently supports JavaScript. Other languages fall back to AI review."}
                </div>
              </div>
              <div style={chipWrapStyle}>
                <span style={chipStyle}>{language}</span>
              </div>
            </div>

            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="// Write your solution here"
              style={editorStyle}
            />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => handleEvaluate("public")}
                disabled={workingMode === "public" || language !== "JavaScript"}
                style={primaryButtonStyle}
              >
                {workingMode === "public" ? "Running..." : "Run public tests"}
              </button>
              <button
                type="button"
                onClick={() => handleEvaluate("all")}
                disabled={workingMode === "all"}
                style={secondaryButtonStyle}
              >
                {workingMode === "all"
                  ? language === "JavaScript"
                    ? "Submitting..."
                    : "Reviewing..."
                  : language === "JavaScript"
                    ? "Submit solution"
                    : "Get AI review"}
              </button>
            </div>
          </section>

          {runResult && (
            <section style={panelStyle}>
              <div style={sectionTitleStyle}>Public test results</div>
              <ResultSummary result={runResult} />
            </section>
          )}

          {submitResult && (
            <section style={panelStyle}>
              <div style={sectionTitleStyle}>
                {submitResult.executionMode === "javascript-runner"
                  ? "Submission review"
                  : "AI review"}
              </div>
              <ResultSummary result={submitResult} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ResultSummary({ result }) {
  return (
    <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
      <div style={resultHeroStyle}>
        <div style={smallLabelStyle}>
          {result.executionMode === "javascript-runner" ? "Pass rate" : "Review summary"}
        </div>
        <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>
          {result.executionMode === "javascript-runner"
            ? `${result.passRate || 0}%`
            : result.passed
              ? "Strong"
              : "Needs work"}
        </div>
        <div style={{ ...mutedStyle, marginTop: 8 }}>{result.summary}</div>
      </div>

      {(result.timeComplexity || result.spaceComplexity || result.edgeCaseCoverage) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <InfoCard title="Time complexity">{result.timeComplexity || "Not estimated"}</InfoCard>
          <InfoCard title="Space complexity">{result.spaceComplexity || "Not estimated"}</InfoCard>
          <InfoCard title="Edge case coverage">{result.edgeCaseCoverage || "medium"}</InfoCard>
        </div>
      )}

      {Array.isArray(result.testResults) && result.testResults.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {result.testResults.map((testCase) => (
            <div
              key={`${testCase.label}-${testCase.visibility}`}
              style={{
                ...testCardStyle,
                borderColor: testCase.passed ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.2)",
                background: testCase.passed ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>
                  {testCase.label} • {testCase.visibility}
                </strong>
                <span style={{ fontWeight: 700, color: testCase.passed ? "#166534" : "#b91c1c" }}>
                  {testCase.passed ? "Passed" : "Failed"}
                </span>
              </div>
              <div style={{ ...mutedStyle, marginTop: 6 }}>
                <strong>Input:</strong> {testCase.input}
              </div>
              <div style={mutedStyle}>
                <strong>Expected:</strong> {testCase.expected}
              </div>
              <div style={mutedStyle}>
                <strong>Received:</strong> {testCase.received}
              </div>
              <div style={mutedStyle}>
                <strong>Runtime:</strong> {testCase.runtimeMs || 0} ms
              </div>
              {testCase.error && (
                <div style={{ ...mutedStyle, color: "#b91c1c" }}>
                  <strong>Error:</strong> {testCase.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {Array.isArray(result.issues) && result.issues.length > 0 && (
        <InfoList title="Issues" items={result.issues} />
      )}

      {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
        <InfoList title="Suggestions" items={result.suggestions} />
      )}

      {Array.isArray(result.nextStepPlan) && result.nextStepPlan.length > 0 && (
        <InfoList title="Next step plan" items={result.nextStepPlan} />
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

function InfoCard({ title, children }) {
  return (
    <div style={infoCardStyle}>
      <div style={smallLabelStyle}>{title}</div>
      <div style={{ marginTop: 10, color: "#10203a", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function InfoList({ title, items }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={sectionTitleStyle}>{title}</div>
      <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#10203a", lineHeight: 1.6 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const pageStyle = {
  display: "grid",
  gap: 20
};

const panelStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 28,
  padding: 24,
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(148,163,184,0.18)"
};

const headerWrapStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap"
};

const profileCardStyle = {
  minWidth: 220,
  padding: 16,
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid #dbe4f0"
};

const controlsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 18
};

const problemGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 16
};

const infoCardStyle = {
  borderRadius: 18,
  border: "1px solid #dbe4f0",
  padding: 16,
  background: "#ffffff"
};

const testCardStyle = {
  borderRadius: 18,
  border: "1px solid #dbe4f0",
  padding: 16,
  background: "#ffffff"
};

const editorStyle = {
  width: "100%",
  minHeight: 280,
  fontFamily: "Consolas, Monaco, monospace",
  fontSize: "0.92rem",
  padding: 14,
  borderRadius: 18,
  border: "1px solid #dbe4f0",
  boxSizing: "border-box",
  marginTop: 16,
  resize: "vertical"
};

const resultHeroStyle = {
  borderRadius: 20,
  padding: 18,
  background: "#eff6ff",
  color: "#1d4ed8"
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

const chipWrapStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
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
