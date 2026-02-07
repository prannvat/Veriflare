# Flare Data Connector (FDC) Integration Guide

## Overview

Veriflare uses the **Flare Data Connector (FDC)** protocol to cryptographically verify off-chain data (GitHub commits, gists) on-chain via **Web2Json attestations**. This enables trustless freelance payments — the smart contract only releases funds after verifying a cryptographic Merkle proof that the work was delivered.

---

## How FDC Works (High-Level)

```
┌─────────────┐
│   Backend   │  1. Prepare attestation request (off-chain)
│   Service   │  2. Submit to FdcHub (on-chain, costs ~0.5 C2FLR)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Flare Data Connector Network (Decentralized)          │
│                                                          │
│  • Data providers fetch GitHub API response            │
│  • Multiple nodes verify the data independently         │
│  • Consensus reached via voting (~90 seconds)           │
│  • Merkle tree built from all verified responses        │
│  • Root stored on-chain in the Relay contract           │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Backend   │  3. Fetch Merkle proof from DA Layer (off-chain)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │  4. User signs & submits proof to smart contract
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Smart Contract (FreelancerEscrow.sol)                  │
│                                                          │
│  • Calls FdcVerification.verifyWeb2Json(proof)          │
│  • Checks Merkle proof against on-chain Merkle root     │
│  • Decodes attested data (commit info, gist content)    │
│  • Validates against job params (repo, author, hash)    │
│  • ✅ Releases payment if all checks pass               │
└─────────────────────────────────────────────────────────┘
```

---

## The 4-Step Attestation Flow

### Step 1: Prepare Request (Off-Chain)
**Where:** Backend service → Verifier server  
**Endpoint:** `POST https://fdc-verifier-coston2.flare.network/Web2Json/prepareRequest`

```typescript
// Example: Attest a GitHub commit
const requestBody = {
  attestationType: "0x576562324a736f6e000...0",  // bytes32("Web2Json")
  sourceId: "0x5075626c6963576562320...0",      // bytes32("PublicWeb2")
  requestBody: {
    url: "https://api.github.com/repos/owner/repo/git/commits/abc123",
    httpMethod: "GET",
    headers: "",
    queryParams: "",
    body: "",
    postProcessJq: `{
      repoFullName: "owner/repo",
      commitSha: .sha,
      treeHash: .tree.sha,
      authorLogin: .author.name,
      commitTimestamp: (.author.date | fromdateiso8601)
    }`,
    abiSignature: "(string repoFullName, string commitSha, string treeHash, string authorLogin, uint256 commitTimestamp)"
  }
}
```

**Returns:** `{ abiEncodedRequest: "0x..." }` — this is the ABI-encoded attestation request.

### Step 2: Submit to FdcHub (On-Chain)
**Where:** Backend service → FdcHub contract  
**Gas Cost:** ~0.5 C2FLR (testnet) or FLR (mainnet)

```typescript
// Resolve FdcHub address from ContractRegistry
const fdcHub = await registry.getContractAddressByName("FdcHub");

// Submit with fee
await fdcHub.requestAttestation(abiEncodedRequest, { value: parseEther("0.5") });
```

**What happens:**
- The request is broadcast to the Flare data provider network
- The transaction receipt's timestamp determines the **voting round ID**
- Data providers fetch the GitHub API URL independently
- They compare responses and vote on the canonical result

### Step 3: Wait for Finalization (On-Chain Polling)
**Where:** Backend service → Relay contract  
**Duration:** ~90 seconds (one voting round)

```typescript
const relay = await registry.getContractAddressByName("Relay");

// Poll until finalized
while (!await relay.isFinalized(200, votingRound)) {
  await sleep(10_000); // check every 10 seconds
}
```

**Protocol ID 200** = FDC protocol

### Step 4: Fetch Merkle Proof (Off-Chain)
**Where:** Backend service → DA Layer (Data Availability Layer)  
**Endpoint:** `POST https://da-layer-coston2.flare.network/api/v1/fdc/proof-by-request-round-raw`

```typescript
const response = await fetch(`${daLayerUrl}/api/v1/fdc/proof-by-request-round-raw`, {
  method: "POST",
  body: JSON.stringify({
    votingRoundId: votingRound,
    requestBytes: abiEncodedRequest
  })
});

const { data } = await response.json();
// data = {
//   merkleProof: ["0xabc...", "0xdef...", ...],
//   request: { attestationType, sourceId, requestBody, ... },
//   response: { responseBody: { abiEncodedData: "0x..." } }
// }
```

The **abiEncodedData** contains the GitHub API response, ABI-encoded according to the signature we provided in Step 1.

---

## Smart Contract Verification

### How `claimPayment()` Works

