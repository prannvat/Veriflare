import { http, createConfig } from "wagmi";
import { flare, flareTestnet } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Custom Coston2 testnet chain
const coston2 = {
  id: 114,
  name: "Coston2",
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

export const config = getDefaultConfig({
  appName: "Veriflare",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [flare, coston2],
  transports: {
    [flare.id]: http(),
    [coston2.id]: http(),
  },
  ssr: true,
});

// Contract addresses per chain
export const CONTRACT_ADDRESSES = {
  [flare.id]: {
    escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "",
    fdc: "",
  },
  [coston2.id]: {
    escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "",
    fdc: "",
  },
} as const;
