import { Router } from "express";
import { Octokit } from "@octokit/rest";

const router = Router();

/**
 * GET /api/github/repo/:owner/:repo
 * Get repository info
 */
router.get("/repo/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const token = req.headers.authorization?.replace("Bearer ", "");

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.get({ owner, repo });

    res.json({
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      private: data.private,
      permissions: data.permissions,
    });
  } catch (error: any) {
    console.error("GitHub repo error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to get repository",
    });
  }
});

/**
 * GET /api/github/commit/:owner/:repo/:sha
 * Get commit details including tree hash
 */
router.get("/commit/:owner/:repo/:sha", async (req, res) => {
  try {
    const { owner, repo, sha } = req.params;
    const token = req.headers.authorization?.replace("Bearer ", "");

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.git.getCommit({ owner, repo, commit_sha: sha });

    res.json({
      sha: data.sha,
      message: data.message,
      author: {
        name: data.author.name,
        email: data.author.email,
        date: data.author.date,
      },
      tree: {
        sha: data.tree.sha,
        url: data.tree.url,
      },
      timestamp: new Date(data.author.date).getTime() / 1000,
    });
  } catch (error: any) {
    console.error("GitHub commit error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to get commit",
    });
  }
});

/**
 * GET /api/github/tree/:owner/:repo/:sha
 * Get tree (for computing source hash)
 */
router.get("/tree/:owner/:repo/:sha", async (req, res) => {
  try {
    const { owner, repo, sha } = req.params;
    const token = req.headers.authorization?.replace("Bearer ", "");

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: "true",
    });

    res.json({
      sha: data.sha,
      truncated: data.truncated,
      tree: data.tree.map((item) => ({
        path: item.path,
        mode: item.mode,
        type: item.type,
        sha: item.sha,
        size: item.size,
      })),
    });
  } catch (error: any) {
    console.error("GitHub tree error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to get tree",
    });
  }
});

/**
 * GET /api/github/gist/:gistId
 * Get gist content for identity verification
 */
router.get("/gist/:gistId", async (req, res) => {
  try {
    const { gistId } = req.params;

    const octokit = new Octokit();
    const { data } = await octokit.gists.get({ gist_id: gistId });

    const files = Object.entries(data.files || {}).map(([name, file]: [string, any]) => ({
      filename: name,
      content: file.content,
      size: file.size,
    }));

    res.json({
      id: data.id,
      owner: data.owner?.login,
      description: data.description,
      public: data.public,
      files,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error: any) {
    console.error("GitHub gist error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to get gist",
    });
  }
});

/**
 * GET /api/github/user/:username
 * Get user profile
 */
router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const octokit = new Octokit();
    const { data } = await octokit.users.getByUsername({ username });

    res.json({
      login: data.login,
      id: data.id,
      avatarUrl: data.avatar_url,
      name: data.name,
      company: data.company,
      location: data.location,
      bio: data.bio,
      publicRepos: data.public_repos,
      createdAt: data.created_at,
    });
  } catch (error: any) {
    console.error("GitHub user error:", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to get user",
    });
  }
});

export { router as githubRoutes };
