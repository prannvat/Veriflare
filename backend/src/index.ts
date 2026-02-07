import "./env"; // Load environment variables before anything else
import express from "express";
import cors from "cors";
import path from "path";
import { buildRoutes } from "./routes/builds";
import { jobRoutes } from "./routes/jobs";
import { fdcRoutes } from "./routes/fdc";
import { githubRoutes } from "./routes/github";
import { authRoutes } from "./routes/auth";

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
app.use("/api/auth", authRoutes);

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
  const hasFdcKey = !!(process.env.FDC_SUBMITTER_PRIVATE_KEY && process.env.FDC_SUBMITTER_PRIVATE_KEY.length > 10);
  const hasGithubToken = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.length > 5);

  // Derive wallet address for display
  let walletAddr = "n/a";
  if (hasFdcKey) {
    try {
      const { ethers } = require("ethers");
      const k = process.env.FDC_SUBMITTER_PRIVATE_KEY!;
      walletAddr = new ethers.Wallet(k.startsWith("0x") ? k : "0x" + k).address;
    } catch {}
  }
  
  console.log(`
╔═══════════════════════════════════════════════════════╗
║            VERIFLARE BACKEND SERVER                   ║
╠═══════════════════════════════════════════════════════╣
║  Status:    Running                                   ║
║  Port:      ${String(PORT).padEnd(42)}║
║  Mode:      ${(process.env.NODE_ENV || "development").padEnd(42)}║
║  FDC Key:   ${hasFdcKey ? "✅ Configured" : "❌ MISSING — FDC attestations will fail!"}${hasFdcKey ? "                             " : ""}║
║  Wallet:    ${walletAddr.padEnd(42)}║
║  GitHub:    ${hasGithubToken ? "✅ Token set" : "⚠️  No token (rate-limited to 60 req/hr)"}${hasGithubToken ? "                              " : ""}║
║  Contract:  ${(process.env.ESCROW_CONTRACT_ADDRESS || "not set").padEnd(42)}║
╚═══════════════════════════════════════════════════════╝
  `);

  if (!hasFdcKey) {
    console.warn("\n⚠️  WARNING: FDC_SUBMITTER_PRIVATE_KEY is not set in .env");
    console.warn("   The backend cannot submit attestation requests to FdcHub without a funded wallet.");
    console.warn("   1. Generate a wallet: node -e \"console.log(require('ethers').Wallet.createRandom().privateKey)\"");
    console.warn("   2. Fund it with C2FLR: https://faucet.flare.network/coston2");
    console.warn("   3. Add the private key to backend/.env\n");
  }
});

export default app;
