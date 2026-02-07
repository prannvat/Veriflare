"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
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
} from "lucide-react";
import { StatusBadge, BuildPreview } from "@/components";
import {
  formatDate,
  formatFLR,
  formatTimeRemaining,
  truncateAddress,
  getStatusLabel,
} from "@/lib/utils";
import { JOB_CATEGORIES, VERIFICATION_TYPES } from "@/lib/store";

// Mock job detail
const MOCK_JOB = {
  id: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  client: "0x1234567890123456789012345678901234567890",
  freelancer: "0x9876543210987654321098765432109876543210",
  freelancerGitHub: "alice-design",
  paymentAmount: BigInt("5000000000000000000"),
  paymentToken: "0x0000000000000000000000000000000000000000",
  clientRepo: "ipfs://brand-identity-v2",
  targetBranch: "final",
  requirementsHash: "0xefgh1234...",
  acceptedBuildHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
  acceptedSourceHash: "0xaaaabbbbccccddddeeeeffff00001111222233334444555566667777888899990000",
  deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
  reviewPeriod: 86400 * 5,
  codeDeliveryDeadline: 0,
  status: 2,
  category: "design" as const,
  title: "Brand Identity Package",
  verificationType: "ipfs_delivery" as const,
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
  const { address } = useAccount();
  const jobId = params.id as string;

  const job = MOCK_JOB; // In production, fetch from contract
  const isClient = address?.toLowerCase() === job.client.toLowerCase();
  const isFreelancer = address?.toLowerCase() === job.freelancer.toLowerCase();
  const category = JOB_CATEGORIES.find(c => c.value === job.category);
  const verification = VERIFICATION_TYPES.find(v => v.value === job.verificationType);

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
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">{job.title || job.clientRepo}</h1>
          <p className="text-white/40 font-mono text-xs tracking-wider">
            ID: {jobId?.slice(0, 20)}...
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isClient && job.status === 2 && (
            <button className="btn-primary">Review Deliverable</button>
          )}
          {isFreelancer && job.status === 3 && (
            <button className="btn-primary">Deliver Files & Claim</button>
          )}
          {!isClient && !isFreelancer && job.status === 0 && (
            <button className="btn-primary">Accept Job</button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deliverable Preview (if submitted) */}
          {job.status >= 2 && (
            <BuildPreview
              jobId={job.id}
              previewUrl="https://preview.veriflare.io/demo-app"
              deliverableHash={job.acceptedBuildHash}
              sourceHash={job.acceptedSourceHash}
              requirements={MOCK_REQUIREMENTS}
              isClient={isClient}
              status={job.status}
            />
          )}

          {/* Requirements */}
          <div className="card">
            <h3 className="text-lg font-medium text-white mb-6">
              Requirements
            </h3>
            <div className="prose prose-invert max-w-none">
              <ul className="space-y-3">
                {MOCK_REQUIREMENTS.map((req, i) => (
                  <li key={i} className="text-white/70 flex items-start gap-3 text-sm leading-relaxed">
                    <span className="text-white/30 mt-0.5">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <a
                href="#"
                className="text-white/60 hover:text-white hover:underline flex items-center gap-2 text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                View full requirements on IPFS
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Timeline / Activity (placeholder) */}
          <div className="card">
            <h3 className="text-lg font-medium text-white mb-6">Activity</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:w-px before:bg-white/[0.05]">
              <div className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                </div>
                <div className="pt-1">
                  <p className="text-white/90 text-sm">Job created</p>
                  <p className="text-white/30 text-xs mt-0.5">2 days ago</p>
                </div>
              </div>
              <div className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                <div className="pt-1">
                  <p className="text-white/90 text-sm">
                    <span className="text-white font-medium">alice-design</span> accepted
                    the job
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">1 day ago</p>
                </div>
              </div>
              <div className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                </div>
                <div className="pt-1">
                  <p className="text-white/90 text-sm">Deliverable submitted for review</p>
                  <p className="text-white/30 text-xs mt-0.5">5 hours ago</p>
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
              Escrowed in smart contract
            </p>
            <div className="mt-6 pt-4 border-t border-white/[0.05]">
              <p className="text-white/60 text-xs flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-white/40" />
                Funds secured on-chain
              </p>
            </div>
          </div>

          {/* Job Details */}
          <div className="card">
            <h3 className="text-white font-medium mb-4">Details</h3>
            <div className="space-y-5">
              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Deliverable Destination
                </span>
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white font-mono text-sm truncate">{job.clientRepo}</span>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Version / Reference
                </span>
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white text-sm">{job.targetBranch}</span>
                </div>
              </div>

              <div>
                <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Verification Method
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
                    {formatTimeRemaining(job.deadline)}
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
                </div>
              </div>
              
              {job.freelancer !== "0x0000000000000000000000000000000000000000" && (
                <div>
                   <span className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Freelancer</span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-white/70" />
                      </div>
                      <span className="text-white text-sm">{job.freelancerGitHub}</span>
                    </div>
                  </div>
                    <div className="mt-1.5 pl-7">
                        <span className="text-white/40 font-mono text-xs block">
                        {truncateAddress(job.freelancer)}
                        </span>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* Dispute Warning */}
          {(isClient || isFreelancer) && job.status >= 1 && job.status < 5 && (
            <div className="card bg-orange-500/[0.05] border-orange-500/20">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-4 h-4 text-orange-400/80 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/90 font-medium text-sm mb-1">Need help?</p>
                  <p className="text-white/50 text-xs mb-3 leading-relaxed">
                    If there's an issue with the work or payment, you can open a dispute.
                  </p>
                  <button className="text-orange-400 hover:text-orange-300 text-xs font-medium hover:underline transition-colors">
                    Open Dispute Case
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
