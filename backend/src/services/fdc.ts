import { ethers } from "ethers";

// ═══════════════════════════════════════════════════════════════
//   Real Flare Data Connector (FDC) integration — Web2Json flow
//
//   1. prepareRequest  → POST to verifier server (off-chain)
//   2. submitRequest   → FdcHub.requestAttestation (on-chain, payable)
//   3. waitForRound    → poll Relay.isFinalized(200, roundId)
//   4. fetchProof      → POST to DA Layer for Merkle proof
//   5. return proof    → frontend submits to smart contract
//
//   Reference: https://dev.flare.network/fdc/guides/hardhat/web2-json
// ═══════════════════════════════════════════════════════════════

/* ---------- ABI fragments (minimal) ---------- */

const RELAY_ABI = [
  "function getVotingRoundId(uint256 timestamp) view returns (uint256)",
  "function isFinalized(uint256 protocolId, uint256 roundId) view returns (bool)",
];

const FDC_HUB_ABI = [
  "function requestAttestation(bytes calldata data) external payable",
];

const CONTRACT_REGISTRY_ABI = [
  "function getContractAddressByName(string calldata name) view returns (address)",
];

/* ---------- Constants ---------- */

const FLARE_CONTRACT_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const FDC_PROTOCOL_ID = 200;
const ATTESTATION_TYPE = "0x" + Buffer.from("Web2Json").toString("hex").padEnd(64, "0");
const SOURCE_ID = "0x" + Buffer.from("PublicWeb2").toString("hex").padEnd(64, "0");

/* ---------- Types ---------- */

export interface Web2JsonProof {
  merkleProof: string[];
  data: {
    attestationType: string;
    sourceId: string;
    votingRound: number;
    lowestUsedTimestamp: number;
    requestBody: {
      url: string;
      httpMethod: string;
      headers: string;
      queryParams: string;
      body: string;
      postProcessJq: string;
      abiSignature: string;
    };
    responseBody: {
      abiEncodedData: string;
    };
  };
}

export interface AttestationStatus {
  id: string;
  phase: "preparing" | "submitted" | "waiting" | "finalized" | "proof-ready" | "failed";
  votingRound?: number;
  proof?: Web2JsonProof;
  error?: string;
  createdAt: number;
}

/* ---------- Service ---------- */

