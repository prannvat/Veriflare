import { Router } from "express";
import multer from "multer";
import { computeSourceHash, hashFile } from "../services/hash";
import { uploadToIPFS } from "../services/ipfs";

const router = Router();
const upload = multer({ dest: "uploads/" });

/**
 * POST /api/builds/upload
 * Upload a build artifact (Docker image, binary, etc.)
 */
router.post("/upload", upload.single("build"), async (req, res) => {
  try {
    const { jobId, previewUrl } = req.body;
    const file = req.file;

    if (!file || !jobId) {
      return res.status(400).json({ error: "Missing file or jobId" });
    }

    // Hash the build artifact
    const buildHash = await hashFile(file.path);

    // Upload to IPFS
    const ipfsHash = await uploadToIPFS(file.path, file.originalname);

    // Create build manifest
    const manifest = {
      jobId,
      buildVersion: "1.0.0",
      timestamp: Math.floor(Date.now() / 1000),
      artifacts: [
        {
          name: file.originalname,
          type: file.mimetype,
          hash: buildHash,
          ipfsHash,
          previewUrl: previewUrl || null,
        },
      ],
    };

    // Upload manifest to IPFS
    const manifestIpfs = await uploadToIPFS(
      Buffer.from(JSON.stringify(manifest, null, 2)),
      "manifest.json"
    );

    res.json({
      success: true,
      buildHash,
      manifestIpfs,
      manifest,
    });
  } catch (error) {
    console.error("Build upload error:", error);
    res.status(500).json({ error: "Failed to upload build" });
  }
});

/**
 * POST /api/builds/hash-source
 * Compute hash of source code directory for verification
 */
router.post("/hash-source", upload.single("source"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Missing source archive" });
    }

    // Compute deterministic hash of source code
    const sourceHash = await computeSourceHash(file.path);

    res.json({
      success: true,
      sourceHash,
    });
  } catch (error) {
    console.error("Source hash error:", error);
    res.status(500).json({ error: "Failed to compute source hash" });
  }
});

/**
 * GET /api/builds/:jobId
 * Get build info for a job
 */
router.get("/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    // In production, fetch from database
    // For demo, return mock data
    res.json({
      jobId,
      buildHash: "0x" + "1".repeat(64),
      sourceCodeHash: "0x" + "2".repeat(64),
      previewUrl: `https://preview.veriflare.io/${jobId.slice(0, 8)}`,
      manifestIpfs: "Qm...",
      submittedAt: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    console.error("Get build error:", error);
    res.status(500).json({ error: "Failed to get build" });
  }
});

export { router as buildRoutes };
