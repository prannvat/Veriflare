"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { Package, Clock, DollarSign, Search } from "lucide-react";
import { JobCard } from "@/components";
import { Job } from "@/lib/store";

// Mock data for freelancer view
const MOCK_FREELANCER_JOBS: Job[] = [
  {
    id: "0xabcd...",
    client: "0xaaaa...bbbb",
    freelancer: "0x1234...5678", // Current user
    freelancerGitHub: "me",
    paymentAmount: BigInt("10000000000000000000"), // 10 FLR
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://album-masters",
    targetBranch: "v1.0",
    requirementsHash: "0x...",
    acceptedBuildHash: "0x...",
    acceptedSourceHash: "0x...",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
    reviewPeriod: 86400 * 5,
    codeDeliveryDeadline: Math.floor(Date.now() / 1000) + 86400,
    status: 3, // In Review
    category: "music",
    title: "Orchestral Arrangement",
    verificationType: "ipfs_delivery",
  },
];

export default function FreelancerDashboard() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
          <Package className="w-8 h-8 text-white/40" />
        </div>
        <h2 className="text-xl font-medium text-white mb-2">Connect Your Wallet</h2>
        <p className="text-white/50 mb-8 max-w-md text-center">
          Connect your wallet to track your active jobs and submit deliveries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Freelancer Work</h1>
          <p className="text-white/50">Track active contracts and submit your work</p>
        </div>
        <Link 
          href="/jobs" 
          className="btn-secondary flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Find More Work
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-white/[0.02] border-white/[0.05] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-white/60 text-sm font-medium">In Progress</span>
          </div>
          <div className="text-3xl font-bold text-white">1</div>
        </div>
        
        <div className="card bg-white/[0.02] border-white/[0.05] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-white/60 text-sm font-medium">Coming Due</span>
          </div>
          <div className="text-3xl font-bold text-white">0</div>
        </div>

        <div className="card bg-white/[0.02] border-white/[0.05] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-white/60 text-sm font-medium">Earnings</span>
          </div>
          <div className="text-3xl font-bold text-white">150 FLR</div>
        </div>
      </div>

      {/* Active Jobs */}
      <div>
        <h2 className="text-xl font-medium text-white mb-6">Active Contracts</h2>
        <div className="grid gap-6">
          {MOCK_FREELANCER_JOBS.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}
