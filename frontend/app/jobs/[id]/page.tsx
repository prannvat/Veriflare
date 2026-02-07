"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { keccak256, toHex, pad } from "viem";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Clock,
  Wallet,
  User,
  FileText,
  ExternalLink,
  AlertCircle,
  Shield,
  CheckCircle,
  Upload,
  Loader2,
  DollarSign,
  XCircle,
  Zap,
  Hash,
  GitBranch,
  GitCommit,
  Timer,
} from "lucide-react";
import { StatusBadge, FdcVisualizer, LinkGitHub } from "@/components";
import {
  formatFLR,
  formatTimeRemaining,
  truncateAddress,
} from "@/lib/utils";
import { JOB_CATEGORIES, VERIFICATION_TYPES, Job, useAppStore } from "@/lib/store";
import { FREELANCER_ESCROW_ABI } from "@/lib/contracts";
import { JOB_STATUS, ESCROW_ADDRESS, EXPLORER_URL } from "@/lib/constants";
import { FLARE_LINKS, getDeliverableOptionsForCategory } from "@/lib/demo-data";
import { fdc, FdcProgress } from "@/lib/fdc";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const jobId = params.id as string;

  // Store state
  const {
    jobs,
    initDemoJobs,
    getJob,
    acceptJob: storeAcceptJob,
    submitDeliverable: storeSubmitDeliverable,
    approveWork: storeApproveWork,
    completePayment: storeCompletePayment,
    updateJob,
  } = useAppStore();

  // ===== Contract write hooks =====
  const {
    writeContract: writeAcceptJob,
    data: acceptTxHash,
    isPending: isAcceptPending,
    error: acceptError,
    reset: resetAccept,
  } = useWriteContract();

  const {
    writeContract: writeSubmitBuild,
    data: submitTxHash,
    isPending: isSubmitPending,
    error: submitError,
    reset: resetSubmit,
  } = useWriteContract();

  const {
    writeContract: writeAcceptBuild,
    data: approveTxHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: writeClaimPayment,
    data: claimTxHash,
    isPending: isClaimPending,
    error: claimError,
    reset: resetClaim,
  } = useWriteContract();

  // ===== Transaction receipt watchers =====
  const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } =
    useWaitForTransactionReceipt({ hash: acceptTxHash });

  const { isLoading: isSubmitConfirming, isSuccess: isSubmitSuccess } =
    useWaitForTransactionReceipt({ hash: submitTxHash });

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimTxHash });

  // ===== Read on-chain job data =====
  const isBytes32JobId = jobId?.startsWith("0x") && jobId.length === 66;
  // A job is "demo" only if it has a short ID AND is not marked as on-chain in the store
  const localJobForDemoCheck = getJob(jobId);
  const isDemoJob = !isBytes32JobId && !localJobForDemoCheck?.isOnChain;
  // Pad jobId to bytes32 for contract calls (prevents viem encoding errors)
  const bytes32JobId: `0x${string}` = jobId?.startsWith("0x")
    ? pad(jobId as `0x${string}`, { size: 32 })
    : (`0x${"0".repeat(64)}` as `0x${string}`);
  const { data: onChainJob, refetch: refetchOnChainJob } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: FREELANCER_ESCROW_ABI,
    functionName: "getJob",
    args: isBytes32JobId ? [jobId as `0x${string}`] : undefined,
    query: { enabled: isBytes32JobId },
  });

  // Check if current wallet has linked GitHub (required before acceptJob)
  const { data: walletGitHubLinked, refetch: refetchGitHubLinked } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: FREELANCER_ESCROW_ABI,
    functionName: "isGitHubLinked",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Local state
  const [mounted, setMounted] = useState(false);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedDeliverableType, setSelectedDeliverableType] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [commitSha, setCommitSha] = useState("");
  const [showFdcModal, setShowFdcModal] = useState(false);
  const [showLinkGitHubModal, setShowLinkGitHubModal] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [votingRound, setVotingRound] = useState<number | null>(null);
  const [fdcProgress, setFdcProgress] = useState<FdcProgress | null>(null);
  const [fdcResult, setFdcResult] = useState<{ success: boolean; proofHash?: string; txHash?: string; votingRound?: number; error?: string } | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  // Auto-detect: if this is an on-chain job, default to live mode
  useEffect(() => {
    if (isBytes32JobId || localJobForDemoCheck?.isOnChain) {
      setDemoMode(false);
    }
  }, [isBytes32JobId, localJobForDemoCheck?.isOnChain]);

  // Check if backend is available on mount
  useEffect(() => {
    fdc.isAvailable().then(setBackendAvailable);
  }, []);

  // Initialize demo jobs on mount
  useEffect(() => {
    setMounted(true);
    if (jobs.size === 0) {
      initDemoJobs();
    }
  }, []);

  // ===== Sync on-chain tx confirmations to local store =====
  useEffect(() => {
    if (isAcceptSuccess && acceptTxHash) {
      storeAcceptJob(jobId, address || "");
      setLastTxHash(acceptTxHash);
      setTxStatus("success");
      refetchOnChainJob();
    }
  }, [isAcceptSuccess, acceptTxHash]);

  useEffect(() => {
    if (isSubmitSuccess && submitTxHash) {
      setLastTxHash(submitTxHash);
      setTxStatus("success");
      refetchOnChainJob();
    }
  }, [isSubmitSuccess, submitTxHash]);

  useEffect(() => {
    if (isApproveSuccess && approveTxHash) {
      storeApproveWork(jobId);
      setLastTxHash(approveTxHash);
      setTxStatus("success");
      setShowApproveModal(false);
      refetchOnChainJob();
    }
  }, [isApproveSuccess, approveTxHash]);

  // Sync claim payment confirmation
  useEffect(() => {
    if (isClaimSuccess && claimTxHash) {
      storeCompletePayment(jobId);
      setLastTxHash(claimTxHash);
      setTxStatus("success");
      setShowFdcModal(false);
      refetchOnChainJob();
    }
  }, [isClaimSuccess, claimTxHash]);

  // ===== Handle contract errors =====
  useEffect(() => {
    if (acceptError) {
      console.error("Accept job error:", acceptError);
      setTxStatus("error");
    }
    if (submitError) {
      console.error("Submit build error:", submitError);
      setTxStatus("error");
    }
    if (approveError) {
      console.error("Approve build error:", approveError);
      setTxStatus("error");
    }
    if (claimError) {
      console.error("Claim payment error:", claimError);
      setTxStatus("error");
    }
  }, [acceptError, submitError, approveError, claimError]);

  // Determine job source: on-chain data takes precedence if available
  const localJob = getJob(jobId);

  // Build the job object - prefer on-chain data for status
  const job: Job = (() => {
    if (onChainJob && isBytes32JobId) {
      const oc = onChainJob as any;
      return {
        id: jobId,
        client: oc.client || localJob?.client || "0x0000000000000000000000000000000000000000",
        freelancer: oc.freelancer || localJob?.freelancer || "0x0000000000000000000000000000000000000000",
        freelancerGitHub: oc.freelancerGitHub || localJob?.freelancerGitHub || "",
        paymentAmount: oc.paymentAmount ?? localJob?.paymentAmount ?? BigInt(0),
        paymentToken: oc.paymentToken || localJob?.paymentToken || "0x0000000000000000000000000000000000000000",
        clientRepo: oc.clientRepo || localJob?.clientRepo || "",
        targetBranch: oc.targetBranch || localJob?.targetBranch || "",
        requirementsHash: oc.requirementsHash || localJob?.requirementsHash || "",
        acceptedBuildHash: oc.acceptedBuildHash || localJob?.acceptedBuildHash || "",
        acceptedSourceHash: oc.acceptedSourceHash || localJob?.acceptedSourceHash || "",
        deadline: Number(oc.deadline ?? localJob?.deadline ?? 0),
        reviewPeriod: Number(oc.reviewPeriod ?? localJob?.reviewPeriod ?? 0),
        codeDeliveryDeadline: Number(oc.codeDeliveryDeadline ?? localJob?.codeDeliveryDeadline ?? 0),
        status: Number(oc.status ?? localJob?.status ?? 0),
        category: localJob?.category || "development",
        title: localJob?.title || oc.clientRepo || "On-Chain Job",
        verificationType: localJob?.verificationType || "ipfs_delivery",
      };
    }

    return localJob || {
      id: jobId,
      client: "0x1234567890123456789012345678901234567890",
      freelancer: "0x0000000000000000000000000000000000000000",
      freelancerGitHub: "",
      paymentAmount: BigInt("5000000000000000000"),
      paymentToken: "0x0000000000000000000000000000000000000000",
      clientRepo: "ipfs://demo",
      targetBranch: "main",
      requirementsHash: "0x...",
      acceptedBuildHash: "",
      acceptedSourceHash: "",
      deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
      reviewPeriod: 86400 * 3,
      codeDeliveryDeadline: 0,
      status: 0,
      category: "design" as const,
      title: "Demo Job",
      verificationType: "ipfs_delivery" as const,
    };
  })();

  // Determine user role
  const isClient = address?.toLowerCase() === job.client.toLowerCase();
  const isFreelancer = job.freelancer !== "0x0000000000000000000000000000000000000000" &&
                       address?.toLowerCase() === job.freelancer.toLowerCase();
  const isOpen = job.status === JOB_STATUS.Open;
  const canAccept = isConnected && isOpen;
  const canSubmit = job.status === JOB_STATUS.InProgress;
  const canApprove = job.status === JOB_STATUS.BuildSubmitted;
  const canClaim = job.status === JOB_STATUS.BuildAccepted;

  const category = JOB_CATEGORIES.find(c => c.value === job.category);
  const verification = VERIFICATION_TYPES.find(v => v.value === job.verificationType);

  // ==================== ACTIONS ====================

  const handleAcceptJob = async () => {
    if (!address) return;
    setTxStatus("pending");
    resetAccept();

    if (demoMode || isDemoJob) {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        storeAcceptJob(jobId, address);
        setTxStatus("success");
        setLastTxHash(null);
      } catch (error) {
        console.error("Failed to accept job:", error);
        setTxStatus("error");
      }
    } else {
      // Live mode: check if GitHub is linked first
      if (!walletGitHubLinked) {
        setTxStatus("idle");
        setShowLinkGitHubModal(true);
        return;
      }

      try {
        writeAcceptJob({
          address: ESCROW_ADDRESS,
          abi: FREELANCER_ESCROW_ABI,
          functionName: "acceptJob",
          args: [bytes32JobId],
        });
      } catch (error) {
        console.error("Failed to accept job:", error);
        setTxStatus("error");
      }
    }
  };

  const handleSubmitDeliverable = async () => {
    if (!deliveryUrl) return;
    setIsSubmitting(true);
    setTxStatus("pending");
    setShowSubmitModal(false);
    resetSubmit();

    if (demoMode || isDemoJob) {
      // Demo: show FDC simulation for visual effect
      setShowFdcModal(true);
      setFdcProgress(null);
      setFdcResult(null);

      try {
        const result = await fdc.simulatedAttestation(deliveryUrl, setFdcProgress);
        setFdcResult(result);

        if (result.success) {
          const deliveryHash = result.proofHash || "0x" + Array.from({length: 64}, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
          storeSubmitDeliverable(jobId, deliveryUrl, deliveryHash);
          setProofHash(result.proofHash || null);
          setLastTxHash(result.txHash || null);
          setVotingRound(result.votingRound || null);
          setTxStatus("success");
        } else {
          setTxStatus("error");
        }
      } catch (error) {
        console.error("Failed to submit:", error);
        setFdcResult({ success: false, error: String(error) });
        setTxStatus("error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Live mode: direct on-chain submitBuild call — no FDC needed here
      // FDC attestation happens later when freelancer calls claimPayment
      try {
        const buildHash = keccak256(toHex(deliveryUrl));
        const sourceCodeHash = keccak256(toHex(`source:${deliveryUrl}`));

        writeSubmitBuild({
          address: ESCROW_ADDRESS,
          abi: FREELANCER_ESCROW_ABI,
          functionName: "submitBuild",
          args: [
            bytes32JobId,
            buildHash,
            sourceCodeHash,
            deliveryUrl,
            "", // buildManifestIpfs — can be empty for now
          ],
        });

        storeSubmitDeliverable(jobId, deliveryUrl, buildHash);
      } catch (error) {
        console.error("Failed to submit build:", error);
        setTxStatus("error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleApproveWork = async () => {
    setTxStatus("pending");
    setShowApproveModal(false);
    resetApprove();

    if (demoMode || isDemoJob) {
      // Demo: simulate the approval flow visually
      setShowFdcModal(true);
      setFdcProgress(null);
      setFdcResult(null);

      try {
        const result = await fdc.simulatedAttestation(job.clientRepo, setFdcProgress);
        setFdcResult(result);

        if (result.success) {
          storeApproveWork(jobId);
          setProofHash(result.proofHash || null);
          setLastTxHash(result.txHash || null);
          setVotingRound(result.votingRound || null);
          setTxStatus("success");
        } else {
          setTxStatus("error");
        }
      } catch (error) {
        console.error("Failed to approve:", error);
        setFdcResult({ success: false, error: String(error) });
        setTxStatus("error");
      }
    } else {
      // Live mode: Client signs acceptBuild with their wallet
      // This is a direct contract call — no FDC needed
      // FDC attestation only happens when freelancer claims payment
      try {
        writeAcceptBuild({
          address: ESCROW_ADDRESS,
          abi: FREELANCER_ESCROW_ABI,
          functionName: "acceptBuild",
          args: [bytes32JobId],
        });
      } catch (error) {
        console.error("Failed to approve:", error);
        setTxStatus("error");
      }
    }
  };

  const handleClaimPayment = async () => {
    if (!commitSha && !demoMode && !isDemoJob && job.verificationType === "github_commit") {
      // Need commit SHA for live github_commit jobs — show modal
      setShowClaimModal(true);
      return;
    }

    setTxStatus("pending");
    setShowClaimModal(false);
    setShowFdcModal(true);
    setFdcProgress(null);
    setFdcResult(null);
    resetClaim();

    if (demoMode || isDemoJob) {
      // Demo: simulate the full FDC → payment flow
      try {
        const result = await fdc.simulatedAttestation(job.acceptedBuildHash || job.clientRepo, setFdcProgress);
        setFdcResult(result);

        if (result.success) {
          storeCompletePayment(jobId);
          setProofHash(result.proofHash || null);
          setLastTxHash(result.txHash || null);
          setVotingRound(result.votingRound || null);
          setTxStatus("success");
        } else {
          setTxStatus("error");
        }
      } catch (error) {
        console.error("Failed to claim:", error);
        setFdcResult({ success: false, error: String(error) });
        setTxStatus("error");
      }
    } else {
      // Live mode: Real FDC attestation → get proof → claimPayment on-chain
      try {
        const repoName = job.clientRepo;
        const sha = commitSha;
        let result;

        if (!backendAvailable) {
          // Backend unavailable — cannot do real FDC, show error
          setFdcResult({ success: false, error: "Backend server is unavailable. Start the backend with a funded FDC wallet to submit real attestations." });
          setTxStatus("error");
          return;
        }

        // Run real FDC attestation through backend
        if (sha && repoName) {
          result = await fdc.attestCommit(repoName, sha, setFdcProgress);
        } else {
          result = await fdc.attestUrl(job.clientRepo, setFdcProgress);
        }

        setFdcResult(result);

        if (result.success && result.proof) {
          // We have a real FDC proof — call claimPayment on-chain
          setProofHash(result.proofHash || null);
          setVotingRound(result.votingRound || null);

          writeClaimPayment({
            address: ESCROW_ADDRESS,
            abi: FREELANCER_ESCROW_ABI,
            functionName: "claimPayment",
            args: [
              bytes32JobId,
              {
                merkleProof: (result.proof.merkleProof || []) as `0x${string}`[],
                data: {
                  attestationType: result.proof.data?.attestationType || ("0x" + "0".repeat(64)) as `0x${string}`,
                  sourceId: result.proof.data?.sourceId || ("0x" + "0".repeat(64)) as `0x${string}`,
                  votingRound: BigInt(result.proof.data?.votingRound || result.votingRound || 0),
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
                    abiEncodedData: (result.proof.data?.responseBody?.abiEncodedData || "0x") as `0x${string}`,
                  },
                },
              },
            ],
          });
        } else {
          // FDC attestation failed — show error
          setTxStatus("error");
        }
      } catch (error) {
        console.error("Failed to claim payment:", error);
        setFdcResult({ success: false, error: String(error) });
        setTxStatus("error");
      }
    }
  };

  // ===== Helper: is any tx in-flight? =====
  const isTxPending = isAcceptPending || isAcceptConfirming ||
                      isSubmitPending || isSubmitConfirming ||
                      isApprovePending || isApproveConfirming ||
                      isClaimPending || isClaimConfirming ||
                      txStatus === "pending";

  // ==================== RENDER ====================

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
      {/* Back Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-10 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Transaction Mode Toggle */}
      {isConnected && (
        <div className={`mb-6 p-4 rounded-xl border ${
          demoMode
            ? "bg-amber-500/5 border-amber-500/15"
            : "bg-green-500/5 border-green-500/15"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                demoMode ? "bg-amber-500/20" : "bg-green-500/20"
              }`}>
                {demoMode ? <Zap className="w-4 h-4 text-amber-400" /> : <Shield className="w-4 h-4 text-green-400" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${demoMode ? "text-amber-400" : "text-green-400"}`}>
                  {demoMode ? "Demo Mode — Local State Only" : "Live Mode — Real On-Chain Transactions"}
                </p>
                <p className="text-white/40 text-xs">
                  {isDemoJob
                    ? "This is a demo job. Create a real on-chain job to use Live Mode."
                    : demoMode
                      ? "Actions update UI only. No wallet transactions needed."
                      : "All actions send real transactions to the Coston2 smart contract."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !isDemoJob && setDemoMode(!demoMode)}
              disabled={isDemoJob}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isDemoJob ? "bg-white/10 cursor-not-allowed" : demoMode ? "bg-amber-500" : "bg-green-500"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  demoMode ? "translate-x-1" : "translate-x-8"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Success Banner with Explorer Link */}
      {txStatus === "success" && lastTxHash && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Transaction Confirmed!</p>
              <p className="text-green-400/70 text-xs font-mono">{lastTxHash}</p>
            </div>
          </div>
          <a
            href={`${EXPLORER_URL}/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm transition-colors"
          >
            View on Explorer
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Error Banner */}
      {txStatus === "error" && (acceptError || submitError || approveError || claimError) && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Transaction Failed</p>
            <p className="text-red-400/70 text-xs">
              {(acceptError || submitError || approveError || claimError)?.message?.slice(0, 200) || "Unknown error"}
            </p>
          </div>
          <button
            onClick={() => { setTxStatus("idle"); resetAccept(); resetSubmit(); resetApprove(); resetClaim(); }}
            className="ml-auto text-red-400/50 hover:text-red-400"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Role Indicator */}
      {isConnected && (
        <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
          isClient
            ? "bg-blue-500/10 border border-blue-500/20"
            : isFreelancer
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-white/[0.02] border border-white/[0.06]"
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isClient ? "bg-blue-500/20" : isFreelancer ? "bg-green-500/20" : "bg-white/[0.05]"
          }`}>
            <User className={`w-4 h-4 ${isClient ? "text-blue-400" : isFreelancer ? "text-green-400" : "text-white/50"}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${isClient ? "text-blue-400" : isFreelancer ? "text-green-400" : "text-white/60"}`}>
              {isClient ? "You are the Client" : isFreelancer ? "You are the Freelancer" : "Viewing as Guest"}
            </p>
            <p className="text-white/40 text-xs">
              {isClient
                ? "You posted this job. Review submissions and approve to release payment."
                : isFreelancer
                  ? "You accepted this job. Submit your work when complete."
                  : isOpen
                    ? "You can accept this job to start working on it."
                    : "This job has already been accepted by another freelancer."
              }
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            {category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs">
                <span>{category.icon}</span>
                {category.label}
              </span>
            )}
            <StatusBadge status={job.status} size="lg" />
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight mb-3">
            {job.title || job.clientRepo}
          </h1>
          <p className="text-white/40 font-mono text-xs tracking-wider">
            ID: {jobId?.slice(0, 20)}...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {canAccept && (
            <button
              onClick={handleAcceptJob}
              disabled={isTxPending}
              className="btn-primary flex items-center gap-2"
            >
              {(isAcceptPending || isAcceptConfirming) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isAcceptPending ? "Confirm in wallet..." : isAcceptConfirming ? "Confirming..." : "Accept Job"}
            </button>
          )}

          {canSubmit && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Submit Deliverable
            </button>
          )}

          {canApprove && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve & Pay
            </button>
          )}

          {canClaim && (
            <button
              onClick={() => setShowClaimModal(true)}
              disabled={isTxPending}
              className="btn-primary flex items-center gap-2"
            >
              {(isClaimPending || isClaimConfirming) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              {isClaimPending ? "Confirm in wallet..." : isClaimConfirming ? "Confirming..." : "Claim Payment"}
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {job.status === JOB_STATUS.Completed && (
        <div className="mb-8 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-green-400 font-medium">Job Completed!</p>
            <p className="text-green-400/70 text-sm">Payment has been released to the freelancer.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submitted Deliverable Preview */}
          {job.status >= JOB_STATUS.BuildSubmitted && job.acceptedBuildHash && (
            <div className="card border-green-500/20 bg-green-500/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Deliverable Submitted</h3>
                    <p className="text-white/50 text-sm">
                      {isClient ? "Review the work and approve to release payment" : "Waiting for client review"}
                    </p>
                  </div>
                </div>
                {job.status === JOB_STATUS.BuildSubmitted && isClient && (
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Pay
                  </button>
                )}
              </div>

              {/* Deliverable Details */}
              <div className="space-y-4">
                <div className="p-4 bg-black/30 rounded-xl">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Delivery Location</p>
                  <p className="text-white font-mono text-sm break-all">{job.clientRepo}</p>
                </div>

                <div className="p-4 bg-black/30 rounded-xl">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Delivery Hash (FDC Verified)</p>
                  <p className="text-white font-mono text-xs break-all">{job.acceptedBuildHash}</p>
                </div>

                {/* Preview Links */}
                <div className="flex gap-3 pt-2">
                  <a
                    href={job.clientRepo.startsWith("ipfs://")
                      ? `https://ipfs.io/ipfs/${job.clientRepo.replace("ipfs://", "")}`
                      : job.clientRepo.startsWith("http")
                        ? job.clientRepo
                        : `https://github.com/${job.clientRepo}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Deliverable
                  </a>
                  <a
                    href={`${EXPLORER_URL}/tx/${job.acceptedBuildHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white flex items-center gap-2 text-sm transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    View FDC Proof
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Action Card for Freelancer - Submit Work */}
          {isFreelancer && canSubmit && (
            <div className="card border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Ready to Submit?</h3>
                  <p className="text-white/50 text-sm">Upload your deliverable to get paid</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Submit your work via IPFS, GitHub, or URL. The Flare Data Connector will cryptographically verify your delivery on-chain.
              </p>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Submit Deliverable
              </button>
            </div>
          )}

          {/* Action Card for Freelancer - Push Code to Repo (after client approval) */}
          {isFreelancer && canClaim && (
            <div className="card border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <GitCommit className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Push Code & Claim Payment</h3>
                  <p className="text-white/50 text-sm">Client approved your build — now deliver the source code</p>
                </div>
              </div>

              {/* Code Delivery Deadline Countdown */}
              {job.codeDeliveryDeadline > 0 && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  job.codeDeliveryDeadline * 1000 > Date.now()
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    <Timer className={`w-4 h-4 ${
                      job.codeDeliveryDeadline * 1000 > Date.now() ? "text-amber-400" : "text-red-400"
                    }`} />
                    <span className={`text-sm font-medium ${
                      job.codeDeliveryDeadline * 1000 > Date.now() ? "text-amber-400" : "text-red-400"
                    }`}>
                      {job.codeDeliveryDeadline * 1000 > Date.now()
                        ? `⏰ Code delivery deadline: ${mounted ? formatTimeRemaining(job.codeDeliveryDeadline) : "--"}`
                        : "⚠️ Code delivery deadline has passed!"
                      }
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    You have 24 hours from client approval to push your code and claim payment.
                  </p>
                </div>
              )}

              {/* 3-Step Flow */}
              <div className="mb-5 space-y-3">
                {/* Step A: Push */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-400 text-xs font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Push your code to the client&apos;s repo</p>
                    <div className="mt-2 p-3 bg-black/40 rounded-lg flex items-center gap-3">
                      <GitBranch className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div>
                        <a
                          href={`https://github.com/${job.clientRepo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-mono text-sm hover:text-purple-400 transition-colors"
                        >
                          {job.clientRepo}
                          <ExternalLink className="w-3 h-3 inline ml-1 opacity-50" />
                        </a>
                        {job.targetBranch && (
                          <p className="text-white/40 text-xs mt-0.5">Branch: <span className="text-white/70 font-mono">{job.targetBranch}</span></p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 p-3 bg-black/30 rounded-lg font-mono text-xs text-white/60 space-y-1">
                      <p className="text-white/30"># Add client repo as remote & push</p>
                      <p>git remote add client https://github.com/{job.clientRepo || "owner/repo"}.git</p>
                      <p>git push client HEAD:{job.targetBranch || "main"}</p>
                    </div>
                  </div>
                </div>

                {/* Step B: Copy SHA */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-400 text-xs font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Copy your commit SHA</p>
                    <div className="mt-2 p-3 bg-black/30 rounded-lg font-mono text-xs text-white/60">
                      <p>git rev-parse HEAD</p>
                    </div>
                    <p className="text-white/40 text-xs mt-1">This is the 40-character hash that identifies your commit.</p>
                  </div>
                </div>

                {/* Step C: Claim */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-400 text-xs font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Click &quot;Claim Payment&quot; and paste the SHA</p>
                    <p className="text-white/40 text-xs mt-1">
                      This triggers an FDC attestation request — Flare&apos;s decentralized validators will query the GitHub API, 
                      verify your commit (author, tree hash, timestamp), and produce a cryptographic proof. 
                      The proof is then submitted to the smart contract which validates it and releases your payment.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowClaimModal(true)}
                disabled={isTxPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Claim Payment
              </button>
            </div>
          )}

          {/* Requirements */}
          <div className="card">
            <h3 className="text-lg font-medium text-white mb-6">Requirements</h3>
            <div className="space-y-4">
              {/* Requirements Hash (on-chain) */}
              {job.requirementsHash && job.requirementsHash !== "0x..." && (
                <div className="p-4 bg-black/30 rounded-xl">
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Requirements Hash (On-Chain)</p>
                  <p className="text-white font-mono text-xs break-all">{job.requirementsHash}</p>
                </div>
              )}

              {/* Delivery Target */}
              <div className="p-4 bg-black/30 rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Delivery Target</p>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-white/40" />
                  <span className="text-white text-sm font-mono">{job.clientRepo || "—"}</span>
                </div>
                {job.targetBranch && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <GitCommit className="w-4 h-4 text-white/40" />
                    <span className="text-white/80 text-sm font-mono">Branch: {job.targetBranch}</span>
                  </div>
                )}
              </div>

              {/* Verification Method */}
              <div className="p-4 bg-black/30 rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Verification Method</p>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white/40" />
                  <span className="text-white text-sm">{verification?.label || "FDC Attestation"}</span>
                </div>
                <p className="text-white/40 text-xs mt-1">{verification?.description || ""}</p>
              </div>
            </div>

            {job.requirementsHash && job.requirementsHash.startsWith("0x") && (
              <div className="mt-6 pt-6 border-t border-white/[0.05]">
                <a
                  href={`${EXPLORER_URL}/tx/${job.requirementsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white flex items-center gap-2 text-xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View requirements hash on explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="card bg-white/[0.02]">
            <h3 className="text-lg font-medium text-white mb-2">How This Works</h3>
            <p className="text-white/40 text-xs mb-6">Trustless escrow powered by Flare Data Connector (FDC)</p>
            <div className="space-y-1">
              {/* Step 1: Freelancer Accepts */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    job.status >= JOB_STATUS.InProgress ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                  }`}>
                    {job.status >= JOB_STATUS.InProgress ? <CheckCircle className="w-4 h-4" /> : <span>1</span>}
                  </div>
                  <div className={`w-px h-6 ${
                    job.status >= JOB_STATUS.InProgress ? 'bg-green-500/30' : 'bg-white/10'
                  }`} />
                </div>
                <div className="pb-4">
                  <p className={`font-medium ${
                    job.status >= JOB_STATUS.InProgress ? 'text-green-400' : 'text-white/80'
                  }`}>
                    Freelancer Accepts Job
                  </p>
                  <p className="text-white/50 text-sm">Links GitHub account and takes on the job</p>
                </div>
              </div>

              {/* Step 2: Build Submitted */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    job.status >= JOB_STATUS.BuildSubmitted ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                  }`}>
                    {job.status >= JOB_STATUS.BuildSubmitted ? <CheckCircle className="w-4 h-4" /> : <span>2</span>}
                  </div>
                  <div className={`w-px h-6 ${
                    job.status >= JOB_STATUS.BuildSubmitted ? 'bg-green-500/30' : 'bg-white/10'
                  }`} />
                </div>
                <div className="pb-4">
                  <p className={`font-medium ${
                    job.status >= JOB_STATUS.BuildSubmitted ? 'text-green-400' : 'text-white/80'
                  }`}>
                    Build Submitted for Review
                  </p>
                  <p className="text-white/50 text-sm">Freelancer submits build hashes + preview URL on-chain</p>
                </div>
              </div>

              {/* Step 3: Client Approves */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    job.status >= JOB_STATUS.BuildAccepted ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                  }`}>
                    {job.status >= JOB_STATUS.BuildAccepted ? <CheckCircle className="w-4 h-4" /> : <span>3</span>}
                  </div>
                  <div className={`w-px h-6 ${
                    job.status >= JOB_STATUS.BuildAccepted ? 'bg-green-500/30' : 'bg-white/10'
                  }`} />
                </div>
                <div className="pb-4">
                  <p className={`font-medium ${
                    job.status >= JOB_STATUS.BuildAccepted ? 'text-green-400' : 'text-white/80'
                  }`}>
                    Client Approves Build
                  </p>
                  <p className="text-white/50 text-sm">Client signs approval on-chain — starts 24h code delivery window</p>
                </div>
              </div>

              {/* Step 4: Freelancer Claims (push + FDC + payment combined) */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    job.status >= JOB_STATUS.Completed ? 'bg-green-500/20 text-green-400' :
                    job.status === JOB_STATUS.BuildAccepted ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-white/10 text-white/40'
                  }`}>
                    {job.status >= JOB_STATUS.Completed ? <CheckCircle className="w-4 h-4" /> : <span>4</span>}
                  </div>
                </div>
                <div>
                  <p className={`font-medium ${
                    job.status >= JOB_STATUS.Completed ? 'text-green-400' :
                    job.status === JOB_STATUS.BuildAccepted ? 'text-purple-400' : 'text-white/80'
                  }`}>
                    Freelancer Claims Payment
                  </p>
                  <p className="text-white/50 text-sm mb-3">
                    The freelancer triggers the entire verification + payment flow:
                  </p>
                  <div className="ml-1 border-l-2 border-white/10 pl-4 space-y-3">
                    <div>
                      <p className="text-white/70 text-sm font-medium">a) Push code to client&apos;s repo</p>
                      <p className="text-white/40 text-xs">
                        Git push to{" "}
                        <span className="font-mono text-white/60">{job.clientRepo || "owner/repo"}</span>
                        {job.targetBranch ? <> branch <span className="font-mono text-white/60">{job.targetBranch}</span></> : ""}
                        {" "}within the 24h window
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium">b) Paste commit SHA & click &quot;Claim Payment&quot;</p>
                      <p className="text-white/40 text-xs">
                        This sends an attestation request to the Flare Data Connector Hub
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium">c) FDC validators verify the commit</p>
                      <p className="text-white/40 text-xs">
                        Validators query GitHub API → check repo, author, tree hash & timestamp → produce a Merkle proof
                      </p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium">d) Proof submitted to smart contract</p>
                      <p className="text-white/40 text-xs">
                        Contract validates the FDC proof on-chain, releases 97.5% to freelancer (2.5% platform fee)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explainer note */}
            <div className="mt-6 pt-4 border-t border-white/[0.05]">
              <p className="text-white/30 text-xs leading-relaxed">
                💡 FDC doesn&apos;t auto-detect your push. <span className="text-white/50">You</span> initiate the verification by clicking &quot;Claim Payment&quot; — 
                this triggers the full attestation → proof → payment pipeline in one click.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* On-Chain Info */}
          {isBytes32JobId && (
            <div className="card border-cyan-500/20 bg-cyan-500/5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                On-Chain Data
              </h3>
              <div className="space-y-3">
                <a
                  href={`${EXPLORER_URL}/address/${ESCROW_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  Contract: {ESCROW_ADDRESS.slice(0, 10)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
                {lastTxHash && (
                  <a
                    href={`${EXPLORER_URL}/tx/${lastTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 text-xs font-mono flex items-center gap-1 transition-colors"
                  >
                    Last Tx: {lastTxHash.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="card">
            <h3 className="text-white font-medium mb-4">Payment</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-light text-white tracking-tight">
                {formatFLR(job.paymentAmount)}
              </span>
            </div>
            <p className="text-white/40 text-xs">
              {job.status < JOB_STATUS.Completed ? "Escrowed in smart contract" : "Payment completed"}
            </p>
            <div className="mt-6 pt-4 border-t border-white/[0.05]">
              <p className="text-white/60 text-xs flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-white/40" />
                Secured by Flare FDC
              </p>
            </div>
          </div>

          {/* Job Details */}
          <div className="card">
            <h3 className="text-white font-medium mb-4">Details</h3>
            <div className="space-y-5">
              {/* Target Repository */}
              {job.clientRepo && (
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                    Target Repository
                  </span>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-white/40" />
                    <a
                      href={`https://github.com/${job.clientRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-sm font-mono hover:text-orange-400 transition-colors"
                    >
                      {job.clientRepo}
                      <ExternalLink className="w-3 h-3 inline ml-1 opacity-50" />
                    </a>
                  </div>
                </div>
              )}

              {/* Target Branch */}
              {job.targetBranch && (
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                    Target Branch
                  </span>
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-white text-sm font-mono">{job.targetBranch}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Verification
                </span>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white text-sm">{verification?.label || "FDC Attestation"}</span>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Deadline
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white text-sm">
                    {mounted ? formatTimeRemaining(job.deadline) : "--"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Review Period
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white text-sm">
                    {Math.floor(job.reviewPeriod / 86400)} days
                  </span>
                </div>
              </div>

              {/* Code Delivery Deadline (shown after client approval) */}
              {job.codeDeliveryDeadline > 0 && (
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                    Code Delivery Deadline
                  </span>
                  <div className="flex items-center gap-2">
                    <Timer className={`w-3.5 h-3.5 ${
                      job.codeDeliveryDeadline * 1000 > Date.now() ? "text-amber-400" : "text-red-400"
                    }`} />
                    <span className={`text-sm ${
                      job.codeDeliveryDeadline * 1000 > Date.now() ? "text-amber-400" : "text-red-400"
                    }`}>
                      {mounted ? formatTimeRemaining(job.codeDeliveryDeadline) : "--"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Parties */}
          <div className="card">
            <h3 className="text-white font-medium mb-4">Parties</h3>
            <div className="space-y-5">
              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Client</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-white/70" />
                  </div>
                  <span className="text-white/90 font-mono text-xs">
                    {truncateAddress(job.client)}
                  </span>
                  {isClient && <span className="text-xs text-blue-400">(You)</span>}
                </div>
              </div>

              {job.freelancer !== "0x0000000000000000000000000000000000000000" ? (
                <div>
                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Freelancer</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center">
                      <User className="w-3 h-3 text-white/70" />
                    </div>
                    <span className="text-white/90 font-mono text-xs">
                      {truncateAddress(job.freelancer)}
                    </span>
                    {isFreelancer && <span className="text-xs text-green-400">(You)</span>}
                  </div>
                </div>
              ) : (
                <div className="text-white/50 text-sm italic">
                  No freelancer assigned yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Deliverable Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Submit Deliverable</h2>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-white/50 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Step 1: Choose Deliverable Type */}
              <div>
                <label className="block text-white/60 text-sm mb-3 font-medium">
                  What are you delivering?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getDeliverableOptionsForCategory(job.category).map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => {
                        setSelectedDeliverableType(opt.type);
                        if (!deliveryUrl) setDeliveryUrl(opt.exampleUrl);
                      }}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedDeliverableType === opt.type
                          ? 'bg-orange-500/10 border-orange-500/30 text-white ring-1 ring-orange-500/20'
                          : 'bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{opt.icon}</span>
                        <span className="font-medium text-xs">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-white/40 leading-tight">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Enter URL */}
              {selectedDeliverableType && (
                <>
                  <div className="border-t border-white/10 pt-4">
                    <label className="block text-white/60 text-sm mb-2 font-medium">
                      {(() => {
                        const opt = getDeliverableOptionsForCategory(job.category).find(o => o.type === selectedDeliverableType);
                        return opt ? `Enter your ${opt.label.toLowerCase()}` : 'Enter deliverable URL';
                      })()}
                    </label>
                    <input
                      type="text"
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      placeholder={
                        getDeliverableOptionsForCategory(job.category).find(o => o.type === selectedDeliverableType)?.placeholder || "https://..."
                      }
                      className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-orange-500/30 focus:ring-1 focus:ring-orange-500/20 font-mono text-sm"
                    />
                    <p className="text-white/30 text-xs mt-1.5">
                      Paste the URL where the client can test or review your work
                    </p>
                  </div>

                  {/* Quick Tips based on type */}
                  {selectedDeliverableType === "testflight" && (
                    <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/10">
                      <p className="text-blue-400/80 text-xs">
                        💡 Go to App Store Connect → TestFlight → invite the client's email, then paste the public link here.
                      </p>
                    </div>
                  )}
                  {selectedDeliverableType === "hosted_website" && (
                    <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/10">
                      <p className="text-blue-400/80 text-xs">
                        💡 Deploy to Vercel/Netlify/Railway and paste the live preview URL. Staging URLs work great too.
                      </p>
                    </div>
                  )}
                  {selectedDeliverableType === "expo_preview" && (
                    <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/10">
                      <p className="text-blue-400/80 text-xs">
                        💡 Run <code className="bg-white/10 px-1 rounded">npx expo publish</code> or use EAS Update, then paste the preview link.
                      </p>
                    </div>
                  )}
                  {selectedDeliverableType === "apk_download" && (
                    <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/10">
                      <p className="text-blue-400/80 text-xs">
                        💡 Upload your .apk to Google Drive (set to "Anyone with link") or use Firebase App Distribution.
                      </p>
                    </div>
                  )}

                  {/* Info about the flow */}
                  {!demoMode && !isDemoJob && (
                    <div className="rounded-lg p-4 border bg-green-500/5 border-green-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">On-Chain Submission</span>
                      </div>
                      <p className="text-white/50 text-xs">
                        This will submit your deliverable hashes on-chain via your wallet. The client will review and approve, 
                        then you&apos;ll claim payment using FDC attestation to verify delivery.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmitDeliverable}
                    disabled={!deliveryUrl || isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Submit for Review
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Approve & Release Payment</h2>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-white/50 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.05] rounded-lg p-4">
                <p className="text-white/60 text-sm mb-2">Payment Amount</p>
                <p className="text-2xl font-semibold text-white">{formatFLR(job.paymentAmount)}</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {demoMode
                    ? "This will update the job status locally. Toggle Live Mode for real on-chain transaction."
                    : "You will sign this transaction with your wallet. This approves the freelancer's build and allows them to claim payment via FDC attestation."
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveWork}
                  disabled={isTxPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {(isApprovePending || isApproveConfirming) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isApprovePending ? "Confirm in wallet..." : "Confirming..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve & Pay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Payment Modal (commit SHA input) */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Claim Payment via FDC</h2>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-white/50 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Target Repo Info */}
              <div className="bg-white/[0.05] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4 text-purple-400" />
                  <p className="text-white/60 text-sm">Target Repository</p>
                </div>
                <p className="text-white font-mono text-sm">{job.clientRepo}</p>
                {job.targetBranch && (
                  <p className="text-white/60 font-mono text-xs mt-1">Branch: {job.targetBranch}</p>
                )}
              </div>

              {/* Code Delivery Deadline */}
              {job.codeDeliveryDeadline > 0 && (
                <div className={`rounded-lg p-3 border ${
                  job.codeDeliveryDeadline * 1000 > Date.now()
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    <Timer className={`w-4 h-4 ${
                      job.codeDeliveryDeadline * 1000 > Date.now() ? "text-amber-400" : "text-red-400"
                    }`} />
                    <span className={`text-sm ${
                      job.codeDeliveryDeadline * 1000 > Date.now() ? "text-amber-400" : "text-red-400"
                    }`}>
                      {job.codeDeliveryDeadline * 1000 > Date.now()
                        ? `Deadline: ${mounted ? formatTimeRemaining(job.codeDeliveryDeadline) : "--"}`
                        : "⚠️ Code delivery deadline has passed"
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Commit SHA Input */}
              <div>
                <label className="block text-white/60 text-sm mb-2 font-medium">
                  Commit SHA
                </label>
                <input
                  type="text"
                  value={commitSha}
                  onChange={(e) => setCommitSha(e.target.value.trim())}
                  placeholder="e.g. a1b2c3d4e5f6..."
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20 font-mono text-sm"
                />
                <p className="text-white/30 text-xs mt-1.5">
                  The commit SHA of the code you pushed to the target repository.
                  Run <code className="bg-white/10 px-1 rounded">git rev-parse HEAD</code> to get it.
                </p>
              </div>

              {/* What happens when you click */}
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">What happens when you click Claim</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="text-purple-400/60 text-xs font-mono w-4 flex-shrink-0">1.</span>
                    <p className="text-white/50 text-xs">Veriflare sends an <span className="text-white/70">attestation request</span> to Flare&apos;s FDC Hub with your commit SHA</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400/60 text-xs font-mono w-4 flex-shrink-0">2.</span>
                    <p className="text-white/50 text-xs">FDC validators <span className="text-white/70">query the GitHub API</span> and verify:</p>
                  </div>
                  <ul className="text-white/50 text-xs ml-6 space-y-1">
                    <li>✓ Commit exists on <span className="text-white/70 font-mono">{job.clientRepo}</span></li>
                    <li>✓ Author matches your linked GitHub account</li>
                    <li>✓ Tree hash matches the accepted source hash</li>
                    <li>✓ Commit timestamp is within the 24h delivery window</li>
                  </ul>
                  <div className="flex gap-2">
                    <span className="text-purple-400/60 text-xs font-mono w-4 flex-shrink-0">3.</span>
                    <p className="text-white/50 text-xs">Validators produce a <span className="text-white/70">Merkle proof</span> which is submitted to the smart contract</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400/60 text-xs font-mono w-4 flex-shrink-0">4.</span>
                    <p className="text-white/50 text-xs">Contract <span className="text-white/70">validates the proof on-chain</span> and releases your payment</p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white/[0.05] rounded-lg p-4">
                <p className="text-white/60 text-sm mb-1">You will receive</p>
                <p className="text-2xl font-semibold text-white">{formatFLR(job.paymentAmount)}</p>
                <p className="text-white/30 text-xs mt-1">Less 2.5% platform fee</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaimPayment}
                  disabled={(!commitSha && !demoMode && !isDemoJob) || isTxPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isTxPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Verify & Claim Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link GitHub Modal — shown when freelancer tries to accept without linking */}
      {showLinkGitHubModal && (
        <LinkGitHub
          isModal={true}
          onClose={() => setShowLinkGitHubModal(false)}
          onLinked={(username) => {
            setShowLinkGitHubModal(false);
            refetchGitHubLinked();
            // After linking, they can try accepting again
          }}
        />
      )}

      {/* FDC Progress Modal */}
      <FdcVisualizer
        isOpen={showFdcModal}
        onClose={() => {
          setShowFdcModal(false);
          setFdcProgress(null);
          setFdcResult(null);
          setProofHash(null);
          setVotingRound(null);
          setTxStatus("idle");
        }}
        progress={fdcProgress}
        result={fdcResult}
        title={canClaim || job.status === JOB_STATUS.BuildAccepted ? "FDC Attestation — Claim Payment" : isClient ? "Approving Work" : "Submitting Deliverable"}
      />
    </div>
  );
}
