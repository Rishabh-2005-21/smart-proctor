import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg, #f8fbff 0%, #e0ecff 100%)",
        color: "#10203a"
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "rgba(255,255,255,0.9)",
          borderRadius: 28,
          padding: 36,
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)"
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#2563eb" }}>
          Smart Proctor
        </div>
        <h2 style={{ fontSize: "2rem", marginBottom: 12 }}>
          That page could not be found
        </h2>
        <p style={{ color: "#5b6c88", marginBottom: 24 }}>
          The link may be outdated, or the page may require a different role.
        </p>
        <Link to="/" style={{ color: "#1d4ed8", fontWeight: 700 }}>
          Return to login
        </Link>
      </div>
    </div>
  );
}
