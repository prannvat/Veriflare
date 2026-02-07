#!/usr/bin/env node

/**
 * Veriflare CLI - Utility scripts for development
 *
 * Usage:
 *   node scripts/cli.js hash-source ./src
 *   node scripts/cli.js verify-commit owner/repo abc123
 *   node scripts/cli.js create-gist 0x1234...
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(title: string) {
  console.log("\n" + "═".repeat(50));
  log(title, colors.bright + colors.cyan);
  console.log("═".repeat(50));
}

/**
 * Compute deterministic hash of source code directory
 */
async function hashSourceDirectory(dirPath: string): Promise<string> {
  const files = getAllFilesRecursive(dirPath);
  files.sort();

  const hash = crypto.createHash("sha256");
  let fileCount = 0;

  for (const file of files) {
    const relativePath = path.relative(dirPath, file);
    const content = fs.readFileSync(file);

    hash.update(relativePath);
    hash.update(content);
    fileCount++;
  }

  const result = "0x" + hash.digest("hex");

  log(`\nHashed ${fileCount} files`, colors.green);
  log(`Source Hash: ${result}`, colors.bright);

  return result;
}

function getAllFilesRecursive(dirPath: string): string[] {
  const files: string[] = [];
  const ignore = ["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".DS_Store"];

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    if (ignore.includes(item.name)) continue;

    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      files.push(...getAllFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Generate gist content for GitHub identity verification
 */
function generateGistContent(walletAddress: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const content = `Veriflare Identity Verification

I am linking this GitHub account to my Ethereum wallet.

Wallet Address: ${walletAddress}
Timestamp: ${timestamp}
Platform: Veriflare - Trustless Freelance Escrow

This gist proves ownership of both this GitHub account and the wallet address above.

---
Signed by Veriflare User`;

  log("\n📋 Copy this content to a new GitHub Gist:\n", colors.yellow);
  console.log("─".repeat(50));
  console.log(content);
  console.log("─".repeat(50));
  log("\n🔗 Create gist at: https://gist.github.com/new", colors.cyan);

  return content;
}

/**
 * Verify a local directory matches an expected hash
 */
async function verifySourceHash(dirPath: string, expectedHash: string): Promise<boolean> {
  const computed = await hashSourceDirectory(dirPath);
  const matches = computed.toLowerCase() === expectedHash.toLowerCase();

  if (matches) {
    log("\n✅ Hash verification PASSED", colors.green);
  } else {
    log("\n❌ Hash verification FAILED", colors.red);
    log(`Expected: ${expectedHash}`, colors.yellow);
    log(`Computed: ${computed}`, colors.yellow);
  }

  return matches;
}

/**
 * Main CLI handler
 */
async function main() {
  const [, , command, ...args] = process.argv;

  logHeader("VERIFLARE CLI");

  switch (command) {
    case "hash-source":
    case "hash": {
      const dirPath = args[0] || ".";
      log(`Hashing directory: ${path.resolve(dirPath)}`, colors.cyan);
      await hashSourceDirectory(path.resolve(dirPath));
      break;
    }

    case "create-gist":
    case "gist": {
      const walletAddress = args[0];
      if (!walletAddress) {
        log("Error: Wallet address required", colors.red);
        log("Usage: cli.js create-gist 0x1234...", colors.yellow);
        process.exit(1);
      }
      generateGistContent(walletAddress);
      break;
    }

    case "verify": {
      const dirPath = args[0];
      const expectedHash = args[1];
      if (!dirPath || !expectedHash) {
        log("Error: Directory path and expected hash required", colors.red);
        log("Usage: cli.js verify ./src 0x1234...", colors.yellow);
        process.exit(1);
      }
      await verifySourceHash(path.resolve(dirPath), expectedHash);
      break;
    }

    case "help":
    default:
      console.log(`
${colors.bright}Available Commands:${colors.reset}

  ${colors.cyan}hash-source <dir>${colors.reset}
    Compute deterministic hash of source code directory.
    This hash is used for FDC verification.

  ${colors.cyan}create-gist <wallet>${colors.reset}
    Generate gist content for GitHub identity verification.
    
  ${colors.cyan}verify <dir> <hash>${colors.reset}
    Verify that a directory matches an expected hash.

${colors.bright}Examples:${colors.reset}

  node scripts/cli.js hash-source ./src
  node scripts/cli.js create-gist 0x1234567890abcdef...
  node scripts/cli.js verify ./src 0xabcd1234...
      `);
  }
}

main().catch(console.error);
