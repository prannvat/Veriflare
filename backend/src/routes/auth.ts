import { Router } from "express";
import { Octokit } from "@octokit/rest";
import { ethers } from "ethers";

const router = Router();

// In-memory session store (use Redis in production)
const sessions = new Map<string, { state: string; walletAddress?: string; returnUrl?: string }>();

// Escrow contract address (must match deployed contract)
const ESCROW_ADDRESS = "0xebd58418c784a240C7dC45cF8a8bD41dE5d35F9F";
const COSTON2_CHAIN_ID = 114;

/**
 * POST /api/auth/github/init
 * Initiate GitHub OAuth for identity linking
 */
router.post("/github/init", async (req, res) => {
  const { walletAddress, returnUrl } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress required" });
  }

  const state = Math.random().toString(36).slice(2);
  sessions.set(state, { state, walletAddress, returnUrl: returnUrl || "/jobs" });

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GitHub OAuth not configured" });
  }

  // Only need read:user scope, no gist needed anymore
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${state}&scope=read:user`;

  res.json({ authUrl, state });
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback — verify identity and sign attestation
 */
router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;

  const session = sessions.get(state as string);
  if (!session) {
    return res.status(400).send("Invalid state");
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received");
    }

    // Get authenticated GitHub user — this proves they own the account
    const octokit = new Octokit({ auth: accessToken });
    const { data: user } = await octokit.users.getAuthenticated();
    const username = user.login;
    const walletAddress = session.walletAddress!;

    // Sign the identity attestation with our backend wallet
    // This matches what the contract's linkGitHubDirect expects:
    //   keccak256(abi.encodePacked(wallet, username, nonce, chainId, contractAddress))
    const signer = new ethers.Wallet(process.env.FDC_SUBMITTER_PRIVATE_KEY!);

    // Get current nonce from contract
    const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");
    const escrowAbi = ["function identityNonces(address) view returns (uint256)"];
    const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, provider);
    const nonce = await escrow.identityNonces(walletAddress);

    // Build the same hash the contract will build
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "string", "uint256", "uint256", "address"],
      [walletAddress, username, nonce, COSTON2_CHAIN_ID, ESCROW_ADDRESS]
    );

    // Sign it (ethers.signMessage auto-prepends \x19Ethereum Signed Message:\n32)
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    console.log(`[OAuth] Signed identity: ${username} → ${walletAddress} (nonce: ${nonce})`);

    // Redirect back with signature data
    const returnPath = session.returnUrl || "/jobs";
    const separator = returnPath.includes("?") ? "&" : "?";
    const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}${returnPath}${separator}username=${username}&signature=${encodeURIComponent(signature)}&nonce=${nonce}`;
    
    sessions.delete(state as string);
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("GitHub OAuth error:", error);
    const returnPath = session.returnUrl || "/jobs";
    const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}${returnPath}?authError=${encodeURIComponent(error.message || "OAuth failed")}`;
    sessions.delete(state as string);
    res.redirect(redirectUrl);
  }
});

export { router as authRoutes };
