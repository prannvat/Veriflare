import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  isOnChain?: boolean;  // true if created via real on-chain tx
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
  getJob: (id: string) => Job | undefined;
  
  // Create a new job (for client flow)
  createJob: (title: string, category: JobCategory, verificationType: VerificationType, destination: string, ref: string, paymentAmount: bigint, deadline: number, reviewPeriod: number, clientAddress: string) => string;

  // Demo mode actions
  acceptJob: (jobId: string, freelancerAddress: string) => void;
  submitDeliverable: (jobId: string, deliveryUrl: string, deliveryHash: string) => void;
  approveWork: (jobId: string) => void;
  completePayment: (jobId: string) => void;
  
  // Get jobs by role
  getClientJobs: (clientAddress: string) => Job[];
  getFreelancerJobs: (freelancerAddress: string) => Job[];

  // Initialize demo jobs
  initDemoJobs: () => void;

  // UI state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Selected job for detail view
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;

  // FDC attestation state
  fdcStep: number;
  fdcStepTitle: string;
  fdcStepDescription: string;
  setFdcProgress: (step: number, title: string, description: string) => void;
  resetFdc: () => void;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
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
  getJob: (id) => get().jobs.get(id),
  
  // Create a new job
  createJob: (title, category, verificationType, destination, ref, paymentAmount, deadline, reviewPeriod, clientAddress) => {
    const jobId = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    const newJob: Job = {
      id: jobId,
      client: clientAddress,
      freelancer: "0x0000000000000000000000000000000000000000",
      freelancerGitHub: "",
      paymentAmount,
      paymentToken: "0x0000000000000000000000000000000000000000",
      clientRepo: destination,
      targetBranch: ref,
      requirementsHash: "0x...",
      acceptedBuildHash: "",
      acceptedSourceHash: "",
      deadline,
      reviewPeriod,
      codeDeliveryDeadline: 0,
      status: 0, // Open
      category,
      title,
      verificationType,
    };
    set((state) => {
      const jobs = new Map(state.jobs);
      jobs.set(jobId, newJob);
      return { jobs };
    });
    return jobId;
  },

  // Demo mode actions (status values match FreelancerEscrow.sol enum)
  acceptJob: (jobId, freelancerAddress) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      const job = jobs.get(jobId);
      if (job && job.status === 0) { // Open → InProgress
        jobs.set(jobId, {
          ...job,
          freelancer: freelancerAddress,
          freelancerGitHub: "demo-freelancer",
          status: 1, // InProgress
        });
      }
      return { jobs };
    }),

  submitDeliverable: (jobId, deliveryUrl, deliveryHash) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      const job = jobs.get(jobId);
      if (job && job.status === 1) { // InProgress → BuildSubmitted
        jobs.set(jobId, {
          ...job,
          clientRepo: deliveryUrl,
          acceptedBuildHash: deliveryHash,
          status: 2, // BuildSubmitted
        });
      }
      return { jobs };
    }),

  approveWork: (jobId) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      const job = jobs.get(jobId);
      if (job && job.status === 2) { // BuildSubmitted → BuildAccepted
        jobs.set(jobId, {
          ...job,
          status: 3, // BuildAccepted
        });
      }
      return { jobs };
    }),

  completePayment: (jobId) =>
    set((state) => {
      const jobs = new Map(state.jobs);
      const job = jobs.get(jobId);
      if (job && job.status === 3) { // BuildAccepted → Completed
        jobs.set(jobId, {
          ...job,
          status: 5, // Completed
        });
      }
      return { jobs };
    }),
    
  // Get jobs by role
  getClientJobs: (clientAddress) => {
    const allJobs = Array.from(get().jobs.values());
    return allJobs.filter(job => job.client.toLowerCase() === clientAddress.toLowerCase());
  },
  
  getFreelancerJobs: (freelancerAddress) => {
    const allJobs = Array.from(get().jobs.values());
    return allJobs.filter(job => 
      job.freelancer !== "0x0000000000000000000000000000000000000000" &&
      job.freelancer.toLowerCase() === freelancerAddress.toLowerCase()
    );
  },

  initDemoJobs: () =>
    set(() => {
      const jobs = new Map<string, Job>();
      // Demo job 1 - Open
      jobs.set("0x0001", {
        id: "0x0001",
        client: "0x1111111111111111111111111111111111111111",
        freelancer: "0x0000000000000000000000000000000000000000",
        freelancerGitHub: "",
        paymentAmount: BigInt("5000000000000000000"),
        paymentToken: "0x0000000000000000000000000000000000000000",
        clientRepo: "ipfs://brand-identity",
        targetBranch: "final",
        requirementsHash: "0x...",
        acceptedBuildHash: "",
        acceptedSourceHash: "",
        deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
        reviewPeriod: 86400 * 3,
        codeDeliveryDeadline: 0,
        status: 0,
        category: "design",
        title: "Brand Identity Package",
        verificationType: "ipfs_delivery",
      });
      // Demo job 2 - Open
      jobs.set("0x0002", {
        id: "0x0002",
        client: "0x2222222222222222222222222222222222222222",
        freelancer: "0x0000000000000000000000000000000000000000",
        freelancerGitHub: "",
        paymentAmount: BigInt("10000000000000000000"),
        paymentToken: "0x0000000000000000000000000000000000000000",
        clientRepo: "https://github.com/client/project",
        targetBranch: "main",
        requirementsHash: "0x...",
        acceptedBuildHash: "",
        acceptedSourceHash: "",
        deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
        reviewPeriod: 86400 * 2,
        codeDeliveryDeadline: 0,
        status: 0,
        category: "development",
        title: "Landing Page Development",
        verificationType: "github_commit",
      });
      // Demo job 3 - Open
      jobs.set("0x0003", {
        id: "0x0003",
        client: "0x3333333333333333333333333333333333333333",
        freelancer: "0x0000000000000000000000000000000000000000",
        freelancerGitHub: "",
        paymentAmount: BigInt("3000000000000000000"),
        paymentToken: "0x0000000000000000000000000000000000000000",
        clientRepo: "ipfs://photo-gallery",
        targetBranch: "v1",
        requirementsHash: "0x...",
        acceptedBuildHash: "",
        acceptedSourceHash: "",
        deadline: Math.floor(Date.now() / 1000) + 86400 * 5,
        reviewPeriod: 86400,
        codeDeliveryDeadline: 0,
        status: 0,
        category: "photography",
        title: "Product Photography Session",
        verificationType: "ipfs_delivery",
      });
      return { jobs };
    }),

  // UI state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Selected job
  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),

  // FDC attestation progress
  fdcStep: 0,
  fdcStepTitle: "",
  fdcStepDescription: "",
  setFdcProgress: (step, title, description) =>
    set({ fdcStep: step, fdcStepTitle: title, fdcStepDescription: description }),
  resetFdc: () =>
    set({ fdcStep: 0, fdcStepTitle: "", fdcStepDescription: "" }),
}), {
  name: "veriflare-store",
  storage: {
    getItem: (name) => {
      const str = localStorage.getItem(name);
      if (!str) return null;
      const parsed = JSON.parse(str, (key, value) => {
        if (typeof value === 'object' && value !== null && value.__type === 'Map') {
          return new Map(value.entries.map(([k, v]: [string, any]) => [
            k,
            { ...v, paymentAmount: BigInt(v.paymentAmount || '0') },
          ]));
        }
        if (typeof value === 'string' && value.startsWith('__bigint:')) {
          return BigInt(value.slice(9));
        }
        return value;
      });
      return parsed;
    },
    setItem: (name, value) => {
      const str = JSON.stringify(value, (key, val) => {
        if (val instanceof Map) {
          return {
            __type: 'Map',
            entries: Array.from(val.entries()).map(([k, v]) => [
              k,
              { ...v, paymentAmount: v.paymentAmount?.toString() || '0' },
            ]),
          };
        }
        if (typeof val === 'bigint') {
          return `__bigint:${val.toString()}`;
        }
        return val;
      });
      localStorage.setItem(name, str);
    },
    removeItem: (name) => localStorage.removeItem(name),
  },
  partialize: (state) => ({
    jobs: state.jobs,
    isGitHubLinked: state.isGitHubLinked,
    gitHubUsername: state.gitHubUsername,
  } as any),
}));
