import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

/**
 * Hash a single file
 */
export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve("0x" + hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Compute deterministic hash of source code
 * Matches the format expected by FDC verification
 */
export async function computeSourceHash(archivePath: string): Promise<string> {
  // For a ZIP/tar archive, we extract and hash all files deterministically
  // For simplicity in demo, we just hash the archive itself
  // In production, this would:
  // 1. Extract the archive
  // 2. Get all files recursively
  // 3. Sort files by path
  // 4. Hash each file's path + content
  // 5. Combine into final hash

  const hash = crypto.createHash("sha256");
  const content = fs.readFileSync(archivePath);
  hash.update(content);

  return "0x" + hash.digest("hex");
}

/**
 * Compute hash of a directory (for local development)
 */
export async function hashDirectory(dirPath: string): Promise<string> {
  const files = await getAllFiles(dirPath);
  files.sort(); // Deterministic ordering

  const hash = crypto.createHash("sha256");

  for (const file of files) {
    const relativePath = path.relative(dirPath, file);
    const content = fs.readFileSync(file);

    // Hash the path
    hash.update(relativePath);
    // Hash the content
    hash.update(content);
  }

  return "0x" + hash.digest("hex");
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    // Skip common non-source directories
    if (item.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", ".next"].includes(item.name)) {
        continue;
      }
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Hash multiple files and return combined hash
 */
export async function hashMultipleFiles(filePaths: string[]): Promise<string> {
  const hash = crypto.createHash("sha256");

  for (const filePath of filePaths.sort()) {
    const content = fs.readFileSync(filePath);
    hash.update(filePath);
    hash.update(content);
  }

  return "0x" + hash.digest("hex");
}

/**
 * Verify that a hash matches expected value
 */
export function verifyHash(computed: string, expected: string): boolean {
  return computed.toLowerCase() === expected.toLowerCase();
}

/**
 * Convert bytes32 hex string to normalized format
 */
export function normalizeBytes32(hash: string): string {
  // Remove 0x prefix if present
  const clean = hash.replace(/^0x/, "");
  // Pad to 64 characters
  const padded = clean.padStart(64, "0");
  return "0x" + padded.toLowerCase();
}
