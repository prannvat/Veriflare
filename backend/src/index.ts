import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { buildRoutes } from "./routes/builds";
import { jobRoutes } from "./routes/jobs";
import { fdcRoutes } from "./routes/fdc";
import { githubRoutes } from "./routes/github";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/builds", buildRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/fdc", fdcRoutes);
app.use("/api/github", githubRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║          VERIFLARE BACKEND SERVER             ║
╠═══════════════════════════════════════════════╣
║  Status: Running                              ║
║  Port:   ${PORT}                                  ║
║  Mode:   ${process.env.NODE_ENV || "development"}                          ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
