import { create } from "zustand";

// Job categories supported by the platform
export type JobCategory = 
  | "development" 
  | "design" 
  | "music" 
  | "photography" 
  | "video" 
  | "writing" 
  | "advertising" 
  | "consulting" 
  | "other";

export const JOB_CATEGORIES: { value: JobCategory; label: string; icon: string }[] = [
  { value: "development", label: "Development", icon: "💻" },
  { value: "design", label: "Design & Art", icon: "🎨" },
  { value: "music", label: "Music & Audio", icon: "🎵" },
  { value: "photography", label: "Photography", icon: "📸" },
  { value: "video", label: "Video & Motion", icon: "🎬" },
  { value: "writing", label: "Writing & Copy", icon: "✍️" },
  { value: "advertising", label: "Advertising", icon: "📢" },
  { value: "consulting", label: "Consulting", icon: "💡" },
  { value: "other", label: "Other", icon: "📦" },
];

// Verification method for how FDC proves delivery
export type VerificationType = 
  | "github_commit"    // Code pushed to repo, verified via FDC GitHub attestation
  | "ipfs_delivery"    // File delivered to IPFS, hash verified on-chain
  | "url_live"         // Deliverable live at a URL, verified via FDC web attestation
  | "manual_review";   // Client reviews and signs off

export const VERIFICATION_TYPES: { value: VerificationType; label: string; description: string }[] = [
  { value: "github_commit", label: "GitHub Commit", description: "FDC verifies code was pushed to the target repository" },
  { value: "ipfs_delivery", label: "IPFS File Delivery", description: "Deliverable hash pinned on IPFS and verified on-chain" },
  { value: "url_live", label: "Live URL Check", description: "FDC attests that deliverable is live at specified URL" },
  { value: "manual_review", label: "Client Sign-off", description: "Client manually reviews and approves on-chain" },
];

// Job type — extends on-chain fields with frontend metadata
export interface Job {
  id: string;
  client: string;
  freelancer: string;
  freelancerGitHub: string;    // kept for backward compat, but now "freelancer handle"
  paymentAmount: bigint;
  paymentToken: string;
  clientRepo: string;          // doubles as "deliverable destination" (repo, IPFS path, URL, etc.)
  targetBranch: string;        // doubles as "deliverable ref" (branch, version, format spec)
  requirementsHash: string;
  acceptedBuildHash: string;   // hash of accepted deliverable
  acceptedSourceHash: string;  // hash of source / raw files
  deadline: number;
  reviewPeriod: number;
  codeDeliveryDeadline: number;
  status: number;
  // Frontend-only metadata (stored off-chain / in event logs)
  category?: JobCategory;
  title?: string;
  verificationType?: VerificationType;
}

export interface BuildSubmission {
  buildHash: string;
  sourceCodeHash: string;
  previewUrl: string;
  buildManifestIpfs: string;
  submittedAt: number;
}

interface AppState {
  // User state
  isGitHubLinked: boolean;
  gitHubUsername: string | null;
  setGitHubLinked: (linked: boolean, username?: string) => void;

  // Jobs cache
  jobs: Map<string, Job>;
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;

  // UI state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Selected job for detail view
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // User state
  isGitHubLinked: false,
  gitHubUsername: null,
  setGitHubLinked: (linked, username) =>
    set({ isGitHubLinked: linked, gitHubUsername: username || null }),

  // Jobs cache
  jobs: new Map(),
  addJob: (job) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      jobs.set(job.id, job);
      return { jobs };
    }),
  updateJob: (id, updates) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      const existing = jobs.get(id);
      if (existing) {
        jobs.set(id, { ...existing, ...updates });
      }
      return { jobs };
    }),

  // UI state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Selected job
  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
}));
