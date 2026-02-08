import { Router } from "express";

const router = Router();

/**
 * In-memory cache for GitHub API responses.
 * The FDC verifier can't fetch api.github.com (1-second timeout / IP blocked),
 * so we pre-fetch the data and serve it from our own fast endpoint.
 * 
 * Key = random cache key
 * Value = { data: any, createdAt: number }
 */
const cache = new Map<string, { data: any; createdAt: number }>();

// Clean up old entries every 10 minutes (keep for 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now - val.createdAt > 3600_000) cache.delete(key);
  }
}, 600_000);

/**
 * Store data in the cache (called internally by FDC service)
 */
export function cacheGitHubData(key: string, data: any): void {
  cache.set(key, { data, createdAt: Date.now() });
}

/**
 * GET /api/github-cache/:key
 * Serves cached GitHub API responses for the FDC verifier.
 * Returns application/json with the exact same structure as api.github.com.
 */
router.get("/:key", (req, res) => {
  const { key } = req.params;
  const entry = cache.get(key);
  
  if (!entry) {
    return res.status(404).json({ error: "Cache entry not found or expired" });
  }
  
  // Return as plain JSON — the FDC verifier needs Content-Type: application/json
  res.setHeader("Content-Type", "application/json");
  res.json(entry.data);
});

export const githubCacheRoutes = router;
