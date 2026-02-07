"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { GitBranch, ExternalLink, Loader2, CheckCircle, AlertCircle, Shield, X } from "lucide-react";
import { FREELANCER_ESCROW_ABI } from "@/lib/contracts";
import { ESCROW_ADDRESS, EXPLORER_URL } from "@/lib/constants";
import { fdc, FdcProgress, FDC_STEPS } from "@/lib/fdc";
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

  // Contract write
  const {
    writeContract: writeLinkGitHub,
    data: linkTxHash,
    isPending: isLinkPending,
    error: linkError,
  } = useWriteContract();

  const { isLoading: isLinkConfirming, isSuccess: isLinkSuccess } =
    useWaitForTransactionReceipt({ hash: linkTxHash });

  // Local state
  const [step, setStep] = useState<"input" | "connecting" | "attesting" | "submitting" | "done">("input");
  const [githubUsername, setGithubUsername] = useState("");
  const [gistId, setGistId] = useState("");
  const [fdcProgress, setFdcProgress] = useState<FdcProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check URL for OAuth callback params
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const callbackGistId = params.get("gistId");
    const callbackUsername = params.get("username");

    if (callbackGistId && callbackUsername && address) {
      setGistId(callbackGistId);
      setGithubUsername(callbackUsername);
      setStep("connecting");

      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);

      // Auto-start attestation
      runAttestation(callbackGistId, callbackUsername);
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
      setError(`Transaction failed: ${linkError.message}`);
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
        body: JSON.stringify({ walletAddress: address }),
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

  const runAttestation = async (gId: string, uname: string) => {
    if (!gId || !address) return;

    setStep("attesting");
    setError(null);
    setFdcProgress(null);

    try {
      const result = await fdc.attestGist(gId, setFdcProgress);

      if (!result.success || !result.proof) {
        throw new Error(result.error || "FDC attestation failed — no proof returned");
      }

      setStep("submitting");

      writeLinkGitHub({
        address: ESCROW_ADDRESS,
        abi: FREELANCER_ESCROW_ABI,
        functionName: "linkGitHub",
        args: [
          uname,
          {
            merkleProof: (result.proof.merkleProof || []) as `0x${string}`[],
            data: {
              attestationType: (result.proof.data?.attestationType ||
                "0x" + "0".repeat(64)) as `0x${string}`,
              sourceId: (result.proof.data?.sourceId ||
                "0x" + "0".repeat(64)) as `0x${string}`,
              votingRound: BigInt(result.proof.data?.votingRound || 0),
              lowestUsedTimestamp: BigInt(result.proof.data?.lowestUsedTimestamp || 0),
              requestBody: {
                url: result.proof.data?.requestBody?.url || "",
                httpMethod: result.proof.data?.requestBody?.httpMethod || "GET",
                headers: result.proof.data?.requestBody?.headers || "",
                queryParams: result.proof.data?.requestBody?.queryParams || "",
                body: result.proof.data?.requestBody?.body || "",
                postProcessJq: result.proof.data?.requestBody?.postProcessJq || "",
                abiSignature: result.proof.data?.requestBody?.abiSignature || "",
              },
              responseBody: {
                abiEncodedData: (result.proof.data?.responseBody?.abiEncodedData ||
                  "0x") as `0x${string}`,
              },
            },
          },
        ],
      });
    } catch (err: any) {
      console.error("GitHub linking error:", err);
      setError(err.message || "Failed to link GitHub");
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
              Click below to authorize via GitHub OAuth. We&apos;ll automatically create a
              verification gist and link your identity using Flare&apos;s FDC.
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

      {/* Step 3: FDC attestation in progress */}
      {step === "attesting" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-400 text-sm font-medium mb-3">FDC Attestation in Progress</p>
            <div className="space-y-2">
              {FDC_STEPS.map((s) => {
                const isActive =
                  fdcProgress?.step === s.step && fdcProgress?.status === "active";
                const isComplete =
                  (fdcProgress && fdcProgress.step > s.step) ||
                  (fdcProgress?.step === s.step && fdcProgress?.status === "complete");

                return (
                  <div key={s.step} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isComplete
                          ? "bg-green-500/20 text-green-400"
                          : isActive
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-white/5 text-white/30"
                      }`}
                    >
                      {isComplete ? (
                        "✓"
                      ) : isActive ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        s.step
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isComplete
                          ? "text-green-400"
                          : isActive
                          ? "text-purple-400"
                          : "text-white/30"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-white/30 text-xs text-center">
            This takes ~2-3 minutes while FDC providers reach consensus...
          </p>
        </div>
      )}

      {/* Step 4: Submitting to contract */}
      {step === "submitting" && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-orange-400 font-medium">Submitting to Contract</p>
          <p className="text-white/40 text-xs mt-1">
            {isLinkPending
              ? "Confirm the transaction in your wallet..."
              : isLinkConfirming
              ? "Waiting for confirmation..."
              : "Processing..."}
          </p>
        </div>
      )}

      {/* How it works */}
      {step === "input" && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/40 text-xs font-medium mb-2">How it works</p>
          <ol className="space-y-1 text-white/30 text-xs">
            <li>1. OAuth authorizes us to create a gist with your wallet address</li>
            <li>2. FDC&apos;s Web2Json attestation verifies the gist ownership</li>
            <li>3. The smart contract verifies the FDC proof and maps your wallet → GitHub</li>
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
