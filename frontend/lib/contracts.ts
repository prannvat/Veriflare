// Contract ABIs for frontend integration

export const FREELANCER_ESCROW_ABI = [
  // Events
  {
    type: "event",
    name: "JobCreated",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "clientRepo", type: "string", indexed: false },
      { name: "paymentAmount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "JobAccepted",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "freelancer", type: "address", indexed: true },
      { name: "freelancerGitHub", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BuildSubmitted",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "buildHash", type: "bytes32", indexed: false },
      { name: "sourceCodeHash", type: "bytes32", indexed: false },
      { name: "previewUrl", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BuildAccepted",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "sourceHash", type: "bytes32", indexed: false },
      { name: "codeDeliveryDeadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PaymentReleased",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "freelancer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },

  // Read Functions
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "client", type: "address" },
          { name: "freelancer", type: "address" },
          { name: "freelancerGitHub", type: "string" },
          { name: "paymentAmount", type: "uint256" },
          { name: "paymentToken", type: "address" },
          { name: "clientRepo", type: "string" },
          { name: "targetBranch", type: "string" },
          { name: "requirementsHash", type: "bytes32" },
          { name: "acceptedBuildHash", type: "bytes32" },
          { name: "acceptedSourceHash", type: "bytes32" },
          { name: "deadline", type: "uint256" },
          { name: "reviewPeriod", type: "uint256" },
          { name: "codeDeliveryDeadline", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getBuildSubmission",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "buildHash", type: "bytes32" },
          { name: "sourceCodeHash", type: "bytes32" },
          { name: "previewUrl", type: "string" },
          { name: "buildManifestIpfs", type: "string" },
          { name: "submittedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getWalletGitHub",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "isGitHubLinked",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "totalJobs",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalValueLocked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },

  // Write Functions
  {
    type: "function",
    name: "createJob",
    stateMutability: "payable",
    inputs: [
      { name: "clientRepo", type: "string" },
      { name: "targetBranch", type: "string" },
      { name: "requirementsHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "reviewPeriod", type: "uint256" },
    ],
    outputs: [{ name: "jobId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "acceptJob",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitBuild",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "buildHash", type: "bytes32" },
      { name: "sourceCodeHash", type: "bytes32" },
      { name: "previewUrl", type: "string" },
      { name: "buildManifestIpfs", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptBuild",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "requestChanges",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "newRequirementsHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimPayment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "fdcProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refundClient",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "freelancerReclaimAfterAcceptance",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "linkGitHub",
    stateMutability: "nonpayable",
    inputs: [
      { name: "gitHubUsername", type: "string" },
      { name: "fdcIdentityProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "openDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
  },
] as const;

// Job status enum mapping
export const JOB_STATUS = {
  0: "Open",
  1: "InProgress",
  2: "DeliverableSubmitted",
  3: "DeliverableAccepted",
  4: "FilesDelivered",
  5: "Completed",
  6: "Disputed",
  7: "Cancelled",
} as const;

export type JobStatus = keyof typeof JOB_STATUS;
