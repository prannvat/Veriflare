# 🔥 Veriflare Demo Guide

## Quick Start (5 minutes to working demo)

### Step 1: Get Testnet Tokens

1. **Install MetaMask** (or use existing)
   - Download from https://metamask.io

2. **Add Coston2 Network to MetaMask**
   - The app will prompt you to add it when you connect
   - Or manually add:
     - Network Name: `Coston2 Testnet`
     - RPC URL: `https://coston2-api.flare.network/ext/C/rpc`
     - Chain ID: `114`
     - Symbol: `C2FLR`
     - Explorer: `https://coston2-explorer.flare.network`

3. **Get Free Testnet Tokens**
   - Go to: https://faucet.flare.network/coston2
   - Enter your wallet address
   - Click "Request C2FLR"
   - You'll receive 100 C2FLR (takes ~30 seconds)

### Step 2: Connect Wallet

1. Open http://localhost:3000
2. Click "Connect Wallet" in the header
3. Select "MetaMask" (or "Injected")
4. Approve the connection
5. If prompted, switch to Coston2 network

### Step 3: Test the Demo Flow

#### As a Freelancer:
1. Go to `/jobs` - you'll see 3 demo jobs
2. Click on any job to view details
3. Click "Accept Job" - this simulates accepting work
4. Click "Submit Deliverable" - select an example deliverable
5. Watch the FDC attestation progress (simulated)
6. See the proof hash and transaction hash

#### As a Client:
1. After a job is submitted, click "Approve & Pay"
2. Watch the FDC verification process
3. See the payment release confirmation

---

## View Transactions on Explorer

After any action, you can view the (simulated) transactions:

- **Coston2 Explorer**: https://coston2-explorer.flare.network
- Search by your wallet address or transaction hash

---

## Troubleshooting

### "Wrong network" error
- Click the chain selector dropdown next to your address
- Select "Coston2 Testnet"

### Wallet not connecting
- Make sure MetaMask is unlocked
- Try refreshing the page
- Clear browser cache if needed

### No testnet tokens
- Visit the faucet again: https://faucet.flare.network/coston2
- Wait 24 hours between requests (faucet limit)

---

## Understanding the FDC Flow

The demo simulates the 5-step Flare Data Connector attestation:

1. **Prepare Request** - Create attestation payload for deliverable URL
2. **Submit to FDC** - Send request to on-chain FdcHub contract
3. **Wait for Consensus** - Data providers verify and vote (~90 seconds in prod)
4. **Fetch Merkle Proof** - Get cryptographic proof from Relay
5. **Verify On-Chain** - Submit proof to verify delivery

In production, this takes ~90 seconds. In demo mode, it's simulated in ~10 seconds.

---

## Real FDC Integration (Production)

To use real FDC attestation:

1. Start the backend server:
   ```bash
   cd backend && npx tsx src/index.ts
   ```

2. The backend calls the real Flare API endpoints:
   - `https://attestation.flare.network/` - Verifier server
   - Contract: `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` - ContractRegistry

3. Real attestations take ~90 seconds for consensus
