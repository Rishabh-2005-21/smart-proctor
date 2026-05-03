export default function RiskIndicator({ count }) {
  let color = "green";
  let label = "Low Risk";

  if (count >= 3) {
    color = "red";
    label = "High Risk";
  } else if (count >= 1) {
    color = "orange";
    label = "Medium Risk";
  }

  return (
    <div style={{ marginTop: "10px", color }}>
      <strong>{label}</strong>
    </div>
  );
}
