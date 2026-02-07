import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";

// Custom Coston2 testnet chain (primary for development)
const coston2 = {
  id: 114,
  name: "Coston2 Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Coston2 Flare",
    symbol: "C2FLR",
  },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
    public: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" },
  },
  testnet: true,
} as const;

// Flare mainnet (for production)
const flareMainnet = {
  id: 14,
  name: "Flare",
  nativeCurrency: {
    decimals: 18,
    name: "Flare",
    symbol: "FLR",
  },
  rpcUrls: {
    default: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
    public: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Flare Explorer", url: "https://flare-explorer.flare.network" },
  },
  testnet: false,
} as const;

// Use only injected wallets (MetaMask, etc.) to avoid WalletConnect connection errors
// Coston2 is first = default chain for development
export const config = createConfig({
  chains: [coston2, flareMainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Veriflare' }),
  ],
  transports: {
    [coston2.id]: http(),
    [flareMainnet.id]: http(),
  },
  ssr: true,
});

// Contract addresses per chain
export const CONTRACT_ADDRESSES = {
  [coston2.id]: {
    escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "",
    contractRegistry: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019",
  },
  [flareMainnet.id]: {
    escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "",
    contractRegistry: "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019",
  },
} as const;