export class FDCService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | ethers.HDNodeWallet;
  private registry: ethers.Contract;
  private attestations: Map<string, AttestationStatus> = new Map();

  // Env-configured URLs
  private verifierUrl: string;
  private verifierApiKey: string;
  private daLayerUrl: string;

  constructor() {
    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const privateKey = process.env.FDC_SUBMITTER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "";
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
    } else {
      // Will fail on submit, but allows read-only operations
      this.signer = ethers.Wallet.createRandom().connect(this.provider) as ethers.HDNodeWallet;
    }

    this.registry = new ethers.Contract(FLARE_CONTRACT_REGISTRY, CONTRACT_REGISTRY_ABI, this.provider);

    this.verifierUrl = process.env.WEB2JSON_VERIFIER_URL_TESTNET
      || process.env.VERIFIER_URL_TESTNET
      || "https://fdc-verifier-coston2.flare.network";
    this.verifierApiKey = process.env.VERIFIER_API_KEY_TESTNET || "";
    this.daLayerUrl = process.env.COSTON2_DA_LAYER_URL
      || "https://da-layer-coston2.flare.network";
  }

  // ═══════════════════════════════════════════════════════════
  //   Step 1: Prepare the attestation request via verifier
  // ═══════════════════════════════════════════════════════════

  /**
   * Prepare a Web2Json attestation request for a GitHub commit
   */
  async prepareCommitAttestation(repoFullName: string, commitSha: string): Promise<{
    abiEncodedRequest: string;
    attestationId: string;
  }> {
    const url = `https://api.github.com/repos/${repoFullName}/git/commits/${commitSha}`;

    // JQ filter to extract the fields we care about from the GitHub API response
    // Output must match our ABI signature
    const postProcessJq = [
      `{`,
      `  repoFullName: "${repoFullName}",`,
      `  commitSha: .sha,`,
      `  treeHash: .tree.sha,`,
      `  authorLogin: .author.name,`,
      `  commitTimestamp: (.author.date | fromdateiso8601)`,
      `}`,
    ].join("");

    // ABI signature matching GitHubCommitAttestation struct
    const abiSignature = `(string repoFullName, string commitSha, string treeHash, string authorLogin, uint256 commitTimestamp)`;

    return this._prepareRequest(url, "GET", postProcessJq, abiSignature);
  }

  /**
   * Prepare a Web2Json attestation request for a GitHub gist (identity linking)
   */
  async prepareGistAttestation(gistId: string): Promise<{
    abiEncodedRequest: string;
    attestationId: string;
  }> {
    const url = `https://api.github.com/gists/${gistId}`;

    // JQ: extract owner login and first file content
    const postProcessJq = [
      `{`,
      `  ownerLogin: .owner.login,`,
      `  content: (.files | to_entries | .[0].value.content)`,
      `}`,
    ].join("");

    const abiSignature = `(string ownerLogin, string content)`;

    return this._prepareRequest(url, "GET", postProcessJq, abiSignature);
  }

  /**
   * Generic prepare request — calls the FDC verifier server
   */
  private async _prepareRequest(
    url: string,
    httpMethod: string,
    postProcessJq: string,
    abiSignature: string,
  ): Promise<{ abiEncodedRequest: string; attestationId: string }> {
    const requestBody = {
      attestationType: ATTESTATION_TYPE,
      sourceId: SOURCE_ID,
      requestBody: {
        url,
        httpMethod,
        headers: "",
        queryParams: "",
        body: "",
        postProcessJq,
        abiSignature,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.verifierApiKey) {
      headers["X-API-KEY"] = this.verifierApiKey;
    }

    const resp = await fetch(`${this.verifierUrl}/Web2Json/prepareRequest`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Verifier prepareRequest failed (${resp.status}): ${text}`);
    }

    const json = await resp.json() as any;
    const abiEncodedRequest: string = json.abiEncodedRequest;

    if (!abiEncodedRequest) {
      throw new Error("Verifier returned no abiEncodedRequest");
    }

    const attestationId = this._generateId();
    this.attestations.set(attestationId, {
      id: attestationId,
      phase: "preparing",
      createdAt: Date.now(),
    });

    return { abiEncodedRequest, attestationId };
  }

  // ═══════════════════════════════════════════════════════════
  //   Step 2: Submit to FdcHub on-chain
  // ═══════════════════════════════════════════════════════════

  async submitAttestationRequest(
    abiEncodedRequest: string,
    attestationId: string,
  ): Promise<{ txHash: string; votingRound: number }> {
    // Resolve FdcHub address from registry
    const fdcHubAddr: string = await this.registry.getContractAddressByName("FdcHub");
    const fdcHub = new ethers.Contract(fdcHubAddr, FDC_HUB_ABI, this.signer);

    // Submit with a small fee (the FDC protocol requires a gas-like fee)
    const fee = ethers.parseEther("0.5"); // Coston2 testnet fee
    const tx = await fdcHub.requestAttestation(abiEncodedRequest, { value: fee });
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    // Calculate which voting round this falls in
    const block = await this.provider.getBlock(receipt.blockNumber);
    if (!block) {
      throw new Error("Block not found");
    }

    const relayAddr: string = await this.registry.getContractAddressByName("Relay");
    const relay = new ethers.Contract(relayAddr, RELAY_ABI, this.provider);
    const votingRound: bigint = await relay.getVotingRoundId(block.timestamp);

    // Update status
    const status = this.attestations.get(attestationId);
    if (status) {
      status.phase = "submitted";
      status.votingRound = Number(votingRound);
    }

    return { txHash: receipt.hash, votingRound: Number(votingRound) };
  }

  // ═══════════════════════════════════════════════════════════
  //   Step 3: Wait for voting round finalization
  // ═══════════════════════════════════════════════════════════

  async waitForRoundFinalization(
    votingRound: number,
    attestationId: string,
    maxWaitMs = 300_000, // 5 minutes max
    pollIntervalMs = 10_000, // poll every 10s
  ): Promise<boolean> {
    const relayAddr: string = await this.registry.getContractAddressByName("Relay");
    const relay = new ethers.Contract(relayAddr, RELAY_ABI, this.provider);

    const status = this.attestations.get(attestationId);
    if (status) status.phase = "waiting";

    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const finalized: boolean = await relay.isFinalized(FDC_PROTOCOL_ID, votingRound);
      if (finalized) {
        if (status) status.phase = "finalized";
        return true;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    if (status) {
      status.phase = "failed";
      status.error = "Round finalization timed out";
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════
  //   Step 4: Fetch Merkle proof from DA Layer
  // ═══════════════════════════════════════════════════════════

  async fetchProof(
    abiEncodedRequest: string,
    votingRound: number,
    attestationId: string,
  ): Promise<Web2JsonProof> {
    const resp = await fetch(
      `${this.daLayerUrl}/api/v1/fdc/proof-by-request-round-raw`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          votingRoundId: votingRound,
          requestBytes: abiEncodedRequest,
        }),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`DA Layer proof fetch failed (${resp.status}): ${text}`);
    }

    const json = await resp.json() as any;

    if (!json.data) {
      throw new Error("DA Layer returned no proof data");
    }

    // Decode the raw proof response into our Web2JsonProof structure
    const proof = this._decodeDALayerResponse(json.data);

    const status = this.attestations.get(attestationId);
    if (status) {
      status.phase = "proof-ready";
      status.proof = proof;
    }

    return proof;
  }

  /**
   * Decode the DA Layer response into the Web2JsonProof struct
   * that the smart contract expects
   */
  private _decodeDALayerResponse(rawData: any): Web2JsonProof {
    // The DA Layer returns { merkleProof: string[], request: {...}, response: {...} }
    // We need to reshape it to match our Solidity struct
    return {
      merkleProof: rawData.merkleProof || [],
      data: {
        attestationType: rawData.request?.attestationType || ATTESTATION_TYPE,
        sourceId: rawData.request?.sourceId || SOURCE_ID,
        votingRound: rawData.request?.votingRound || 0,
        lowestUsedTimestamp: rawData.request?.lowestUsedTimestamp || 0,
        requestBody: {
          url: rawData.request?.requestBody?.url || "",
          httpMethod: rawData.request?.requestBody?.httpMethod || "",
          headers: rawData.request?.requestBody?.headers || "",
          queryParams: rawData.request?.requestBody?.queryParams || "",
          body: rawData.request?.requestBody?.body || "",
          postProcessJq: rawData.request?.requestBody?.postProcessJq || "",
          abiSignature: rawData.request?.requestBody?.abiSignature || "",
        },
        responseBody: {
          abiEncodedData: rawData.response?.responseBody?.abiEncodedData || "0x",
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  //   Full flow helpers (convenience methods)
  // ═══════════════════════════════════════════════════════════

  /**
   * Run the full attestation pipeline for a GitHub commit:
   *   prepare → submit → wait → fetch proof
   */
  async attestCommit(
    repoFullName: string,
    commitSha: string,
  ): Promise<{ proof: Web2JsonProof; attestationId: string }> {
    // Step 1
    const { abiEncodedRequest, attestationId } = await this.prepareCommitAttestation(
      repoFullName,
      commitSha,
    );

    // Step 2
    const { votingRound } = await this.submitAttestationRequest(
      abiEncodedRequest,
      attestationId,
    );

    // Step 3
    const finalized = await this.waitForRoundFinalization(votingRound, attestationId);
    if (!finalized) {
      throw new Error("Attestation round did not finalize in time");
    }

    // Step 4
    const proof = await this.fetchProof(abiEncodedRequest, votingRound, attestationId);

    return { proof, attestationId };
  }

  /**
   * Run the full attestation pipeline for a GitHub gist (identity):
   *   prepare → submit → wait → fetch proof
   */
  async attestGist(
    gistId: string,
  ): Promise<{ proof: Web2JsonProof; attestationId: string }> {
    const { abiEncodedRequest, attestationId } = await this.prepareGistAttestation(gistId);

    const { votingRound } = await this.submitAttestationRequest(
      abiEncodedRequest,
      attestationId,
    );

    const finalized = await this.waitForRoundFinalization(votingRound, attestationId);
    if (!finalized) {
      throw new Error("Attestation round did not finalize in time");
    }

    const proof = await this.fetchProof(abiEncodedRequest, votingRound, attestationId);

    return { proof, attestationId };
  }

  // ═══════════════════════════════════════════════════════════
  //   Status / helpers
  // ═══════════════════════════════════════════════════════════

  getAttestationStatus(id: string): AttestationStatus | null {
    return this.attestations.get(id) || null;
  }

  private _generateId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
