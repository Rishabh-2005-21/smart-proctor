import RiskIndicator from "./RiskIndicator";

export default function StudentCard({ student }) {
  return (
    <div style={card}>
      <h4>{student.name}</h4>
      <p>Status: {student.status}</p>
      <p>Violations: {student.violations}</p>

      <RiskIndicator count={student.violations} />
    </div>
  );
}

const card = {
  width: "220px",
  padding: "15px",
  borderRadius: "10px",
  background: "#f9f9f9",
  boxShadow: "0 5px 10px rgba(0,0,0,0.15)"
};
