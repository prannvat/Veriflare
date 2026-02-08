# Veriflare 🔥

**Trustless Freelance Escrow on Flare Network**

> "Try before you buy" escrow with cryptographic proof of delivery using Flare Data Connector (FDC)

## 🎯 Problem Solved

```
CURRENT FREELANCE PROBLEM:
─────────────────────────
Client: "What if code doesn't work?"
Freelancer: "What if they don't pay after I share code?"

VERIFLARE SOLUTION:
───────────────────
1. Client tests WORKING BUILD (not code)
2. Client accepts → code transferred
3. Transfer VERIFIED on-chain via FDC
4. Payment INSTANT and trustless
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VERIFLARE FLOW                         │
└─────────────────────────────────────────────────────────────┘

  FREELANCER                    PLATFORM                         CLIENT
      │                            │                                │
      │                            │    1. CREATE JOB               │
      │                            │◄───────────────────────────────┤
      │    2. ACCEPT JOB           │                                │
      ├───────────────────────────►│                                │
      │    3. UPLOAD BUILD         │                                │
      ├───────────────────────────►│    4. TEST BUILD ──────────────►
      │                            │    5b. ACCEPT BUILD ◄──────────┤
      │    6. TRANSFER CODE        │                                │
      ├───────────────────────────►│    7. FDC VERIFIES             │
      │    8. INSTANT PAYMENT      │                                │
      │◄───────────────────────────│                                │
```

## 📁 Project Structure

```
veriflare/
├── contracts/           # Solidity smart contracts
│   ├── FreelancerEscrow.sol
│   ├── interfaces/
│   └── mocks/
├── frontend/            # Next.js application
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/             # Node.js API services
│   ├── services/
│   └── routes/
├── scripts/             # Deployment & utility scripts
└── test/                # Contract tests
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Foundry (for smart contracts)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Deploy contracts (testnet)
cd contracts && forge script script/Deploy.s.sol --rpc-url $FLARE_RPC

# Start frontend
cd frontend && pnpm dev

# Start backend
cd backend && pnpm dev
```
BUILT ON FLARE
## 🔐 How FDC Verification Works

1. **GitHub Identity Linking**: User creates a gist with wallet signature, FDC verifies
2. **Code Delivery Proof**: When freelancer pushes to client repo, FDC verifies:
   - Commit exists in correct repository
   - Commit author matches freelancer's linked GitHub
   - Git tree hash matches the `sourceCodeHash` from accepted build
   - Commit was made before delivery deadline

## 🏆 Hackathon Tracks

- **Main Track**: Flare Data Connector for external data verification
- **Bonus**: GitHub API integration as external data source

## 📜 License

MIT
