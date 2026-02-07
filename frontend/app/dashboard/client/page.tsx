"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { Briefcase, Plus, Clock, CheckCircle } from "lucide-react";
import { JobCard } from "@/components";
import { Job } from "@/lib/store";

// Mock data for client view
const MOCK_CLIENT_JOBS: Job[] = [
  {
    id: "0x1234...",
    client: "0x1234...5678",
    freelancer: "0x9876...3210",
    freelancerGitHub: "alice-design",
    paymentAmount: BigInt("5000000000000000000"), // 5 FLR
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://brand-identity-v2",
    targetBranch: "final",
    requirementsHash: "0x...",
    acceptedBuildHash: "0x...",
    acceptedSourceHash: "0x...",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
    reviewPeriod: 86400 * 3,
    codeDeliveryDeadline: 0,
    status: 2, // In Progress
    category: "design",
    title: "Brand Identity Package",
    verificationType: "ipfs_delivery",
  },
  {
    id: "0x5678...",
    client: "0x1234...5678",
    freelancer: "0x0000...0000",
    freelancerGitHub: "",
    paymentAmount: BigInt("2000000000000000000"), // 2 FLR
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://photo-edit-specs",
    targetBranch: "main",
    requirementsHash: "0x...",
    acceptedBuildHash: "0x...",
    acceptedSourceHash: "0x...",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 3,
    reviewPeriod: 86400,
    codeDeliveryDeadline: 0,
    status: 1, // Open
    category: "photography",
    title: "Product Photo Editing",
    verificationType: "ipfs_delivery",
  }
];

export default function ClientDashboard() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
          <Briefcase className="w-8 h-8 text-white/40" />
        </div>
        <h2 className="text-xl font-medium text-white mb-2">Connect Your Wallet</h2>
        <p className="text-white/50 mb-8 max-w-md text-center">
          Connect your wallet to manage your job postings and review deliveries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Client Dashboard</h1>
          <p className="text-white/50">Manage your posted jobs and review deliveries</p>
        </div>
        <Link 
          href="/jobs/create" 
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-white/[0.02] border-white/[0.05] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-white/60 text-sm font-medium">Active Jobs</span>
          </div>
          <div className="text-3xl font-bold text-white">2</div>
        </div>
        
        <div className="card bg-white/[0.02] border-white/[0.05] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-white/60 text-sm font-medium">Pending Review</span>
          </div>
          <div className="text-3xl font-bold text-white">0</div>
        </div>

        <div className="card bg-white/[0.02] border-white/[0.05] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="text-white/60 text-sm font-medium">Completed</span>
          </div>
          <div className="text-3xl font-bold text-white">12</div>
        </div>
      </div>

      {/* Jobs List */}
      <div>
        <h2 className="text-xl font-medium text-white mb-6">Your Posted Jobs</h2>
        <div className="grid gap-6">
          {MOCK_CLIENT_JOBS.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}
