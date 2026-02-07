// ═══════════════════════════════════════════════════════════
//  Shared constants — must stay in sync with FreelancerEscrow.sol
// ═══════════════════════════════════════════════════════════

/** Maps exactly to `enum JobStatus` in the Solidity contract */
export const JOB_STATUS = {
  Open: 0,
  InProgress: 1,
  BuildSubmitted: 2,
  BuildAccepted: 3,
  CodeDelivered: 4,
  Completed: 5,
  Disputed: 6,
  Cancelled: 7,
} as const;

export type JobStatusKey = keyof typeof JOB_STATUS;
export type JobStatusValue = (typeof JOB_STATUS)[JobStatusKey];

export const JOB_STATUS_LABELS: Record<number, string> = {
  [JOB_STATUS.Open]: "Open",
  [JOB_STATUS.InProgress]: "In Progress",
  [JOB_STATUS.BuildSubmitted]: "Build Submitted",
  [JOB_STATUS.BuildAccepted]: "Build Accepted",
  [JOB_STATUS.CodeDelivered]: "Code Delivered",
  [JOB_STATUS.Completed]: "Completed",
  [JOB_STATUS.Disputed]: "Disputed",
  [JOB_STATUS.Cancelled]: "Cancelled",
};

export const JOB_STATUS_COLORS: Record<number, string> = {
  [JOB_STATUS.Open]: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  [JOB_STATUS.InProgress]: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  [JOB_STATUS.BuildSubmitted]: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  [JOB_STATUS.BuildAccepted]: "text-lime-400 bg-lime-500/10 border-lime-500/30",
  [JOB_STATUS.CodeDelivered]: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  [JOB_STATUS.Completed]: "text-green-400 bg-green-500/10 border-green-500/30",
  [JOB_STATUS.Disputed]: "text-red-400 bg-red-500/10 border-red-500/30",
  [JOB_STATUS.Cancelled]: "text-white/40 bg-white/5 border-white/10",
};

/** The deployed contract address on Coston2 testnet */
export const ESCROW_ADDRESS = "0x3DF72131555649Cdb40c743605c622A50409e0fb" as const;

/** Coston2 chain id */
export const COSTON2_CHAIN_ID = 114;

/** Explorer base URL */
export const EXPLORER_URL = "https://coston2-explorer.flare.network";
