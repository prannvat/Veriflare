"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { Github, Link as LinkIcon, CheckCircle, Loader2, AlertCircle, Globe, Palette, Music, Camera } from "lucide-react";
import { FREELANCER_ESCROW_ABI } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/lib/wagmi";

export default function ProfilePage() {
  const { address, chain, isConnected } = useAccount();
  const [gitHubUsername, setGitHubUsername] = useState("");
  const [verificationStep, setVerificationStep] = useState<"input" | "verify" | "complete">("input");

  const contractAddress = chain?.id
    ? CONTRACT_ADDRESSES[chain.id as keyof typeof CONTRACT_ADDRESSES]?.escrow
    : undefined;

  // Check if GitHub is already linked
  const { data: linkedGitHub } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: FREELANCER_ESCROW_ABI,
    functionName: "getWalletGitHub",
    args: address ? [address] : undefined,
  });

  const { data: isLinked } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: FREELANCER_ESCROW_ABI,
    functionName: "isGitHubLinked",
    args: address ? [address] : undefined,
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const signatureMessage = address
    ? `Veriflare Identity Verification\n\nWallet: ${address}\nTimestamp: ${Math.floor(Date.now() / 1000)}`
    : "";

  const handleLinkGitHub = () => {
    if (!contractAddress || !gitHubUsername) return;

    // In production, this would use actual FDC proof
    // For demo, we use empty proof (mock FDC accepts all)
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: FREELANCER_ESCROW_ABI,
      functionName: "linkGitHub",
      args: [gitHubUsername, "0x" as `0x${string}`],
    });
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <AlertCircle className="w-12 h-12 text-flare-coral mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-white/60">
            Please connect your wallet to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-light text-white mb-10 tracking-tight">Identity & Credentials</h1>

      {/* Wallet Info */}
      <div className="card mb-8">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-6">Connected Wallet</h2>
        <div className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-white/80 font-medium text-lg font-mono">
              {address?.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-mono text-sm tracking-wide">{address}</p>
            <div className="flex items-center gap-2 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <p className="text-white/40 text-xs uppercase tracking-wide">{chain?.name || "Unknown network"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Identity */}
      <div className="card mb-8">
        <div className="flex items-center gap-3 mb-8">
          <Github className="w-5 h-5 text-white/80" />
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest">GitHub Verification</h2>
        </div>

        {isLinked && linkedGitHub ? (
          // Already linked
          <div className="text-center py-12 bg-white/[0.02] border border-white/[0.05] rounded-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3">
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                     <CheckCircle className="w-3 h-3" />
                     Verified
                 </div>
             </div>
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
              <Github className="w-8 h-8 text-white/80" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Identity Verified
            </h3>
            <p className="text-white/50 mb-6 text-sm">
              Linked to <span className="text-white font-medium">@{linkedGitHub as string}</span>
            </p>
            <a
              href={`https://github.com/${linkedGitHub}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              View GitHub Profile
            </a>
          </div>
        ) : isSuccess ? (
          // Just linked
          <div className="text-center py-12 bg-green-500/[0.02] border border-green-500/10 rounded-xl">
             <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Verification Successful
            </h3>
            <p className="text-white/60 text-sm">
              Your wallet is now linked to <span className="text-white font-medium">@{gitHubUsername}</span>
            </p>
          </div>
        ) : (
          // Not linked yet
          <div className="space-y-8">
            <div className="p-5 bg-blue-500/[0.03] border border-blue-500/10 rounded-xl">
              <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-start justify-center pt-1.5 shrink-0">
                      <span className="text-blue-400 font-serif italic font-bold">i</span>
                  </div>
                  <div>
                    <h4 className="text-white/90 font-medium mb-2 text-sm">
                        Why verify your GitHub?
                    </h4>
                    <ul className="space-y-2">
                        <li className="text-white/60 text-xs flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            Accept freelance jobs that require code verification
                        </li>
                        <li className="text-white/60 text-xs flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            Verify commits and deliverables on-chain via FDC
                        </li>
                        <li className="text-white/60 text-xs flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-white/30"></span>
                            Build reputation tied to your identity
                        </li>
                    </ul>
                  </div>
              </div>
            </div>

            {verificationStep === "input" && (
              <div className="space-y-6">
                <div>
                  <label className="label">GitHub Username</label>
                  <div className="relative">
                    <Github className="absolute left-4 top-3.5 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="username"
                        className="input pl-10"
                        value={gitHubUsername}
                        onChange={(e) => setGitHubUsername(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setVerificationStep("verify")}
                  disabled={!gitHubUsername}
                  className="btn-primary w-full h-11"
                >
                  Start Verification
                </button>
              </div>
            )}

            {verificationStep === "verify" && (
              <div className="space-y-6">
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl relative">
                  <span className="absolute -top-3 left-4 bg-[#0a0a0a] px-2 text-xs text-white/40 uppercase tracking-widest border border-white/10 rounded">Step 1</span>  
                  <h4 className="text-white font-medium mb-3 mt-1">Proof of Ownership</h4>
                  <p className="text-white/50 text-xs mb-4 leading-relaxed">
                    Create a <span className="text-white/80">public gist</span> on GitHub with the following content. This cryptographically links your wallet address to your GitHub account.
                  </p>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-lg font-mono text-xs text-white/70 break-all leading-relaxed relative group">
                    {signatureMessage}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[10px] text-white/30 bg-black/60 px-2 py-1 rounded">Copy</span>
                    </div>
                  </div>
                  <a
                    href="https://gist.github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/80 text-xs font-medium transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    Open GitHub Gist
                  </a>
                </div>

                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl relative">
                   <span className="absolute -top-3 left-4 bg-[#0a0a0a] px-2 text-xs text-white/40 uppercase tracking-widest border border-white/10 rounded">Step 2</span>
                  <h4 className="text-white font-medium mb-3 mt-1">
                    On-Chain Verification
                  </h4>
                  <p className="text-white/50 text-xs mb-4">
                    Once the gist is created, submit the verification transaction to the Flare Data Connector.
                  </p>
                  <button
                    onClick={handleLinkGitHub}
                    disabled={isPending || isConfirming}
                    className="btn-primary w-full flex items-center justify-center gap-2 h-11"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isPending ? "Check Wallet..." : "Verifying..."}
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4" />
                        Verify & Link Identity
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setVerificationStep("input")}
                  className="w-full text-white/30 hover:text-white/60 text-xs transition-colors py-2"
                >
                  Cancel and go back
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portfolio & External Links */}
      <div className="card">
        <div className="flex items-center gap-3 mb-8">
          <Globe className="w-5 h-5 text-white/80" />
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest">Portfolio & Links</h2>
        </div>

        <p className="text-white/50 text-xs mb-6 leading-relaxed">
          Add links to your portfolio, profiles, and work samples. These help clients find and trust you across disciplines.
        </p>

        <div className="space-y-3">
          {[
            { icon: <Globe className="w-4 h-4" />, label: "Portfolio Website", placeholder: "https://yoursite.com" },
            { icon: <Palette className="w-4 h-4" />, label: "Behance / Dribbble", placeholder: "https://behance.net/username" },
            { icon: <Music className="w-4 h-4" />, label: "SoundCloud / Spotify", placeholder: "https://soundcloud.com/username" },
            { icon: <Camera className="w-4 h-4" />, label: "Photography Portfolio", placeholder: "https://500px.com/username" },
          ].map((link, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg group hover:border-white/10 transition-all">
              <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1">{link.label}</label>
                <input
                  type="url"
                  placeholder={link.placeholder}
                  className="w-full bg-transparent text-white/80 text-sm placeholder:text-white/20 focus:outline-none font-mono"
                />
              </div>
              <LinkIcon className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
            </div>
          ))}
        </div>

        <button className="btn-secondary w-full mt-6 h-10 text-sm">
          Save Portfolio Links
        </button>
      </div>
    </div>
  );
}
