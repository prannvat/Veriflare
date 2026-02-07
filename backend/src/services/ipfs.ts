import * as fs from "fs";
import * as path from "path";

// Note: In production, use a proper IPFS client like Pinata SDK
// This is a mock implementation for demo purposes

interface UploadResult {
  hash: string;
  size: number;
  url: string;
}

/**
 * Upload file to IPFS (via Pinata or similar)
 */
export async function uploadToIPFS(
  filePathOrBuffer: string | Buffer,
  filename: string
): Promise<string> {
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    // Mock IPFS upload for demo
    console.log(`[IPFS Mock] Uploading ${filename}`);
    return `Qm${generateMockCID()}`;
  }

  // In production, use Pinata SDK
  // const pinata = new PinataSDK(pinataApiKey, pinataSecretKey);
  // const result = await pinata.pinFileToIPFS(file);
  // return result.IpfsHash;

  // Mock for demo
  return `Qm${generateMockCID()}`;
}

/**
 * Upload JSON to IPFS
 */
export async function uploadJSONToIPFS(
  data: Record<string, unknown>,
  name: string
): Promise<string> {
  const content = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(content);

  return uploadToIPFS(buffer, name);
}

/**
 * Fetch content from IPFS
 */
export async function fetchFromIPFS(hash: string): Promise<Buffer> {
  const gatewayUrl = process.env.IPFS_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/";

  const response = await fetch(`${gatewayUrl}${hash}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Fetch JSON from IPFS
 */
export async function fetchJSONFromIPFS<T>(hash: string): Promise<T> {
  const buffer = await fetchFromIPFS(hash);
  return JSON.parse(buffer.toString());
}

/**
 * Generate IPFS gateway URL
 */
export function getIPFSUrl(hash: string): string {
  const gatewayUrl = process.env.IPFS_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/";
  return `${gatewayUrl}${hash}`;
}

/**
 * Generate mock CID for demo purposes
 */
function generateMockCID(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Build manifest structure
 */
export interface BuildManifest {
  jobId: string;
  buildVersion: string;
  timestamp: number;
  artifacts: {
    name: string;
    type: string;
    hash: string;
    ipfsHash?: string;
    previewUrl?: string;
  }[];
  sourceCodeHash: string;
  freelancerSignature?: string;
  [key: string]: unknown;
}

/**
 * Create and upload build manifest
 */
export async function createBuildManifest(
  jobId: string,
  artifacts: BuildManifest["artifacts"],
  sourceCodeHash: string
): Promise<{ manifest: BuildManifest; ipfsHash: string }> {
  const manifest: BuildManifest = {
    jobId,
    buildVersion: "1.0.0",
    timestamp: Math.floor(Date.now() / 1000),
    artifacts,
    sourceCodeHash,
  };

  const ipfsHash = await uploadJSONToIPFS(manifest, `manifest-${jobId}.json`);

  return { manifest, ipfsHash };
}
