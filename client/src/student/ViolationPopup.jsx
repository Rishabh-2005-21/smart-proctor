export default function ViolationPopup({ show, onClose }) {
  if (!show) return null;

  return (
    <div style={overlay}>
      <div style={popup}>
        <h3>⚠ Violation Detected</h3>
        <p>Tab switching or exiting fullscreen is not allowed.</p>
        <button onClick={onClose}>Return to Quiz</button>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999
};

const popup = {
  background: "#fff",
  padding: "25px",
  borderRadius: "10px",
  textAlign: "center",
  width: "300px"
};
