import { Router } from "express";
import { FDCService } from "../services/fdc";

const router = Router();
const fdcService = new FDCService();

// ═══════════════════════════════════════════════════════════════
//   Real FDC attestation endpoints
//
//   Full flow (frontend orchestrates):
//     1. POST /prepare-commit   → get abiEncodedRequest + attestationId
//     2. POST /submit           → submit to FdcHub on-chain
//     3. POST /wait             → poll until round finalizes
//     4. POST /proof            → fetch Merkle proof from DA Layer
//
//   Or single-step:
//     POST /attest-commit       → runs all 4 steps in one call
//     POST /attest-gist         → runs all 4 steps for identity linking
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/fdc/prepare-commit
 * Step 1: Prepare attestation request via verifier server
 */
router.post("/prepare-commit", async (req, res) => {
  try {
    const { repoFullName, commitSha } = req.body;
    if (!repoFullName || !commitSha) {
      return res.status(400).json({ error: "Missing repoFullName or commitSha" });
    }

    const result = await fdcService.prepareCommitAttestation(repoFullName, commitSha);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Prepare commit attestation error:", error);
    res.status(500).json({ error: error.message || "Failed to prepare attestation" });
  }
});

/**
 * POST /api/fdc/prepare-gist
 * Step 1: Prepare attestation request for gist identity linking
 */
router.post("/prepare-gist", async (req, res) => {
  try {
    const { gistId } = req.body;
    if (!gistId) {
      return res.status(400).json({ error: "Missing gistId" });
    }

    const result = await fdcService.prepareGistAttestation(gistId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Prepare gist attestation error:", error);
    res.status(500).json({ error: error.message || "Failed to prepare attestation" });
  }
});

/**
 * POST /api/fdc/submit
 * Step 2: Submit attestation request to FdcHub on-chain
 */
router.post("/submit", async (req, res) => {
  try {
    const { abiEncodedRequest, attestationId } = req.body;
    if (!abiEncodedRequest || !attestationId) {
      return res.status(400).json({ error: "Missing abiEncodedRequest or attestationId" });
    }

    const result = await fdcService.submitAttestationRequest(abiEncodedRequest, attestationId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Submit attestation error:", error);
    res.status(500).json({ error: error.message || "Failed to submit attestation" });
  }
});

/**
 * POST /api/fdc/wait
 * Step 3: Wait for voting round finalization
 */
router.post("/wait", async (req, res) => {
  try {
    const { votingRound, attestationId } = req.body;
    if (votingRound === undefined || !attestationId) {
      return res.status(400).json({ error: "Missing votingRound or attestationId" });
    }

    const finalized = await fdcService.waitForRoundFinalization(votingRound, attestationId);
    res.json({ success: true, finalized });
  } catch (error: any) {
    console.error("Wait for finalization error:", error);
    res.status(500).json({ error: error.message || "Failed waiting for finalization" });
  }
});

/**
 * POST /api/fdc/proof
 * Step 4: Fetch Merkle proof from DA Layer
 */
router.post("/proof", async (req, res) => {
  try {
    const { abiEncodedRequest, votingRound, attestationId } = req.body;
    if (!abiEncodedRequest || votingRound === undefined || !attestationId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const proof = await fdcService.fetchProof(abiEncodedRequest, votingRound, attestationId);
    res.json({ success: true, proof });
  } catch (error: any) {
    console.error("Fetch proof error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch proof" });
  }
});

/**
 * POST /api/fdc/attest-commit
 * Full pipeline: prepare → submit → wait → proof (single call)
 */
router.post("/attest-commit", async (req, res) => {
  try {
    const { repoFullName, commitSha } = req.body;
    if (!repoFullName || !commitSha) {
      return res.status(400).json({ error: "Missing repoFullName or commitSha" });
    }

    const result = await fdcService.attestCommit(repoFullName, commitSha);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Attest commit error:", error);
    res.status(500).json({ error: error.message || "Failed to attest commit" });
  }
});

/**
 * POST /api/fdc/attest-gist
 * Full pipeline for identity linking
 */
router.post("/attest-gist", async (req, res) => {
  try {
    const { gistId } = req.body;
    if (!gistId) {
      return res.status(400).json({ error: "Missing gistId" });
    }

    const result = await fdcService.attestGist(gistId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Attest gist error:", error);
    res.status(500).json({ error: error.message || "Failed to attest gist" });
  }
});

/**
 * POST /api/fdc/attest-url
 * Full pipeline for generic URL attestation (IPFS, HTTPS, etc.)
 */
router.post("/attest-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    const result = await fdcService.attestUrl(url);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Attest URL error:", error);
    res.status(500).json({ error: error.message || "Failed to attest URL" });
  }
});

/**
 * GET /api/fdc/status/:id
 * Check attestation progress
 */
router.get("/status/:id", async (req, res) => {
  try {
    const status = fdcService.getAttestationStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: "Attestation not found" });
    }
    res.json(status);
  } catch (error: any) {
    console.error("Get status error:", error);
    res.status(500).json({ error: error.message || "Failed to get status" });
  }
});

export { router as fdcRoutes };
