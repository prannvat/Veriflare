import { Octokit } from "@octokit/rest";
import { ethers } from "ethers";

interface CommitData {
  sha: string;
  treeHash: string;
  author: string;
  timestamp: number;
  message: string;
  [key: string]: unknown;
}

interface AttestationRequest {
  id: string;
  type: string;
  status: "pending" | "completed" | "failed";
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
}

/**
 * FDC Service
 * Handles Flare Data Connector attestation requests and verification
 */
export class FDCService {
  private octokit: Octokit;
  private attestations: Map<string, AttestationRequest> = new Map();

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Request attestation for a GitHub commit
   */
  async requestCommitAttestation(
    repoFullName: string,
    commitHash: string
  ): Promise<AttestationRequest> {
    const id = this.generateAttestationId();
    const [owner, repo] = repoFullName.split("/");

    const request: AttestationRequest = {
      id,
      type: "github-commit",
      status: "pending",
      params: { repoFullName, commitHash },
    };

    this.attestations.set(id, request);

    // In production, this would submit to FDC
    // For demo, we fetch directly and simulate attestation
    try {
      const commitData = await this.fetchCommitData(repoFullName, commitHash);
      request.status = "completed";
      request.result = commitData;
    } catch (error) {
      request.status = "failed";
    }

    return request;
  }

  /**
   * Request attestation for a GitHub gist
   */
  async requestGistAttestation(
    gistId: string,
    expectedContent: string
  ): Promise<AttestationRequest> {
    const id = this.generateAttestationId();

    const request: AttestationRequest = {
      id,
      type: "github-gist",
      status: "pending",
      params: { gistId, expectedContent },
    };

    this.attestations.set(id, request);

    try {
      const { data } = await this.octokit.gists.get({ gist_id: gistId });
      const files = Object.values(data.files || {});
      const content = files.map((f: any) => f.content).join("\n");

      request.status = "completed";
      request.result = {
        gistId,
        owner: data.owner?.login,
        content,
        matchesExpected: content.includes(expectedContent),
      };
    } catch (error) {
      request.status = "failed";
    }

    return request;
  }

  /**
   * Get attestation by ID
   */
  async getAttestation(id: string): Promise<AttestationRequest | null> {
    return this.attestations.get(id) || null;
  }

  /**
   * Fetch commit data from GitHub
   */
  async fetchCommitData(repoFullName: string, commitHash: string): Promise<CommitData> {
    const [owner, repo] = repoFullName.split("/");

    const { data: commit } = await this.octokit.git.getCommit({
      owner,
      repo,
      commit_sha: commitHash,
    });

    // Get the author's GitHub username from the commit
    let authorUsername = "";
    try {
      const { data: commitFull } = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: commitHash,
      });
      authorUsername = commitFull.author?.login || commit.author.name;
    } catch {
      authorUsername = commit.author.name;
    }

    return {
      sha: commit.sha,
      treeHash: commit.tree.sha,
      author: authorUsername,
      timestamp: Math.floor(new Date(commit.author.date).getTime() / 1000),
      message: commit.message,
    };
  }

  /**
   * Generate FDC-compatible proof for commit verification
   */
  async generateCommitProof(
    repoFullName: string,
    commitHash: string,
    commitData: CommitData
  ): Promise<string> {
    // Encode the attestation data for on-chain verification
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    const proof = abiCoder.encode(
      ["string", "string", "bytes32", "string", "uint256"],
      [
        repoFullName,
        commitHash,
        "0x" + commitData.treeHash.padStart(64, "0"),
        commitData.author,
        commitData.timestamp,
      ]
    );

    return proof;
  }

  /**
   * Verify GitHub identity via gist
   */
  async verifyGitHubIdentity(
    gitHubUsername: string,
    walletAddress: string,
    gistId: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const { data } = await this.octokit.gists.get({ gist_id: gistId });

      // Verify gist owner matches claimed username
      if (data.owner?.login.toLowerCase() !== gitHubUsername.toLowerCase()) {
        return { valid: false, error: "Gist owner does not match username" };
      }

      // Verify gist contains the wallet address
      const files = Object.values(data.files || {});
      const content = files.map((f: any) => f.content).join("\n");

      if (!content.toLowerCase().includes(walletAddress.toLowerCase())) {
        return { valid: false, error: "Gist does not contain wallet address" };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: "Failed to fetch gist" };
    }
  }

  /**
   * Generate identity proof for on-chain linking
   */
  async generateIdentityProof(
    gitHubUsername: string,
    walletAddress: string
  ): Promise<string> {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    const proof = abiCoder.encode(
      ["string", "address", "uint256"],
      [gitHubUsername, walletAddress, Math.floor(Date.now() / 1000)]
    );

    return proof;
  }

  /**
   * Generate unique attestation ID
   */
  private generateAttestationId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
