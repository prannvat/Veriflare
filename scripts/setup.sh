#!/bin/bash

# Veriflare Setup Script
# Quick setup for development environment

set -e

echo "
╔═══════════════════════════════════════════════╗
║           VERIFLARE SETUP SCRIPT              ║
╚═══════════════════════════════════════════════╝
"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Use npm instead of pnpm for compatibility
echo "✅ Node.js found: $(node --version)"

if ! command -v forge &> /dev/null; then
    echo "⚠️  Foundry not found. Smart contract tests will not work."
    echo "   Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
fi

echo "✅ Prerequisites check complete"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment files
echo ""
echo "🔧 Setting up environment files..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   Created .env from .env.example"
else
    echo "   .env already exists, skipping"
fi

if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=114
EOF
    echo "   Created frontend/.env.local"
else
    echo "   frontend/.env.local already exists, skipping"
fi

# Install contract dependencies
echo ""
echo "📜 Setting up smart contracts..."
cd contracts

if command -v forge &> /dev/null; then
    forge install foundry-rs/forge-std --no-commit 2>/dev/null || echo "   forge-std already installed"
fi

cd ..

echo ""
echo "
╔═══════════════════════════════════════════════╗
║           SETUP COMPLETE! 🎉                  ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Next steps:                                  ║
║                                               ║
║  1. Start frontend:                           ║
║     cd frontend && pnpm dev                   ║
║                                               ║
║  2. Start backend:                            ║
║     cd backend && pnpm dev                    ║
║                                               ║
║  3. Deploy contracts (testnet):               ║
║     cd contracts && forge script \\            ║
║       script/Deploy.s.sol --rpc-url \$RPC     ║
║                                               ║
║  4. Run tests:                                ║
║     cd contracts && forge test                ║
║                                               ║
╚═══════════════════════════════════════════════╝
"
