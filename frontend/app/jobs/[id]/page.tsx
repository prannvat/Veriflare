"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { StatusBadge } from "@/components";
import {
  formatFLR,
  formatTimeRemaining,
  truncateAddress,
} from "@/lib/utils";
import { JOB_CATEGORIES, VERIFICATION_TYPES, Job, useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DEMO_DELIVERABLES, simulateFdcAttestation, FLARE_LINKS } from "@/lib/demo-data";

// Job statuses
const JOB_STATUS = {
  OPEN: 0,
  ACCEPTED: 1,
  IN_PROGRESS: 2,
  SUBMITTED: 3,
  APPROVED: 4,
  COMPLETED: 5,
  DISPUTED: 6,
  CANCELLED: 7,
};

const MOCK_REQUIREMENTS = [
  "Logo in SVG, PNG, and PDF formats",
  "Primary and secondary color palette with hex codes",
  "Typography specification with font pairings",
  "Business card and letterhead templates",
  "Brand usage guidelines document",
];

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
    acceptJob,
    submitDeliverable,
    approveWork,
    completePayment,
    fdcStep,
    fdcStepTitle,
    fdcStepDescription,
    setFdcProgress,
    resetFdc,
  } = useAppStore();

  // Local state
  const [mounted, setMounted] = useState(false);
  const [deliveryUrl, setDeliveryUrl] = useState(DEMO_DELIVERABLES[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showFdcModal, setShowFdcModal] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Initialize demo jobs on mount
  useEffect(() => {
    setMounted(true);
    if (jobs.size === 0) {
      initDemoJobs();
    }
  }, []);
  
  // Get current job from store
  const job = getJob(jobId) || {
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
    category: "design",
    title: "Demo Job",
    verificationType: "ipfs_delivery",
  };

  // Determine user role
  const isClient = address?.toLowerCase() === job.client.toLowerCase();
  const isFreelancer = job.freelancer !== "0x0000000000000000000000000000000000000000" && 
                       address?.toLowerCase() === job.freelancer.toLowerCase();
  const isOpen = job.status === JOB_STATUS.OPEN;
  // For demo: allow accept if connected (even if wallet doesn't match client)
  const canAccept = isConnected && isOpen;
  const canSubmit = job.status === JOB_STATUS.ACCEPTED || job.status === JOB_STATUS.IN_PROGRESS;
  const canApprove = job.status === JOB_STATUS.SUBMITTED;
  const canClaim = job.status === JOB_STATUS.APPROVED;

  const category = JOB_CATEGORIES.find(c => c.value === job.category);
  const verification = VERIFICATION_TYPES.find(v => v.value === job.verificationType);

  // ==================== ACTIONS ====================

  const handleAcceptJob = async () => {
    if (!address) return;
    setTxStatus("pending");
    
    try {
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update store
      acceptJob(jobId, address);
      setTxStatus("success");
    } catch (error) {
      console.error("Failed to accept job:", error);
      setTxStatus("error");
    }
  };

  const handleSubmitDeliverable = async () => {
    if (!deliveryUrl) return;
    setIsSubmitting(true);
    setTxStatus("pending");
    setShowSubmitModal(false);
    setShowFdcModal(true);
    resetFdc();

    try {
      // Run FDC attestation simulation with visual progress
      const result = await simulateFdcAttestation(deliveryUrl, (step, title, description) => {
        setFdcProgress(step, title, description);
      });
      
      // Update store with delivery
      const deliveryHash = "0x" + Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
      
      submitDeliverable(jobId, deliveryUrl, deliveryHash);
      setProofHash(result.proofHash);
      setTxHash(result.txHash);
      setTxStatus("success");
    } catch (error) {
      console.error("Failed to submit:", error);
      setTxStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveWork = async () => {
    setTxStatus("pending");
    setShowApproveModal(false);
    setShowFdcModal(true);
    resetFdc();

    try {
      // Run FDC attestation for approval
      const result = await simulateFdcAttestation(job.clientRepo, (step, title, description) => {
        setFdcProgress(step, title, description);
      });
      
      // Update store
      approveWork(jobId);
      completePayment(jobId);
      setProofHash(result.proofHash);
      setTxHash(result.txHash);
      setTxStatus("success");
    } catch (error) {
      console.error("Failed to approve:", error);
      setTxStatus("error");
    }
  };

  const handleClaimPayment = async () => {
    setTxStatus("pending");
    setShowFdcModal(true);
    resetFdc();

    try {
      // Run FDC attestation for claim
      const result = await simulateFdcAttestation(job.acceptedBuildHash || job.clientRepo, (step, title, description) => {
        setFdcProgress(step, title, description);
      });
      
      // Update store
      completePayment(jobId);
      setProofHash(result.proofHash);
      setTxHash(result.txHash);
      setTxStatus("success");
    } catch (error) {
      console.error("Failed to claim:", error);
      setTxStatus("error");
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            {category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs">
                <span>{category.icon}</span>
                {category.label}
              </span>
            )}
            <StatusBadge status={job.status} size="lg" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
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
              disabled={txStatus === "pending"}
              className="btn-primary flex items-center gap-2"
            >
              {txStatus === "pending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Accept Job
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
              onClick={handleClaimPayment}
              disabled={txStatus === "pending"}
              className="btn-primary flex items-center gap-2"
            >
              {txStatus === "pending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              Claim Payment
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {job.status === JOB_STATUS.COMPLETED && (
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
          {job.status >= JOB_STATUS.SUBMITTED && job.acceptedBuildHash && (
            <div className="card border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Deliverable Submitted</h3>
                  <p className="text-white/50 text-sm">Review the work before approving</p>
                </div>
              </div>
              
              <div className="p-4 bg-black/30 rounded-lg mb-4">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Delivery Hash</p>
                <p className="text-white font-mono text-sm break-all">{job.acceptedBuildHash}</p>
              </div>
              
              <a 
                href="#" 
                className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View on IPFS
              </a>
            </div>
          )}

          {/* Requirements */}
          <div className="card">
            <h3 className="text-lg font-medium text-white mb-6">Requirements</h3>
            <ul className="space-y-3">
              {MOCK_REQUIREMENTS.map((req, i) => (
                <li key={i} className="text-white/70 flex items-start gap-3 text-sm leading-relaxed">
                  <span className="text-white/30 mt-0.5">•</span>
                  {req}
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <a
                href="#"
                className="text-white/60 hover:text-white flex items-center gap-2 text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                View full requirements on IPFS
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* How It Works */}
          <div className="card bg-white/[0.02]">
            <h3 className="text-lg font-medium text-white mb-6">How This Works</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  job.status >= JOB_STATUS.ACCEPTED ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  1
                </div>
                <div>
                  <p className={`font-medium ${job.status >= JOB_STATUS.ACCEPTED ? 'text-green-400' : 'text-white/80'}`}>
                    Freelancer Accepts
                  </p>
                  <p className="text-white/50 text-sm">A freelancer takes on the job</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  job.status >= JOB_STATUS.SUBMITTED ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  2
                </div>
                <div>
                  <p className={`font-medium ${job.status >= JOB_STATUS.SUBMITTED ? 'text-green-400' : 'text-white/80'}`}>
                    Work Submitted
                  </p>
                  <p className="text-white/50 text-sm">Deliverable uploaded to IPFS with proof</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  job.status >= JOB_STATUS.APPROVED ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  3
                </div>
                <div>
                  <p className={`font-medium ${job.status >= JOB_STATUS.APPROVED ? 'text-green-400' : 'text-white/80'}`}>
                    Client Approves
                  </p>
                  <p className="text-white/50 text-sm">Client reviews and approves the work</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  job.status >= JOB_STATUS.COMPLETED ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  4
                </div>
                <div>
                  <p className={`font-medium ${job.status >= JOB_STATUS.COMPLETED ? 'text-green-400' : 'text-white/80'}`}>
                    Payment Released
                  </p>
                  <p className="text-white/50 text-sm">Funds released from escrow to freelancer</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <div className="card">
            <h3 className="text-white font-medium mb-4">Payment</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-light text-white tracking-tight">
                {formatFLR(job.paymentAmount)}
              </span>
            </div>
            <p className="text-white/40 text-xs">
              {job.status < JOB_STATUS.COMPLETED ? "Escrowed in smart contract" : "Payment completed"}
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
          <div className="bg-zinc-900 rounded-xl border border-white/10 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Submit Deliverable</h2>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="text-white/50 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Demo Examples */}
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Select example deliverable (for demo)
                </label>
                <div className="space-y-2">
                  {DEMO_DELIVERABLES.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setDeliveryUrl(item.url)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        deliveryUrl === item.url
                          ? 'bg-orange-500/10 border-orange-500/30 text-white'
                          : 'bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.05]'
                      }`}
                    >
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-white/40 font-mono mt-1 truncate">{item.url}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="bg-zinc-900 px-3 text-white/30 text-xs">or enter custom URL</span>
                </div>
                <div className="border-t border-white/10"></div>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Deliverable URL (IPFS or hosted)
                </label>
                <input
                  type="text"
                  value={deliveryUrl}
                  onChange={(e) => setDeliveryUrl(e.target.value)}
                  placeholder="ipfs://... or https://..."
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono text-sm"
                />
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-400 text-sm flex items-start gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Your submission will be verified via Flare Data Connector attestation.
                </p>
              </div>
              
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
                  This action is irreversible. The payment will be released to the freelancer.
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
                  disabled={txStatus === "pending"}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {txStatus === "pending" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
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

      {/* FDC Progress Modal */}
      {showFdcModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-white/10 max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Flare Data Connector</h2>
                <p className="text-white/50 text-sm">Verifying delivery on-chain</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="space-y-3 mb-6">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    fdcStep > step 
                      ? 'bg-green-500/20 text-green-400' 
                      : fdcStep === step 
                        ? 'bg-orange-500/20 text-orange-400 animate-pulse' 
                        : 'bg-white/5 text-white/30'
                  }`}>
                    {fdcStep > step ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : fdcStep === step ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      step
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      fdcStep >= step ? 'text-white' : 'text-white/40'
                    }`}>
                      {step === 1 && "Prepare Attestation Request"}
                      {step === 2 && "Submit to FDC"}
                      {step === 3 && "Wait for Consensus"}
                      {step === 4 && "Fetch Attestation Proof"}
                      {step === 5 && "Verify On-Chain"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Step Info */}
            {fdcStep > 0 && fdcStep <= 5 && (
              <div className="bg-black/30 rounded-lg p-4 mb-6">
                <p className="text-orange-400 font-medium text-sm">{fdcStepTitle}</p>
                <p className="text-white/60 text-xs mt-1">{fdcStepDescription}</p>
              </div>
            )}

            {/* Success State */}
            {txStatus === "success" && proofHash && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-medium">Attestation Verified!</p>
                  </div>
                  <p className="text-green-400/70 text-sm">
                    Your delivery has been cryptographically verified on Flare.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Proof Hash</p>
                    <p className="text-white font-mono text-xs break-all">{proofHash}</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Transaction Hash</p>
                    <p className="text-white font-mono text-xs break-all">{txHash}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`${FLARE_LINKS.explorer}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </a>
                  <button
                    onClick={() => {
                      setShowFdcModal(false);
                      resetFdc();
                      setProofHash(null);
                      setTxHash(null);
                      setTxStatus("idle");
                    }}
                    className="btn-primary flex-1"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
