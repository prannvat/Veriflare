"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { GitBranch, ExternalLink, Loader2, CheckCircle, AlertCircle, Shield, X } from "lucide-react";
import { FREELANCER_ESCROW_ABI } from "@/lib/contracts";
import { ESCROW_ADDRESS, EXPLORER_URL } from "@/lib/constants";
import { useAppStore } from "@/lib/store";

interface LinkGitHubProps {
  onLinked?: (username: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function LinkGitHub({ onLinked, onClose, isModal = false }: LinkGitHubProps) {
  const { address, isConnected } = useAccount();
  const { setGitHubLinked } = useAppStore();

  // Check if already linked
  const { data: linkedUsername, refetch: refetchLinked } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: FREELANCER_ESCROW_ABI,
    functionName: "getWalletGitHub",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: isAlreadyLinked, refetch: refetchIsLinked } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: FREELANCER_ESCROW_ABI,
    functionName: "isGitHubLinked",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Contract write for linkGitHubDirect
  const {
    writeContractAsync: writeLinkGitHubAsync,
    data: linkTxHash,
    isPending: isLinkPending,
    error: linkError,
    reset: resetLinkState,
  } = useWriteContract();

  const { isLoading: isLinkConfirming, isSuccess: isLinkSuccess } =
    useWaitForTransactionReceipt({ hash: linkTxHash });

  // Local state
  const [step, setStep] = useState<"input" | "connecting" | "submitting" | "done">("input");
  const [githubUsername, setGithubUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pendingLinkRef = useRef<{ username: string; signature: string } | null>(null);

  // Check URL for OAuth callback params (signature + username from backend)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const callbackSignature = params.get("signature");
    const callbackUsername = params.get("username");
    const authError = params.get("authError");

    if (authError) {
      setError(decodeURIComponent(authError));
      setStep("input");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (callbackSignature && callbackUsername) {
      setGithubUsername(callbackUsername);

      // Clean URL immediately so refreshes don't re-trigger
      window.history.replaceState({}, "", window.location.pathname);

      if (address) {
        // Wallet connected — submit now
        submitToContract(callbackUsername, callbackSignature);
      } else {
        // Wallet not connected yet — store params for when it connects
        pendingLinkRef.current = { username: callbackUsername, signature: callbackSignature };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If wallet connects after OAuth redirect, submit the stored params
  useEffect(() => {
    if (address && pendingLinkRef.current) {
      const { username, signature } = pendingLinkRef.current;
      pendingLinkRef.current = null;
      setGithubUsername(username);
      submitToContract(username, signature);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // When already linked, show that
  useEffect(() => {
    if (
      isAlreadyLinked &&
      linkedUsername &&
      typeof linkedUsername === "string" &&
      linkedUsername.length > 0
    ) {
      setStep("done");
      setGithubUsername(linkedUsername);
    }
  }, [isAlreadyLinked, linkedUsername]);

  // When link tx confirms
  useEffect(() => {
    if (isLinkSuccess && linkTxHash) {
      setStep("done");
      setGitHubLinked(true, githubUsername);
      refetchLinked();
      refetchIsLinked();
      onLinked?.(githubUsername);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkSuccess, linkTxHash]);

  useEffect(() => {
    if (linkError) {
      console.error("[LinkGitHub] Contract error:", linkError);
      const reason = (linkError as any)?.shortMessage || (linkError as any)?.message || "Transaction failed";
      setError(reason);
      setStep("input");
    }
  }, [linkError]);

  /* ---- handlers ---- */

  const handleConnectGitHub = async () => {
    if (!address) return;

    setStep("connecting");
    setError(null);

    try {
      const response = await fetch("http://localhost:3002/api/auth/github/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          returnUrl: window.location.pathname + window.location.search,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate GitHub OAuth");
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (err: any) {
      console.error("GitHub OAuth init error:", err);
      setError(err.message || "Failed to connect GitHub");
      setStep("input");
    }
  };

  const submitToContract = async (username: string, signature: string) => {
    if (!address) {
      setError("Wallet not connected. Please connect your wallet and try again.");
      setStep("input");
      return;
    }

    setStep("submitting");
    setError(null);
    resetLinkState();

    console.log("[LinkGitHub] Calling linkGitHubDirect:", { username, signature: signature.slice(0, 20) + "...", wallet: address, contract: ESCROW_ADDRESS });

    try {
      const txHash = await writeLinkGitHubAsync({
        address: ESCROW_ADDRESS,
        abi: FREELANCER_ESCROW_ABI,
        functionName: "linkGitHubDirect",
        args: [username, signature as `0x${string}`],
      });
      console.log("[LinkGitHub] Tx submitted:", txHash);
    } catch (err: any) {
      console.error("[LinkGitHub] Contract call failed:", err);
      const reason = err?.shortMessage || err?.message || "Transaction failed";
      setError(reason);
      setStep("input");
    }
  };

  /* ---- render ---- */

  if (!isConnected) {
    return (
      <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
        <Shield className="w-8 h-8 text-white/40 mx-auto mb-3" />
        <p className="text-white/60 text-sm">Connect your wallet to link GitHub</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Link GitHub Identity</h3>
            <p className="text-white/40 text-xs">Required before accepting jobs</p>
          </div>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Already linked */}
      {step === "done" && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">GitHub Linked!</p>
              <p className="text-white/60 text-sm">
                Your wallet is linked to{" "}
                <span className="text-white font-mono">@{githubUsername}</span>
              </p>
            </div>
          </div>
          {linkTxHash && (
            <a
              href={`${EXPLORER_URL}/tx/${linkTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-green-400/70 hover:text-green-400"
            >
              View transaction <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Step 1: Connect GitHub */}
      {step === "input" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-400 text-sm font-medium mb-2">One-Click Verification</p>
            <p className="text-white/50 text-xs">
              Click below to sign in with GitHub. Your identity will be verified via OAuth
              and linked on-chain to your wallet.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleConnectGitHub}
            className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            Connect GitHub
          </button>
        </div>
      )}

      {/* Step 2: Connecting (OAuth redirect) */}
      {step === "connecting" && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-purple-400 font-medium">Connecting to GitHub</p>
          <p className="text-white/40 text-xs mt-1">Redirecting to GitHub OAuth...</p>
        </div>
      )}

      {/* Step 3: Submitting to contract */}
      {step === "submitting" && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-orange-400 font-medium">Linking Identity On-Chain</p>
          <p className="text-white/40 text-xs mt-1">
            {isLinkPending
              ? "Check your wallet extension — a transaction approval popup should appear."
              : isLinkConfirming
              ? "Transaction submitted! Waiting for on-chain confirmation..."
              : "Preparing transaction..."}
          </p>
          {isLinkPending && (
            <p className="text-white/30 text-[10px] mt-3">
              Don&apos;t see a wallet popup? Click the MetaMask extension icon in your browser toolbar.
            </p>
          )}
          <button
            onClick={() => { setStep("input"); setError(null); }}
            className="mt-4 text-white/30 hover:text-white/60 text-xs underline"
          >
            Cancel &amp; go back
          </button>
        </div>
      )}

      {/* How it works */}
      {step === "input" && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/40 text-xs font-medium mb-2">How it works</p>
          <ol className="space-y-1 text-white/30 text-xs">
            <li>1. GitHub OAuth verifies you own the account</li>
            <li>2. Our backend signs a cryptographic attestation of your identity</li>
            <li>3. The smart contract verifies the signature and maps your wallet to GitHub</li>
            <li>
              4. This enables the contract to verify your commit authorship when claiming
              payment
            </li>
          </ol>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg rounded-2xl bg-[#0a0a12] border border-white/10 p-6 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      {content}
    </div>
  );
}
