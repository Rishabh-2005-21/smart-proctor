import express from "express";
import cors from "cors";
import testRoutes from "./routes/testRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import plannerRoutes from "./routes/planner.routes.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/tests", testRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/planner", plannerRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "smart-proctor-api",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.send("SmartProctor API running");
});

export default app;
