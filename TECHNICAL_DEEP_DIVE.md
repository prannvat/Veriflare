# 🔥 Veriflare Technical Deep Dive

## Complete Guide for Demo Video & Technical Understanding

---

## 📌 Table of Contents

1. [The Problem We Solve](#1-the-problem-we-solve)
2. [Our Solution: Trustless Escrow](#2-our-solution-trustless-escrow)
3. [Flare Data Connector (FDC) Explained](#3-flare-data-connector-fdc-explained)
4. [Technical Architecture](#4-technical-architecture)
5. [Smart Contract Deep Dive](#5-smart-contract-deep-dive)
6. [FDC Integration Flow](#6-fdc-integration-flow)
7. [Frontend/Backend Architecture](#7-frontendbackend-architecture)
8. [Demo Script for Video](#8-demo-script-for-video)

---

## 1. The Problem We Solve

### The Trust Dilemma in Freelancing

```
┌─────────────────────────────────────────────────────────────┐
│                  TRADITIONAL FREELANCE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CLIENT                              FREELANCER            │
│     │                                     │                 │
│     │  "I'll pay after I see the code"   │                 │
│     │──────────────────────────────────►  │                 │
│     │                                     │                 │
│     │  "I'll show code after you pay"    │                 │
│     │  ◄──────────────────────────────── │                 │
│     │                                     │                 │
│     │        😰 DEADLOCK 😰               │                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Client's Fear:** "What if I pay and the code doesn't work?"
**Freelancer's Fear:** "What if they steal my code and don't pay?"

### Current Solutions (All Flawed)

| Solution | Problem |
|----------|---------|
| Escrow platforms (Upwork) | 15-20% fees, centralized trust |
| Milestone payments | Still requires trust at each step |
| Legal contracts | Expensive, slow, hard to enforce internationally |
| Reputation systems | Can be gamed, new users disadvantaged |

---

## 2. Our Solution: Trustless Escrow

### The "Try Before You Buy" Model

```
┌─────────────────────────────────────────────────────────────┐
│                    VERIFLARE FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CLIENT                                                  │
│     └──► Creates job, deposits FLR into smart contract      │
│                                                             │
│  2. FREELANCER                                              │
│     └──► Accepts job, submits WORKING BUILD (not code)      │
│         (demo site, compiled app, watermarked design)       │
│                                                             │
│  3. CLIENT                                                  │
│     └──► Tests the build, verifies it works                 │
│     └──► Accepts the build (commits to paying)              │
│                                                             │
│  4. FREELANCER                                              │
│     └──► Delivers source code/files to agreed location      │
│         (GitHub repo, IPFS, cloud storage)                  │
│                                                             │
│  5. FLARE DATA CONNECTOR                                    │
│     └──► Verifies delivery happened (cryptographic proof)   │
│                                                             │
│  6. SMART CONTRACT                                          │
│     └──► Validates proof, releases payment automatically    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Innovation

**The build hash is locked when client accepts.**

This means:
- Client knows exactly what code they'll get
- Freelancer knows payment is guaranteed if they deliver that exact code
- No trust required — math guarantees the outcome

---

## 3. Flare Data Connector (FDC) Explained

### What is FDC?

The **Flare Data Connector** is Flare's oracle system that brings **off-chain data on-chain** with cryptographic proof. Unlike traditional oracles that just report data, FDC provides **Merkle proofs** that can be verified on-chain.

### Why FDC is Perfect for Veriflare

We need to prove: "This specific code was delivered to this specific location"

Traditional solutions:
- ❌ Manual verification (requires trust)
- ❌ Centralized oracle (single point of failure)
- ❌ Optimistic verification (can be challenged, slow)

FDC solution:
- ✅ Multiple data providers verify independently
- ✅ Consensus mechanism ensures accuracy
- ✅ Merkle proof is mathematically verifiable on-chain
- ✅ ~90 second finality

### FDC Attestation Types

| Type | Use Case |
|------|----------|
| **Web2Json** | Fetch & verify any JSON API response |
| Payment | Verify payment on other chains |
| Balance | Verify token balances |
| AddressValidity | Verify address formats |

**We use Web2Json** to verify:
1. GitHub API responses (commit data)
2. IPFS gateway responses (file hashes)
3. Any URL endpoint (live deployments)

### How Web2Json Works

```
┌─────────────────────────────────────────────────────────────┐
│                   WEB2JSON ATTESTATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: PREPARE REQUEST                                    │
│  ─────────────────────                                      │
│  Your App ──► Verifier Server                               │
│                                                             │
│  Request: {                                                 │
│    url: "https://api.github.com/repos/owner/repo/commits/sha"
│    postProcessJq: "{ sha: .sha, tree: .tree.sha }"         │
│    abiSignature: "(string sha, string tree)"               │
│  }                                                          │
│                                                             │
│  Response: {                                                │
│    abiEncodedRequest: "0x..."  (the attestation request)   │
│  }                                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 2: SUBMIT TO FDCHUB (on-chain)                        │
│  ───────────────────────────────────                        │
│  Your App ──► FdcHub.requestAttestation(abiEncodedRequest)  │
│                                                             │
│  This enters the request into the next voting round         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 3: WAIT FOR CONSENSUS (~90 seconds)                   │
│  ────────────────────────────────────────                   │
│                                                             │
│  Data Provider 1 ──┐                                        │
│  Data Provider 2 ──┼──► Fetch URL, process with JQ          │
│  Data Provider 3 ──┤    Vote on result                      │
│  Data Provider N ──┘    Build Merkle tree                   │
│                                                             │
│  Relay.isFinalized(200, roundId) → true when done          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 4: FETCH MERKLE PROOF                                 │
│  ──────────────────────────                                 │
│  Your App ──► DA Layer API                                  │
│                                                             │
│  Response: {                                                │
│    merkleProof: ["0x...", "0x...", ...],                   │
│    data: {                                                  │
│      attestationType: "Web2Json",                          │
│      responseBody: { abiEncodedData: "0x..." }             │
│    }                                                        │
│  }                                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 5: VERIFY ON-CHAIN                                    │
│  ───────────────────────                                    │
│  Your App ──► YourContract.claimPayment(proof)              │
│                                                             │
│  Contract calls: FdcVerification.verifyWeb2Json(proof)     │
│  If valid → decode data → verify business logic → pay      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VERIFLARE STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    FRONTEND                          │   │
│  │  Next.js 14 + TypeScript + Tailwind                 │   │
│  │  ├── wagmi (wallet connection)                       │   │
│  │  ├── viem (contract interactions)                    │   │
│  │  └── zustand (state management)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           │ REST API                        │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    BACKEND                           │   │
│  │  Express.js + TypeScript                             │   │
│  │  ├── FDC Service (attestation requests)              │   │
│  │  ├── IPFS Service (file uploads)                     │   │
│  │  └── Hash Service (git tree hashing)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           │               │               │                 │
│           ▼               ▼               ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐     │
│  │   FLARE     │  │   FDC       │  │   DA LAYER      │     │
│  │   NETWORK   │  │   VERIFIER  │  │   (Proof API)   │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────────┤     │
│  │ Coston2     │  │ Off-chain   │  │ Merkle proofs   │     │
│  │ Testnet     │  │ Verifier    │  │ after consensus │     │
│  └─────────────┘  └─────────────┘  └─────────────────┘     │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               SMART CONTRACTS                        │   │
│  │  FreelancerEscrow.sol                               │   │
│  │  ├── Job management (create, accept, submit)         │   │
│  │  ├── Build verification (hash matching)              │   │
│  │  ├── FDC proof verification (Merkle proofs)          │   │
│  │  └── Payment release (escrow → freelancer)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Smart Contract Deep Dive

### Key Contract: `FreelancerEscrow.sol`

Located at: `/contracts/src/FreelancerEscrow.sol`

### Job Lifecycle States

```solidity
enum JobStatus {
    Open,           // 0: Job posted, waiting for freelancer
    InProgress,     // 1: Freelancer accepted, working
    BuildSubmitted, // 2: Build submitted, awaiting client review
    BuildAccepted,  // 3: Client accepted, awaiting code delivery
    Completed,      // 4: FDC verified, payment released
    Disputed,       // 5: In dispute resolution
    Cancelled       // 6: Job cancelled
}
```

### State Diagram

```
         ┌──────────────┐
         │    OPEN      │◄─────────────────┐
         └──────┬───────┘                  │
                │ acceptJob()              │ cancelJob()
                ▼                          │
         ┌──────────────┐                  │
         │ IN_PROGRESS  │──────────────────┘
         └──────┬───────┘
                │ submitBuild()
                ▼
         ┌──────────────┐
         │BUILD_SUBMITTED│
         └───────┬───┬───┘
     acceptBuild()│   │requestChanges()
                 ▼   ▼
         ┌──────────────┐     ┌─────────────┐
         │BUILD_ACCEPTED │     │ (back to    │
         └──────┬───────┘     │ IN_PROGRESS)│
                │              └─────────────┘
                │ claimPayment(proof)
                ▼
         ┌──────────────┐
         │  COMPLETED   │
         └──────────────┘
```

### Critical Functions

#### 1. Create Job (Client)
```solidity
function createJob(
    string calldata clientRepo,      // "owner/repo" for code delivery
    string calldata targetBranch,    // branch to push to
    bytes32 requirementsHash,        // IPFS hash of requirements doc
    uint256 deadline,                // when build must be submitted
    uint256 reviewPeriod             // time to review (max 30 days)
) external payable returns (bytes32 jobId)
```

**What happens:**
1. FLR is escrowed in contract
2. Unique jobId generated
3. Job stored on-chain

#### 2. Accept Job (Freelancer)
```solidity
function acceptJob(bytes32 jobId) external
```

**Requirements:**
- Must have linked GitHub account first
- Job must be Open
- Deadline not passed

#### 3. Submit Build (Freelancer)
```solidity
function submitBuild(
    bytes32 jobId,
    bytes32 buildHash,         // hash of compiled build
    bytes32 sourceCodeHash,    // git tree hash of source
    string calldata previewUrl,
    string calldata buildManifestIpfs
) external
```

**Key insight:** `sourceCodeHash` is the git tree hash. This is what FDC will verify later.

#### 4. Accept Build (Client)
```solidity
function acceptBuild(bytes32 jobId) external
```

**What happens:**
1. Client commits to paying for `sourceCodeHash`
2. 24-hour code delivery window starts
3. No going back — payment is guaranteed if freelancer delivers

#### 5. Claim Payment (Freelancer + FDC Proof)
```solidity
function claimPayment(bytes32 jobId, Web2JsonProof calldata proof) external
```

**The magic happens here:**

```solidity
// Step 1: Verify Merkle proof via FdcVerification
IFdcVerification fdcVerification = IFdcVerification(
    contractRegistry.getContractAddressByName("FdcVerification")
);
require(fdcVerification.verifyWeb2Json(proof), "FDC: invalid proof");

// Step 2: Verify attestation type
require(proof.data.attestationType == bytes32("Web2Json"), "Wrong type");
require(proof.data.sourceId == bytes32("PublicWeb2"), "Wrong source");

// Step 3: Decode the attested GitHub API response
GitHubCommitAttestation memory commit = abi.decode(
    proof.data.responseBody.abiEncodedData,
    (GitHubCommitAttestation)
);

// Step 4: Verify commit matches job parameters
require(commit.repoFullName == job.clientRepo, "Wrong repo");
require(commit.authorLogin == job.freelancerGitHub, "Wrong author");
require(commit.treeHash == job.acceptedSourceHash, "Code mismatch");
require(commit.commitTimestamp <= job.codeDeliveryDeadline, "Late");

// Step 5: Release payment!
job.status = JobStatus.Completed;
_releasePayment(jobId, job);
```

---

## 6. FDC Integration Flow

### Backend Service: `backend/src/services/fdc.ts`

This is the bridge between your app and Flare's FDC infrastructure.

### Step-by-Step Code Flow

#### Step 1: Prepare Attestation Request

```typescript
async prepareCommitAttestation(repoFullName: string, commitSha: string) {
  const url = `https://api.github.com/repos/${repoFullName}/git/commits/${commitSha}`;

  // JQ filter to extract what we need from GitHub API
  const postProcessJq = `{
    repoFullName: "${repoFullName}",
    commitSha: .sha,
    treeHash: .tree.sha,
    authorLogin: .author.name,
    commitTimestamp: (.author.date | fromdateiso8601)
  }`;

  // ABI signature for Solidity decoding
  const abiSignature = `(string repoFullName, string commitSha, string treeHash, string authorLogin, uint256 commitTimestamp)`;

  // Call verifier server
  const response = await fetch(`${VERIFIER_URL}/Web2Json/prepareRequest`, {
    method: "POST",
    body: JSON.stringify({
      attestationType: "Web2Json",
      sourceId: "PublicWeb2",
      requestBody: { url, httpMethod: "GET", postProcessJq, abiSignature }
    })
  });

  return response.json(); // { abiEncodedRequest: "0x..." }
}
```

#### Step 2: Submit to FdcHub

```typescript
async submitAttestationRequest(abiEncodedRequest: string) {
  const fdcHub = new ethers.Contract(fdcHubAddr, FDC_HUB_ABI, signer);
  
  // Pay the attestation fee
  const tx = await fdcHub.requestAttestation(abiEncodedRequest, {
    value: ethers.parseEther("0.5")  // Testnet fee
  });
  
  await tx.wait();
  
  // Calculate voting round
  const votingRound = await relay.getVotingRoundId(block.timestamp);
  return { txHash: tx.hash, votingRound };
}
```

#### Step 3: Wait for Consensus

```typescript
async waitForRoundFinalization(votingRound: number) {
  while (true) {
    const finalized = await relay.isFinalized(200, votingRound);
    if (finalized) return true;
    await sleep(10000); // Poll every 10 seconds
  }
}
```

#### Step 4: Fetch Merkle Proof

```typescript
async fetchProof(abiEncodedRequest: string, votingRound: number) {
  const response = await fetch(`${DA_LAYER_URL}/api/v1/fdc/proof-by-request-round-raw`, {
    method: "POST",
    body: JSON.stringify({
      votingRoundId: votingRound,
      requestBytes: abiEncodedRequest
    })
  });
  
  return response.json(); // { merkleProof: [...], data: {...} }
}
```

---

## 7. Frontend/Backend Architecture

### Key Files

```
frontend/
├── app/
│   ├── page.tsx           # Landing page
│   ├── jobs/
│   │   ├── page.tsx       # Job listing
│   │   └── [id]/page.tsx  # Job detail + actions
│   └── providers.tsx      # Wagmi + React Query setup
├── components/
│   ├── ConnectButton.tsx  # Wallet connection
│   ├── JobCard.tsx        # Job preview card
│   └── StatusBadge.tsx    # Status indicator
├── lib/
│   ├── wagmi.ts           # Chain config (Coston2, Flare)
│   ├── store.ts           # Zustand state
│   ├── api.ts             # Backend API client
│   └── demo-data.ts       # Test data + FDC simulation
```

### Wallet Configuration

```typescript
// frontend/lib/wagmi.ts

const coston2 = {
  id: 114,
  name: "Coston2 Testnet",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] }
  },
  blockExplorers: {
    default: { url: "https://coston2-explorer.flare.network" }
  }
};

export const config = createConfig({
  chains: [coston2, flareMainnet],
  connectors: [injected(), coinbaseWallet()],
  transports: {
    [coston2.id]: http(),
    [flareMainnet.id]: http()
  }
});
```

### Contract Addresses

```typescript
export const CONTRACT_ADDRESSES = {
  [114]: { // Coston2
    escrow: "0x...",  // Our deployed FreelancerEscrow
    contractRegistry: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"
  },
  [14]: { // Flare Mainnet
    escrow: "0x...",
    contractRegistry: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"
  }
};
```

---

## 8. Demo Script for Video

### Opening (30 seconds)

**Script:**
> "Freelancing has a trust problem. Clients won't pay until they see the code. Freelancers won't share code until they're paid. It's a deadlock.
>
> Veriflare solves this using Flare's Data Connector to create trustless escrow. Let me show you how."

### Demo Flow (3-4 minutes)

#### Scene 1: The Problem (30 sec)
- Show traditional freelance platforms
- Highlight the 15-20% fees
- Mention dispute rates

#### Scene 2: Connect Wallet (30 sec)
**Show:**
1. Navigate to http://localhost:3000
2. Click "Connect Wallet"
3. Connect MetaMask on Coston2
4. Show balance (100 C2FLR from faucet)

**Script:**
> "First, I connect my wallet. We're using Coston2, Flare's testnet. I got free test tokens from the faucet."

#### Scene 3: Browse Jobs (30 sec)
**Show:**
1. Go to /jobs
2. Show the job listings
3. Click on "Brand Identity Package"

**Script:**
> "Here are available jobs. Each one has escrowed payment — the money is already locked in the smart contract."

#### Scene 4: Accept & Submit (1 min)
**Show:**
1. Click "Accept Job"
2. Click "Submit Deliverable"
3. Select example IPFS deliverable
4. Watch FDC progress modal

**Script:**
> "As a freelancer, I accept the job and submit my work. Now watch this — the Flare Data Connector is verifying my delivery.
>
> Step 1: We prepare an attestation request for the FDC verifier.
> Step 2: Submit to the on-chain FdcHub contract.
> Step 3: Data providers verify and reach consensus — this takes about 90 seconds.
> Step 4: We fetch the Merkle proof from the DA Layer.
> Step 5: Proof is verified on-chain.
>
> That proof is cryptographically unforgeable. It proves I delivered exactly what I promised."

#### Scene 5: Approve & Pay (30 sec)
**Show:**
1. Click "Approve & Pay"
2. Watch FDC verification again
3. Show "Job Completed" state

**Script:**
> "The client approves, and payment is released instantly. No middleman. No 15% fee. Just math."

#### Scene 6: Explorer (30 sec)
**Show:**
1. Click "View on Explorer"
2. Show the transaction on Coston2 Explorer

**Script:**
> "And here's the proof on-chain. This transaction shows the exact proof hash and the payment transfer."

### Technical Explanation (1 min)

**Script:**
> "Here's what's happening under the hood:
>
> 1. When a job is created, FLR tokens are locked in our smart contract.
>
> 2. The freelancer submits a build — not the source code, just a demo. The source code hash is recorded.
>
> 3. When the client accepts, they're committing to that exact hash. There's no changing it.
>
> 4. The freelancer delivers code to GitHub. Our backend asks FDC to verify the GitHub commit.
>
> 5. Multiple independent data providers fetch the GitHub API, verify the commit exists, extract the tree hash.
>
> 6. They reach consensus and build a Merkle tree. We get a cryptographic proof.
>
> 7. The smart contract verifies this proof using Flare's FdcVerification contract.
>
> 8. If the tree hash matches what the client accepted — payment is released. Automatic. Trustless."

### Closing (15 sec)

**Script:**
> "Veriflare: Trustless freelance escrow, powered by Flare Data Connector.
>
> No fees. No disputes. Just verified delivery.
>
> Built for Flare Hackathon 2026."

---

## Key Talking Points for Judges

### FDC Usage (Main Track)
- **Web2Json attestation type** for GitHub API verification
- **5-step flow**: Prepare → Submit → Wait → Fetch → Verify
- **Merkle proofs** verified on-chain via `FdcVerification`
- **No centralized oracle** — multiple data providers reach consensus

### Innovation
- "Try before you buy" model — client tests build, not source
- **Hash binding** — source hash locked when build accepted
- **24-hour delivery window** with cryptographic proof of timing

### Technical Depth
- Full Solidity smart contract with FDC integration
- TypeScript backend with real FDC service implementation
- Production-ready frontend with wallet connection

### Real-World Applicability
- Works for any deliverable type (code, design, music, video)
- ~90 second verification (faster than traditional escrow)
- 2.5% platform fee (vs 15-20% on Upwork/Fiverr)

---

## Quick Reference: FDC Endpoints

| Endpoint | URL |
|----------|-----|
| Coston2 RPC | `https://coston2-api.flare.network/ext/C/rpc` |
| Verifier (Testnet) | `https://fdc-verifier-coston2.flare.network` |
| DA Layer (Testnet) | `https://da-layer-coston2.flare.network` |
| Contract Registry | `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` |
| Explorer | `https://coston2-explorer.flare.network` |
| Faucet | `https://faucet.flare.network/coston2` |

---

## Commands to Run Demo

```bash
# Terminal 1: Frontend
cd frontend && npm run dev
# → http://localhost:3000

# Terminal 2: Backend (optional, for real FDC)
cd backend && npx tsx src/index.ts
# → http://localhost:3002

# Get testnet tokens
# → https://faucet.flare.network/coston2
```

---

**Good luck with your demo! 🔥**
