import { Router } from "express";
import { Octokit } from "@octokit/rest";

const router = Router();

// In-memory session store (use Redis in production)
const sessions = new Map<string, { state: string; walletAddress?: string }>();

/**
 * POST /api/auth/github/init
 * Initiate GitHub OAuth for identity linking
 */
router.post("/github/init", async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress required" });
  }

  const state = Math.random().toString(36).slice(2);
  sessions.set(state, { state, walletAddress });

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GitHub OAuth not configured" });
  }

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${state}&scope=gist`;

  res.json({ authUrl, state });
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
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

    // Get user info
    const octokit = new Octokit({ auth: accessToken });
    const { data: user } = await octokit.users.getAuthenticated();

    // Auto-create gist with wallet address
    const gistContent = `veriflare-identity-verification\nwallet: ${session.walletAddress}\ntimestamp: ${new Date().toISOString()}`;

    const { data: gist } = await octokit.gists.create({
      description: "Veriflare Identity Verification",
      public: false,
      files: {
        "veriflare-verify.txt": {
          content: gistContent,
        },
      },
    });

    // Redirect back to frontend with gist ID
    const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/jobs?gistId=${gist.id}&username=${user.login}`;
    
    sessions.delete(state as string);
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("GitHub OAuth error:", error);
    res.status(500).send("OAuth failed");
  }
});

export { router as authRoutes };
