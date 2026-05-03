import StudentCard from "./StudentCard";

const mockStudents = [
  {
    id: 1,
    name: "Aman Verma",
    violations: 0,
    status: "Active"
  },
  {
    id: 2,
    name: "Riya Sharma",
    violations: 2,
    status: "Active"
  },
  {
    id: 3,
    name: "Karan Patel",
    violations: 4,
    status: "Disconnected"
  }
];

export default function LiveMonitor() {
  return (
    <div style={{ padding: "30px" }}>
      <h2>Live Student Monitor</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {mockStudents.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
}
