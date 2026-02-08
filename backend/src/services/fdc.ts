import { ethers } from "ethers";
import crypto from "crypto";
import { cacheGitHubData } from "../routes/github-cache";

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

/* ---------- Helpers ---------- */

/** Build a JSON ABI signature string from an array of {name, type} pairs.
 *  The Flare verifier requires this format, NOT Solidity shorthand. */
function buildAbiSignature(fields: { name: string; type: string }[]): string {
  const components = fields.map(f => ({
    internalType: f.type,
    name: f.name,
    type: f.type,
  }));
  return JSON.stringify({ components, name: "task", type: "tuple" });
}

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
  private publicBaseUrl: string;

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
      || "https://fdc-verifiers-testnet.flare.network/verifier/web2";
    this.verifierApiKey = process.env.VERIFIER_API_KEY_TESTNET || "00000000-0000-0000-0000-000000000000";
    this.daLayerUrl = process.env.COSTON2_DA_LAYER_URL
      || "https://ctn2-data-availability.flare.network";

    // Public base URL for the GitHub cache proxy.
    // The FDC verifier will fetch from this URL instead of api.github.com
    // (GitHub API is too slow / blocked from the verifier's servers).
    // Set PUBLIC_BACKEND_URL to your ngrok/deployed URL.
    this.publicBaseUrl = process.env.PUBLIC_BACKEND_URL || "";
  }

  /** Set the public base URL at runtime (e.g. after ngrok starts) */
  setPublicBaseUrl(url: string) {
    this.publicBaseUrl = url;
    console.log(`[FDC] Public base URL set to: ${url}`);
  }

  // ═══════════════════════════════════════════════════════════
  //   Step 1: Prepare the attestation request via verifier
  // ═══════════════════════════════════════════════════════════

  /**
   * Prepare a Web2Json attestation request for a GitHub commit.
   *
   * The FDC verifier cannot fetch api.github.com (1-sec timeout / IP blocked),
   * so we pre-fetch the commit data, cache it in our backend, and give the
   * verifier our public proxy URL instead.
   */
  async prepareCommitAttestation(repoFullName: string, commitSha: string): Promise<{
    abiEncodedRequest: string;
    attestationId: string;
  }> {
    if (!this.publicBaseUrl) {
      throw new Error(
        "PUBLIC_BACKEND_URL is not set. The FDC verifier cannot reach api.github.com directly. " +
        "Start ngrok (ngrok http 3002) and set PUBLIC_BACKEND_URL in .env or via /api/fdc/set-public-url."
      );
    }

    // 1. Pre-fetch the commit from GitHub API
    const githubUrl = `https://api.github.com/repos/${repoFullName}/commits/${commitSha}`;
    console.log(`[FDC] Pre-fetching commit from GitHub: ${githubUrl}`);

    const ghResp = await fetch(githubUrl, {
      headers: {
        "User-Agent": "Veriflare-Backend",
        "Accept": "application/json",
        ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });

    if (!ghResp.ok) {
      const text = await ghResp.text();
      if (ghResp.status === 404) {
        throw new Error(
          `Commit not found. The GitHub API returned 404 for repo "${repoFullName}" commit "${commitSha}". ` +
          `Make sure (1) the repo exists at github.com/${repoFullName}, ` +
          `(2) you pushed your code, and (3) the commit SHA is correct (run "git rev-parse HEAD").`
        );
      }
      throw new Error(`GitHub API returned ${ghResp.status}: ${text.substring(0, 200)}`);
    }

    const commitData = await ghResp.json() as any;
    console.log(`[FDC] Got commit data: sha=${commitData.sha}, author=${commitData.author?.login}`);

    // 2. Cache ONLY the minimal fields the JQ filter needs.
    //    The full GitHub commit response can be 100KB+ (diffs, patches, files)
    //    which causes the FDC verifier to timeout. Keep it tiny.
    const minimalData = {
      sha: commitData.sha,
      commit: { tree: { sha: commitData.commit?.tree?.sha } },
      author: { login: commitData.author?.login },
    };
    console.log(`[FDC] Cached minimal data (${JSON.stringify(minimalData).length} bytes)`);

    const cacheKey = crypto.randomBytes(16).toString("hex");
    cacheGitHubData(cacheKey, minimalData);

    // 3. Point the FDC verifier at our cached version
    const proxyUrl = `${this.publicBaseUrl}/api/github-cache/${cacheKey}`;
    console.log(`[FDC] Using proxy URL for verifier: ${proxyUrl}`);

    // JQ filter: extract the 3 fields we need
    const postProcessJq = `{commitSha: .sha, treeHash: .commit.tree.sha, authorLogin: .author.login}`;

    // ABI signature matching GitHubCommitAttestation struct
    const abiSignature = buildAbiSignature([
      { name: "commitSha", type: "string" },
      { name: "treeHash", type: "string" },
      { name: "authorLogin", type: "string" },
    ]);

    return this._prepareRequest(proxyUrl, "GET", postProcessJq, abiSignature);
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

    const abiSignature = buildAbiSignature([
      { name: "ownerLogin", type: "string" },
      { name: "content", type: "string" },
    ]);

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
        headers: "{}",
        queryParams: "{}",
        body: "{}",
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

    console.log(`[FDC] Sending to verifier: ${this.verifierUrl}/Web2Json/prepareRequest`);
    console.log(`[FDC] Request payload:`, JSON.stringify(requestBody, null, 2));

    const resp = await fetch(`${this.verifierUrl}/Web2Json/prepareRequest`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const rawText = await resp.text();
    console.log(`[FDC] Verifier HTTP ${resp.status}, raw response: ${rawText.substring(0, 1000)}`);

    if (!resp.ok) {
      throw new Error(`Verifier prepareRequest failed (${resp.status}): ${rawText}`);
    }

    const json = JSON.parse(rawText);
    console.log(`[FDC] Verifier response:`, JSON.stringify(json));
    const abiEncodedRequest: string = json.abiEncodedRequest;

    if (!abiEncodedRequest) {
      throw new Error(`Verifier returned no abiEncodedRequest: ${JSON.stringify(json)}`);
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
    console.log(`[FDC] Sending 'requestAttestation' tx...`);
    const tx = await fdcHub.requestAttestation(abiEncodedRequest, { value: fee });
    console.log(`[FDC] Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[FDC] Tx mined in block: ${receipt.blockNumber}`);

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
    // Give the DA Layer more breathing room after finalization
    await new Promise((r) => setTimeout(r, 30_000));

    let proof: any = null;
    const maxRetries = 30;
    const retryDelayMs = 10_000;

    // Some DA nodes may expect different encodings of the same bytes.
    // Try 0x-prefixed hex (original), hex without 0x, and base64.
    const hex = abiEncodedRequest.startsWith("0x") ? abiEncodedRequest.slice(2) : abiEncodedRequest;
    const requestVariants = [
      { label: "hex0x", value: abiEncodedRequest },
      { label: "hex", value: hex },
      { label: "base64", value: Buffer.from(hex, "hex").toString("base64") },
    ];

    // The DA Layer occasionally returns 400/404 until it indexes the request.
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`[FDC] Fetching proof (attempt ${attempt + 1}/${maxRetries})...`);

      let success = false;
      for (const variant of requestVariants) {
        const resp = await fetch(
          `${this.daLayerUrl}/api/v1/fdc/proof-by-request-round-raw`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              votingRoundId: votingRound,
              requestBytes: variant.value,
            }),
          },
        );

        if (!resp.ok) {
          const text = await resp.text();
          console.warn(`[FDC] DA Layer response (${resp.status}) using ${variant.label}: ${text}`);
          continue; // try next variant within same attempt
        }

        const json = await resp.json() as any;

        // The DA Layer returns: { proof: string[], response_hex: string }
        // response_hex is the ABI-encoded IWeb2Json.Response struct
        if (json.response_hex !== undefined) {
          proof = json;
          success = true;
          console.log(`[FDC] Proof ready using variant ${variant.label}.`);
          break;
        }
      }

      if (success && proof) break;

      // If response_hex is not available yet, wait and retry
      console.log(`Proof not ready yet. Retrying in ${retryDelayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }

    if (!proof || proof.response_hex === undefined) {
      throw new Error("DA Layer returned no proof data after all retries");
    }

    // Decode the ABI-encoded response_hex to get the IWeb2Json.Response struct
    const decodedProof = this._decodeResponseHex(proof.proof, proof.response_hex);

    const status = this.attestations.get(attestationId);
    if (status) {
      status.phase = "proof-ready";
      status.proof = decodedProof;
    }

    return decodedProof;
  }

  /**
   * Decode the DA Layer response_hex (ABI-encoded IWeb2Json.Response)
   * into the Web2JsonProof struct the smart contract expects.
   * 
   * The response_hex encodes:
   * struct Response {
   *   bytes32 attestationType;
   *   bytes32 sourceId;
   *   uint64 votingRound;
   *   uint64 lowestUsedTimestamp;
   *   RequestBody requestBody;
   *   ResponseBody responseBody;
   * }
   */
  private _decodeResponseHex(merkleProof: string[], responseHex: string): Web2JsonProof {
    // Use ethers to ABI-decode the response
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // The IWeb2Json.Response struct ABI
    const responseType = [
      "tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, " +
      "tuple(string url, string httpMethod, string headers, string queryParams, string body, string postProcessJq, string abiSignature) requestBody, " +
      "tuple(bytes abiEncodedData) responseBody)"
    ];

    const decoded = abiCoder.decode(responseType, responseHex);
    const resp = decoded[0];

    return {
      merkleProof: merkleProof || [],
      data: {
        attestationType: resp.attestationType,
        sourceId: resp.sourceId,
        votingRound: Number(resp.votingRound),
        lowestUsedTimestamp: Number(resp.lowestUsedTimestamp),
        requestBody: {
          url: resp.requestBody.url,
          httpMethod: resp.requestBody.httpMethod,
          headers: resp.requestBody.headers,
          queryParams: resp.requestBody.queryParams,
          body: resp.requestBody.body,
          postProcessJq: resp.requestBody.postProcessJq,
          abiSignature: resp.requestBody.abiSignature,
        },
        responseBody: {
          abiEncodedData: resp.responseBody.abiEncodedData,
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
    console.log(`[FDC] Prepared Gist Attestation: ID=${attestationId}`);
    console.log(`[FDC] ABI Encoded Request (first 50 chars): ${abiEncodedRequest.slice(0, 50)}...`);

    const { votingRound } = await this.submitAttestationRequest(
      abiEncodedRequest,
      attestationId,
    );
    console.log(`[FDC] Submitted Request. Voting Round: ${votingRound}`);

    // Wait for finalization + buffer
    const finalizationBufferMs = 10000; 
    console.log(`[FDC] Waiting for finalization...`);
    const finalized = await this.waitForRoundFinalization(votingRound, attestationId);
    if (!finalized) {
      throw new Error("Attestation round did not finalize in time");
    }
    console.log(`[FDC] Round ${votingRound} finalized. Waiting ${finalizationBufferMs/1000}s for DA Layer sync...`);
    await new Promise(r => setTimeout(r, finalizationBufferMs));

    const proof = await this.fetchProof(abiEncodedRequest, votingRound, attestationId);
    console.log(`[FDC] Proof fetched successfully!`);

    return { proof, attestationId };
  }

  /**
   * Attest a generic URL (IPFS, HTTPS, etc.) via Web2Json
   * Verifies the URL is accessible and returns content hash
   */
  async attestUrl(
    url: string,
  ): Promise<{ proof: Web2JsonProof; attestationId: string; txHash?: string; votingRound?: number }> {
    // Determine URL type and build appropriate request
    let httpMethod = "GET";
    let postProcessJq = `{ url: "${url}", status: "accessible", hash: (. | tostring | @base64) }`;
    let abiSignature = buildAbiSignature([
      { name: "url", type: "string" },
      { name: "status", type: "string" },
      { name: "hash", type: "string" },
    ]);
    
    // For IPFS URLs, convert to gateway
    let fetchUrl = url;
    if (url.startsWith("ipfs://")) {
      const cid = url.replace("ipfs://", "");
      fetchUrl = `https://ipfs.io/ipfs/${cid}`;
      postProcessJq = `{ cid: "${cid}", gateway: "ipfs.io", accessible: true }`;
      abiSignature = buildAbiSignature([
        { name: "cid", type: "string" },
        { name: "gateway", type: "string" },
        { name: "accessible", type: "bool" },
      ]);
    }
    
    const { abiEncodedRequest, attestationId } = await this._prepareRequest(
      fetchUrl,
      httpMethod,
      postProcessJq,
      abiSignature,
    );

    const { txHash, votingRound } = await this.submitAttestationRequest(
      abiEncodedRequest,
      attestationId,
    );

    const finalized = await this.waitForRoundFinalization(votingRound, attestationId);
    if (!finalized) {
      throw new Error("Attestation round did not finalize in time");
    }

    const proof = await this.fetchProof(abiEncodedRequest, votingRound, attestationId);

    return { proof, attestationId, txHash, votingRound };
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