```solidity
function claimPayment(bytes32 jobId, Web2JsonProof calldata proof) external {
  Job storage job = jobs[jobId];
  
  // 1️⃣ Verify the Merkle proof
  IFdcVerification fdcVerification = IFdcVerification(
    contractRegistry.getContractAddressByName("FdcVerification")
  );
  require(fdcVerification.verifyWeb2Json(proof), "Invalid proof");
  
  // 2️⃣ Check attestation type
  require(proof.data.attestationType == bytes32("Web2Json"), "Wrong type");
  require(proof.data.sourceId == bytes32("PublicWeb2"), "Wrong source");
  
  // 3️⃣ Decode the attested GitHub commit data
  GitHubCommitAttestation memory commit = abi.decode(
    proof.data.responseBody.abiEncodedData,
    (GitHubCommitAttestation)
  );
  
  // 4️⃣ Validate against job parameters
  require(
    keccak256(bytes(commit.repoFullName)) == keccak256(bytes(job.clientRepo)),
    "Wrong repository"
  );
  require(
    keccak256(bytes(commit.authorLogin)) == keccak256(bytes(job.freelancerGitHub)),
    "Wrong author"
  );
  require(
    keccak256(bytes(commit.treeHash)) == keccak256(abi.encodePacked(job.acceptedSourceHash)),
    "Wrong source code hash"
  );
  require(commit.commitTimestamp <= job.codeDeliveryDeadline, "Too late");
  
  // 5️⃣ All checks passed → release payment
  _releasePayment(jobId, job);
}
```

**Key Security Properties:**
- ✅ **Trustless:** No single entity can forge a proof. The Merkle root is computed by decentralized data providers and stored on-chain.
- ✅ **Cryptographic:** Merkle proofs are computationally infeasible to fake.
- ✅ **Transparent:** All GitHub API responses are publicly verifiable.
- ✅ **Censorship-resistant:** Data providers are distributed across the Flare network.

---

## Usage Examples

### Example 1: Link GitHub Identity

**Frontend Flow:**
1. User creates a gist containing their wallet address: `0x1234...5678`
2. User pastes gist ID (e.g., `abc123def456`) into the UI
3. Frontend calls backend: `POST /api/fdc/attest-gist { gistId: "abc123def456" }`
4. Backend runs the 4-step flow (~2-3 minutes)
5. Backend returns the `Web2JsonProof`
6. Frontend calls contract: `linkGitHub("username", proof)`
7. Contract verifies the gist owner is "username" and content contains the wallet address

**Backend Call:**
```bash
curl -X POST http://localhost:3002/api/fdc/attest-gist \
  -H "Content-Type: application/json" \
  -d '{"gistId": "abc123def456"}'
```

**Response:**
```json
{
  "success": true,
  "proof": {
    "merkleProof": ["0x...", "0x..."],
    "data": {
      "attestationType": "0x576562324a736f6e...",
      "sourceId": "0x5075626c6963576562...",
      "votingRound": 12345,
      "responseBody": {
        "abiEncodedData": "0x..." // (string ownerLogin, string content)
      }
    }
  },
  "attestationId": "att_1707302400000_abc123def"
}
```

### Example 2: Claim Payment After Delivery

**Workflow:**
1. Freelancer pushes code to client's GitHub repo
2. Freelancer notes the commit SHA: `abc123def456789`
3. Freelancer calls: `POST /api/fdc/attest-commit`
4. Backend fetches proof (~2-3 minutes)
5. Freelancer calls contract: `claimPayment(jobId, proof)`
6. Contract verifies:
   - ✅ Commit is in the correct repo
   - ✅ Author is the freelancer's GitHub username
   - ✅ Tree hash matches the accepted deliverable
   - ✅ Commit timestamp is before the deadline
7. Payment released automatically

**Backend Call:**
```bash
curl -X POST http://localhost:3002/api/fdc/attest-commit \
  -H "Content-Type: application/json" \
  -d '{
    "repoFullName": "client/project",
    "commitSha": "abc123def456789"
  }'
```

---

## Development & Testing

### Local Testing (Without Real FDC)

The deploy script auto-detects the network:

```bash
# Local Anvil / Hardhat — deploys MockFlareSetup
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545

# Coston2 testnet — uses real ContractRegistry at 0xaD67...6019
forge script script/Deploy.s.sol --broadcast --rpc-url $COSTON2_RPC_URL
```

**Mock Contracts:**
- `MockContractRegistry` — returns mock addresses
- `MockFdcVerification` — always returns `true` (auto-approve mode)
- `MockProofBuilder` — helper to construct test proofs

```solidity
// In tests
MockFlareSetup setup = new MockFlareSetup();
FreelancerEscrow escrow = new FreelancerEscrow(address(setup.registry()), treasury);

// Build a fake proof
Web2JsonProof memory proof = MockProofBuilder.buildCommitProof(
  "owner/repo",
  "abc123",
  "def456", // tree hash
  "freelancer",
  block.timestamp
);

// This will pass because MockFdcVerification.verifyWeb2Json() returns true
vm.prank(freelancer);
escrow.claimPayment(jobId, proof);
```

