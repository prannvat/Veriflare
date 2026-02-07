import { Router } from "express";
import { ethers } from "ethers";

const router = Router();

// Contract ABI for reading jobs
const ESCROW_ABI = [
  "function getJob(bytes32 jobId) view returns (tuple(address client, address freelancer, string freelancerGitHub, uint256 paymentAmount, address paymentToken, string clientRepo, string targetBranch, bytes32 requirementsHash, bytes32 acceptedBuildHash, bytes32 acceptedSourceHash, uint256 deadline, uint256 reviewPeriod, uint256 codeDeliveryDeadline, uint8 status))",
  "function totalJobs() view returns (uint256)",
  "function totalValueLocked() view returns (uint256)",
];

/**
 * GET /api/jobs
 * List all jobs (paginated)
 */
router.get("/", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // In production, this would query the blockchain and/or a database index
    // For demo, return mock data
    const jobs = [
      {
        id: "0x" + "1".repeat(64),
        clientRepo: "acme-corp/api-backend",
        paymentAmount: "1000000000000000000",
        status: 0,
        deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
      },
      {
        id: "0x" + "2".repeat(64),
        clientRepo: "startup-io/mobile-app",
        paymentAmount: "5000000000000000000",
        status: 2,
        deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      },
    ];

    res.json({
      jobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: jobs.length,
      },
    });
  } catch (error) {
    console.error("List jobs error:", error);
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get job details from blockchain
 */
router.get("/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    const rpcUrl = process.env.FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;

    if (!contractAddress) {
      return res.status(500).json({ error: "Contract address not configured" });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ESCROW_ABI, provider);

    const job = await contract.getJob(jobId);

    res.json({
      id: jobId,
      client: job.client,
      freelancer: job.freelancer,
      freelancerGitHub: job.freelancerGitHub,
      paymentAmount: job.paymentAmount.toString(),
      paymentToken: job.paymentToken,
      clientRepo: job.clientRepo,
      targetBranch: job.targetBranch,
      requirementsHash: job.requirementsHash,
      acceptedBuildHash: job.acceptedBuildHash,
      acceptedSourceHash: job.acceptedSourceHash,
      deadline: Number(job.deadline),
      reviewPeriod: Number(job.reviewPeriod),
      codeDeliveryDeadline: Number(job.codeDeliveryDeadline),
      status: Number(job.status),
    });
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({ error: "Failed to get job" });
  }
});

/**
 * GET /api/jobs/stats
 * Get platform statistics
 */
router.get("/stats/overview", async (req, res) => {
  try {
    const rpcUrl = process.env.FLARE_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;

    if (!contractAddress) {
      // Return mock stats if contract not deployed
      return res.json({
        totalJobs: 42,
        totalValueLocked: "100000000000000000000",
        completedJobs: 35,
        activeJobs: 7,
      });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ESCROW_ABI, provider);

    const [totalJobs, totalValueLocked] = await Promise.all([
      contract.totalJobs(),
      contract.totalValueLocked(),
    ]);

    res.json({
      totalJobs: Number(totalJobs),
      totalValueLocked: totalValueLocked.toString(),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export { router as jobRoutes };
