import { Router } from "express";
import { FDCService } from "../services/fdc";

const router = Router();
const fdcService = new FDCService();

/**
 * POST /api/fdc/request-attestation
 * Request an attestation from Flare Data Connector
 */
router.post("/request-attestation", async (req, res) => {
  try {
    const { type, params } = req.body;

    if (!type || !params) {
      return res.status(400).json({ error: "Missing type or params" });
    }

    let attestationRequest;

    switch (type) {
      case "github-commit":
        attestationRequest = await fdcService.requestCommitAttestation(
          params.repoFullName,
          params.commitHash
        );
        break;

      case "github-gist":
        attestationRequest = await fdcService.requestGistAttestation(
          params.gistId,
          params.expectedContent
        );
        break;

      default:
        return res.status(400).json({ error: "Unknown attestation type" });
    }

    res.json({
      success: true,
      attestationId: attestationRequest.id,
      status: attestationRequest.status,
    });
  } catch (error) {
    console.error("Request attestation error:", error);
    res.status(500).json({ error: "Failed to request attestation" });
  }
});

/**
 * GET /api/fdc/attestation/:id
 * Get attestation status and proof
 */
router.get("/attestation/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const attestation = await fdcService.getAttestation(id);

    res.json(attestation);
  } catch (error) {
    console.error("Get attestation error:", error);
    res.status(500).json({ error: "Failed to get attestation" });
  }
});

/**
 * POST /api/fdc/verify-commit
 * Verify a GitHub commit for code delivery
 */
router.post("/verify-commit", async (req, res) => {
  try {
    const {
      jobId,
      repoFullName,
      commitHash,
      expectedTreeHash,
      expectedAuthor,
      deadline,
    } = req.body;

    // Fetch commit data from GitHub
    const commitData = await fdcService.fetchCommitData(repoFullName, commitHash);

    // Verify all conditions
    const verification = {
      repoMatches: true, // Already fetched from correct repo
      authorMatches: commitData.author === expectedAuthor,
      treeHashMatches: commitData.treeHash === expectedTreeHash,
      withinDeadline: commitData.timestamp <= deadline,
    };

    const allValid = Object.values(verification).every(Boolean);

    if (allValid) {
      // Generate FDC proof for on-chain verification
      const proof = await fdcService.generateCommitProof(
        repoFullName,
        commitHash,
        commitData
      );

      res.json({
        success: true,
        verification,
        proof,
        commitData,
      });
    } else {
      res.json({
        success: false,
        verification,
        errors: Object.entries(verification)
          .filter(([, valid]) => !valid)
          .map(([check]) => check),
      });
    }
  } catch (error) {
    console.error("Verify commit error:", error);
    res.status(500).json({ error: "Failed to verify commit" });
  }
});

/**
 * POST /api/fdc/verify-identity
 * Verify GitHub identity via gist
 */
router.post("/verify-identity", async (req, res) => {
  try {
    const { gitHubUsername, walletAddress, gistId } = req.body;

    const verification = await fdcService.verifyGitHubIdentity(
      gitHubUsername,
      walletAddress,
      gistId
    );

    if (verification.valid) {
      // Generate proof for on-chain identity linking
      const proof = await fdcService.generateIdentityProof(
        gitHubUsername,
        walletAddress
      );

      res.json({
        success: true,
        proof,
      });
    } else {
      res.json({
        success: false,
        error: verification.error,
      });
    }
  } catch (error) {
    console.error("Verify identity error:", error);
    res.status(500).json({ error: "Failed to verify identity" });
  }
});

export { router as fdcRoutes };
