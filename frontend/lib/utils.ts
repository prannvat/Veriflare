import { formatEther, parseEther } from "viem";

/**
 * Format a timestamp to a human-readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format remaining time until deadline
 */
export function formatTimeRemaining(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;

  if (remaining <= 0) return "Expired";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

/**
 * Format FLR amount
 */
export function formatFLR(amount: bigint): string {
  return `${Number(formatEther(amount)).toLocaleString()} FLR`;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Truncate job ID for display
 */
export function truncateJobId(jobId: string): string {
  if (!jobId) return "";
  return `${jobId.slice(0, 10)}...${jobId.slice(-8)}`;
}

/**
 * Get status color class
 */
export function getStatusClass(status: number): string {
  const statusClasses: Record<number, string> = {
    0: "status-open",
    1: "status-progress",
    2: "status-submitted",
    3: "status-accepted",
    4: "status-accepted",
    5: "status-completed",
    6: "status-disputed",
    7: "status-cancelled",
  };
  return statusClasses[status] || "status-cancelled";
}

/**
 * Get status label
 */
export function getStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    0: "Open",
    1: "In Progress",
    2: "Deliverable Submitted",
    3: "Deliverable Accepted",
    4: "Files Delivered",
    5: "Completed",
    6: "Disputed",
    7: "Cancelled",
  };
  return labels[status] || "Unknown";
}

/**
 * Parse review period from days to seconds
 */
export function daysToSeconds(days: number): number {
  return days * 24 * 60 * 60;
}

/**
 * Parse seconds to days
 */
export function secondsToDays(seconds: number): number {
  return Math.floor(seconds / 86400);
}

/**
 * Validate GitHub repo format
 */
export function isValidGitHubRepo(repo: string): boolean {
  const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  return pattern.test(repo);
}

/**
 * Validate GitHub username
 */
export function isValidGitHubUsername(username: string): boolean {
  const pattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return pattern.test(username) && username.length <= 39;
}

/**
 * Compute hash of requirements (for IPFS simulation)
 */
export async function hashRequirements(requirements: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(requirements);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hashHex}`;
}