### Coston2 Testnet (Real FDC)

**Requirements:**
1. C2FLR tokens (get from faucet: https://faucet.flare.network)
2. Backend private key with ~5 C2FLR balance
3. Environment variables configured

**.env:**
```bash
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
FDC_SUBMITTER_PRIVATE_KEY=0x...
WEB2JSON_VERIFIER_URL_TESTNET=https://fdc-verifier-coston2.flare.network
COSTON2_DA_LAYER_URL=https://da-layer-coston2.flare.network
```

**Deploy:**
```bash
forge script script/Deploy.s.sol \
  --broadcast \
  --rpc-url $COSTON2_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --verify
```

**Test Real Attestation:**
```bash
# Start backend
cd backend && npm run dev

# In another terminal, test the flow
curl -X POST http://localhost:3002/api/fdc/attest-gist \
  -H "Content-Type: application/json" \
  -d '{"gistId": "YOUR_GIST_ID"}'

# Wait ~2-3 minutes, then you'll get the proof
```

---

## Troubleshooting

### "Round finalization timed out"
- **Cause:** Voting round didn't finalize within 5 minutes
- **Fix:** Check Coston2 network status. Voting rounds are ~90 seconds but can be delayed.

### "Invalid proof"
- **Cause:** The Merkle proof doesn't match the on-chain Merkle root
- **Fix:** Ensure you're using the correct voting round ID and the proof was fetched AFTER finalization.

### "Wrong repository" / "Wrong author"
- **Cause:** The attested data doesn't match the job parameters
- **Fix:** Double-check the GitHub repo name format (`"owner/repo"`) and that the commit author matches the freelancer's linked GitHub username.

### "Verifier prepareRequest failed (400)"
- **Cause:** Invalid JQ filter or ABI signature
- **Fix:** Validate your JQ syntax. The output must match the ABI signature exactly.

### Backend: "Transaction receipt is null"
- **Cause:** No C2FLR to pay the attestation fee
- **Fix:** Send ~5 C2FLR to the `FDC_SUBMITTER_PRIVATE_KEY` address from the faucet.

---

## API Reference

### Backend Endpoints

#### `POST /api/fdc/attest-commit`
Full pipeline for commit attestation.

**Request:**
```json
{
  "repoFullName": "owner/repo",
  "commitSha": "abc123def"
}
```

**Response:**
```json
{
  "success": true,
  "proof": { /* Web2JsonProof */ },
  "attestationId": "att_..."
}
```

#### `POST /api/fdc/attest-gist`
Full pipeline for gist attestation.

**Request:**
```json
{
  "gistId": "abc123def"
}
```

#### `GET /api/fdc/status/:attestationId`
Check attestation progress.

**Response:**
```json
{
  "id": "att_...",
  "phase": "waiting",  // preparing | submitted | waiting | finalized | proof-ready | failed
  "votingRound": 12345,
  "createdAt": 1707302400000
}
```

---

## Resources

- **Flare FDC Docs:** https://dev.flare.network/fdc/overview
- **Web2Json Guide:** https://dev.flare.network/fdc/guides/hardhat/web2-json
- **ContractRegistry Address:** `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` (same on Coston2 & Flare mainnet)
- **Coston2 Explorer:** https://coston2-explorer.flare.network
- **Flare Faucet:** https://faucet.flare.network

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│  (Next.js 14 App Router)                                         │
│                                                                   │
│  • User links GitHub (creates gist with wallet address)          │
│  • User claims payment after code delivery                       │
│  • Signs & submits Web2JsonProof to smart contract              │
└──────────────┬───────────────────────────────────────────────────┘
               │
               │ REST API calls
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
│  (Express + ethers.js)                                           │
│                                                                   │
│  • FDCService orchestrates 4-step attestation flow              │
│  • Prepares requests via verifier server (off-chain)            │
│  • Submits to FdcHub (on-chain)                                 │
│  • Polls Relay for finalization                                 │
│  • Fetches Merkle proof from DA Layer                           │
│  • Returns proof to frontend                                    │
└──────┬───────────────────────────────────┬───────────────────────┘
       │                                   │
       │ On-chain calls                    │ Off-chain API calls
       ▼                                   ▼
┌─────────────────────┐          ┌──────────────────────────┐
│  FLARE BLOCKCHAIN   │          │   FDC INFRASTRUCTURE     │
│  (Coston2 / Flare)  │          │  (Decentralized)         │
│                     │          │                          │
│  • ContractRegistry │◄─────────│  • Verifier Server       │
│  • FdcHub           │          │  • Data Providers        │
│  • Relay            │          │  • DA Layer              │
│  • FdcVerification  │          │                          │
│  • FreelancerEscrow │          │                          │
└─────────────────────┘          └──────────────────────────┘
```
