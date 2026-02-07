// Demo data for testing the full Veriflare flow
// These are example IPFS hashes and URLs you can use to test

export const DEMO_DELIVERABLES_BY_TYPE = {
  // Example IPFS CIDs (Content Identifiers)
  ipfs: {
    brandIdentity: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    logoPackage: "ipfs://QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
    websiteDesign: "ipfs://QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB",
    musicAlbum: "ipfs://QmXgZAUWd8yo4tvjBETqzUy3wLx5YRzuDwUQnBwRGrAmAo",
    photoGallery: "ipfs://QmRN6wdp1S2A5EtjW9A3M2e6yJjKLcC4pzxWMYXKJZQ7ux",
  },
  
  // Example HTTPS URLs for testing
  https: {
    githubRepo: "https://github.com/veriflare/demo-deliverable",
    figmaDesign: "https://www.figma.com/file/demo-design-system",
    hostedApp: "https://demo-app.veriflare.io",
    driveFolder: "https://drive.google.com/drive/folders/demo-assets",
  },

  // GitHub Gist for identity verification
  gist: {
    id: "abc123def456",
    url: "https://gist.github.com/yourusername/abc123def456",
    // The gist should contain: "veriflare-verify:0xYOUR_WALLET_ADDRESS"
  },
};

// Array of example deliverables for UI selection
export const DEMO_DELIVERABLES = [
  { 
    name: "Brand Identity Package (IPFS)", 
    url: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    type: "ipfs"
  },
  { 
    name: "GitHub Repository", 
    url: "https://github.com/veriflare/demo-deliverable",
    type: "https"
  },
  { 
    name: "Figma Design File", 
    url: "https://www.figma.com/file/demo-design-system",
    type: "https"
  },
  { 
    name: "Photo Gallery (IPFS)", 
    url: "ipfs://QmRN6wdp1S2A5EtjW9A3M2e6yJjKLcC4pzxWMYXKJZQ7ux",
    type: "ipfs"
  },
  { 
    name: "Demo Web App", 
    url: "https://demo-app.veriflare.io",
    type: "https"
  },
];

// Example job data for demo
export const DEMO_JOBS = [
  {
    id: "0x0001",
    title: "Brand Identity Package",
    description: "Create a complete brand identity including logo, colors, typography, and brand guidelines.",
    category: "design",
    paymentAmount: "5000000000000000000", // 5 FLR
    client: "0x1111111111111111111111111111111111111111",
    freelancer: "0x0000000000000000000000000000000000000000",
    status: 0, // Open
    deadline: Math.floor(Date.now() / 1000) + 86400 * 14, // 14 days
    reviewPeriod: 86400 * 3, // 3 days
    deliveryUrl: DEMO_DELIVERABLES_BY_TYPE.ipfs.brandIdentity,
    requirements: [
      "Logo in SVG, PNG, and PDF formats",
      "Primary and secondary color palette with hex codes",
      "Typography specification with font pairings",
      "Business card and letterhead templates",
      "Brand usage guidelines document",
    ],
  },
  {
    id: "0x0002", 
    title: "Landing Page Development",
    description: "Build a responsive landing page with animations and contact form.",
    category: "development",
    paymentAmount: "10000000000000000000", // 10 FLR
    client: "0x2222222222222222222222222222222222222222",
    freelancer: "0x0000000000000000000000000000000000000000",
    status: 0, // Open
    deadline: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    reviewPeriod: 86400 * 2, // 2 days
    deliveryUrl: DEMO_DELIVERABLES_BY_TYPE.https.githubRepo,
    requirements: [
      "Responsive design (mobile, tablet, desktop)",
      "Hero section with animated elements",
      "Features showcase section",
      "Contact form with validation",
      "Deployed to provided domain",
    ],
  },
  {
    id: "0x0003",
    title: "Product Photography",
    description: "Professional product photos for e-commerce store.",
    category: "photography",
    paymentAmount: "3000000000000000000", // 3 FLR
    client: "0x3333333333333333333333333333333333333333",
    freelancer: "0x0000000000000000000000000000000000000000",
    status: 0, // Open
    deadline: Math.floor(Date.now() / 1000) + 86400 * 5, // 5 days
    reviewPeriod: 86400, // 1 day
    deliveryUrl: DEMO_DELIVERABLES_BY_TYPE.ipfs.photoGallery,
    requirements: [
      "20 product shots with white background",
      "5 lifestyle/context shots",
      "High resolution (4K) images",
      "Basic retouching included",
      "Delivered in JPEG and RAW formats",
    ],
  },
];

// FDC Attestation demo flow
export const DEMO_FDC_STEPS = [
  {
    step: 1,
    title: "Prepare Attestation",
    description: "Creating attestation request for the deliverable URL...",
    duration: 1500,
  },
  {
    step: 2,
    title: "Submit to FdcHub",
    description: "Submitting request to Flare Data Connector on-chain...",
    duration: 2000,
  },
  {
    step: 3,
    title: "Wait for Consensus",
    description: "Data providers are verifying and reaching consensus...",
    duration: 3000,
  },
  {
    step: 4,
    title: "Fetch Merkle Proof",
    description: "Retrieving cryptographic proof from Data Availability Layer...",
    duration: 1500,
  },
  {
    step: 5,
    title: "Verify & Complete",
    description: "Proof verified on-chain! Transaction complete.",
    duration: 1000,
  },
];

// Helper to simulate FDC attestation with visual progress
export async function simulateFdcAttestation(
  url: string,
  onProgress: (step: number, title: string, description: string) => void
): Promise<{ success: boolean; proofHash: string; txHash: string }> {
  for (const step of DEMO_FDC_STEPS) {
    onProgress(step.step, step.title, step.description);
    await new Promise(resolve => setTimeout(resolve, step.duration));
  }
  
  return {
    success: true,
    proofHash: "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(""),
    txHash: "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(""),
  };
}

// Coston2 faucet and explorer links
export const FLARE_LINKS = {
  faucet: "https://faucet.flare.network/coston2",
  explorer: "https://coston2-explorer.flare.network",
  docs: "https://dev.flare.network",
  fdcDocs: "https://dev.flare.network/fdc/overview",
};
