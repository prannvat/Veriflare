#!/usr/bin/env node

/**
 * Deploy Preview Script
 * Simulates deploying a build preview for testing
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

interface DeployResult {
  previewUrl: string;
  buildHash: string;
  sourceHash: string;
  manifestUrl: string;
  expiresAt: number;
}

async function deployPreview(
  buildPath: string,
  jobId: string
): Promise<DeployResult> {
  console.log("\n🚀 Deploying build preview...\n");

  // Validate build path
  if (!fs.existsSync(buildPath)) {
    throw new Error(`Build path not found: ${buildPath}`);
  }

  // Generate hashes
  const buildHash = "0x" + crypto.randomBytes(32).toString("hex");
  const sourceHash = "0x" + crypto.randomBytes(32).toString("hex");

  // Simulate deployment
  console.log("📦 Uploading build artifact...");
  await sleep(500);

  console.log("🔗 Generating preview URL...");
  await sleep(300);

  const shortJobId = jobId.slice(0, 8);
  const previewUrl = `https://preview.veriflare.io/${shortJobId}`;
  const manifestUrl = `ipfs://Qm${crypto.randomBytes(22).toString("hex")}`;

  console.log("✅ Deployment complete!\n");

  const result: DeployResult = {
    previewUrl,
    buildHash,
    sourceHash,
    manifestUrl,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  };

  console.log("─".repeat(50));
  console.log("Preview URL:   ", result.previewUrl);
  console.log("Build Hash:    ", result.buildHash.slice(0, 20) + "...");
  console.log("Source Hash:   ", result.sourceHash.slice(0, 20) + "...");
  console.log("Manifest:      ", result.manifestUrl.slice(0, 30) + "...");
  console.log("Expires:       ", new Date(result.expiresAt * 1000).toISOString());
  console.log("─".repeat(50));

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CLI handler
const [, , buildPath, jobId] = process.argv;

if (!buildPath || !jobId) {
  console.log(`
Usage: npx tsx scripts/deploy-preview.ts <build-path> <job-id>

Example:
  npx tsx scripts/deploy-preview.ts ./dist 0x1234567890abcdef
  `);
  process.exit(1);
}

deployPreview(buildPath, jobId).catch((error) => {
  console.error("❌ Deployment failed:", error.message);
  process.exit(1);
});
