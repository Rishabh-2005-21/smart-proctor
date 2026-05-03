export default function DashboardGuideModal({
  isOpen,
  loading = false,
  guide = null,
  onClose,
  onRefresh,
  secondaryActionLabel,
  onSecondaryAction,
  accent = "#2563eb",
  background = "#ffffff",
  textColor = "#0f172a",
  mutedColor = "#64748b",
  primaryLabel = "Start Exploring"
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(8px)"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "28px",
          background,
          color: textColor,
          boxShadow: "0 30px 80px rgba(15, 23, 42, 0.35)",
          border: `1px solid ${accent}22`
        }}
      >
        <div
          style={{
            padding: "28px 32px 20px",
            borderBottom: `1px solid ${accent}22`,
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start"
          }}
        >
          <div>
            <div
              style={{
                color: accent,
                fontSize: "0.78rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "10px"
              }}
            >
              AI Dashboard Guide
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.7rem",
                lineHeight: 1.2
              }}
            >
              {loading ? "Preparing your walkthrough..." : guide?.headline || "Dashboard Guide"}
            </h2>
            <p
              style={{
                margin: "12px 0 0",
                color: mutedColor,
                lineHeight: 1.6
              }}
            >
              {loading
                ? "The AI is putting together a role-specific guide for this dashboard."
                : guide?.intro || "A guided overview of the most important controls on this page."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: mutedColor,
              cursor: "pointer",
              fontSize: "1.4rem",
              lineHeight: 1
            }}
            aria-label="Close dashboard guide"
          >
            x
          </button>
        </div>

        <div style={{ padding: "28px 32px" }}>
          {loading ? (
            <div
              style={{
                padding: "28px",
                borderRadius: "20px",
                background: `${accent}10`,
                color: mutedColor,
                lineHeight: 1.7
              }}
            >
              Generating a guided walkthrough tailored to this dashboard.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: "16px" }}>
                {(guide?.sections || []).map((section) => (
                  <section
                    key={section.title}
                    style={{
                      padding: "18px 20px",
                      borderRadius: "18px",
                      background: `${accent}0d`,
                      border: `1px solid ${accent}18`
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        color: accent
                      }}
                    >
                      {section.title}
                    </h3>
                    <p
                      style={{
                        margin: "10px 0 0",
                        color: mutedColor,
                        lineHeight: 1.7
                      }}
                    >
                      {section.body}
                    </p>
                  </section>
                ))}
              </div>

              {Array.isArray(guide?.nextActions) && guide.nextActions.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "12px"
                    }}
                  >
                    Start Here
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {guide.nextActions.map((action) => (
                      <div
                        key={action}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "14px",
                          background: `${accent}12`,
                          color: textColor,
                          lineHeight: 1.5
                        }}
                      >
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          style={{
            padding: "0 32px 28px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                border: `1px solid ${accent}`,
                background: "transparent",
                color: accent,
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              {secondaryActionLabel}
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                border: `1px solid ${accent}`,
                background: "transparent",
                color: accent,
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              Refresh Guide
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              border: "none",
              background: accent,
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
