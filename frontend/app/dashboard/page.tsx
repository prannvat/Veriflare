"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { Briefcase, Package, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { JobCard } from "@/components";
import { Job } from "@/lib/store";
import { formatFLR } from "@/lib/utils";

// Mock data
const MOCK_CLIENT_JOBS: Job[] = [
  {
    id: "0x1234...",
    client: "0x1234567890123456789012345678901234567890",
    freelancer: "0x9876543210987654321098765432109876543210",
    freelancerGitHub: "alice-design",
    paymentAmount: BigInt("5000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://brand-identity-v2",
    targetBranch: "final",
    requirementsHash: "0x...",
    acceptedBuildHash: "0x...",
    acceptedSourceHash: "0x...",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
    reviewPeriod: 86400 * 3,
    codeDeliveryDeadline: 0,
    status: 2,
    category: "design",
    title: "Brand Identity Package",
    verificationType: "ipfs_delivery",
  },
];

const MOCK_FREELANCER_JOBS: Job[] = [
  {
    id: "0xabcd...",
    client: "0xaaaa...",
    freelancer: "0x1234567890123456789012345678901234567890",
    freelancerGitHub: "me",
    paymentAmount: BigInt("10000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://album-masters",
    targetBranch: "v1.0",
    requirementsHash: "0x...",
    acceptedBuildHash: "0x...",
    acceptedSourceHash: "0x...",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
    reviewPeriod: 86400 * 5,
    codeDeliveryDeadline: Math.floor(Date.now() / 1000) + 86400,
    status: 3,
    category: "music",
    title: "10-Track Album Production",
    verificationType: "ipfs_delivery",
  },
];

const STATS = {
  totalEarned: BigInt("25000000000000000000"),
  totalSpent: BigInt("15000000000000000000"),
  completedJobs: 5,
  activeJobs: 2,
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <AlertCircle className="w-12 h-12 text-flare-coral mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-white/60">
            Please connect your wallet to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-light text-white mb-10 tracking-tight">Dashboard overview</h1>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="card group hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/[0.1] border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-white/40 text-xs uppercase tracking-wider">Total Earned</span>
          </div>
          <p className="text-2xl font-light text-white tracking-tight">
            {formatFLR(STATS.totalEarned)}
          </p>
        </div>

        <div className="card group hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/[0.1] border border-blue-500/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white/40 text-xs uppercase tracking-wider">Total Spent</span>
          </div>
          <p className="text-2xl font-light text-white tracking-tight">
            {formatFLR(STATS.totalSpent)}
          </p>
        </div>

        <div className="card group hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/[0.1] border border-purple-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-white/40 text-xs uppercase tracking-wider">Completed</span>
          </div>
          <p className="text-2xl font-light text-white tracking-tight">{STATS.completedJobs}</p>
        </div>

        <div className="card group hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/[0.1] border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-white/40 text-xs uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-light text-white tracking-tight">{STATS.activeJobs}</p>
        </div>
      </div>

      {/* Jobs Sections */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* As Client */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Client Jobs
            </h2>
            <Link
              href="/jobs?role=client"
              className="text-white/40 hover:text-white text-xs transition-colors hover:underline"
            >
              View all
            </Link>
          </div>

          {MOCK_CLIENT_JOBS.length > 0 ? (
            <div className="space-y-4">
              {MOCK_CLIENT_JOBS.map((job) => (
                <JobCard key={job.id} job={job} userRole="client" />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 border-dashed border-white/10">
              <p className="text-white/40 mb-6 text-sm">No jobs posted yet</p>
              <Link href="/jobs/create" className="btn-primary inline-flex text-sm py-2">
                Create First Job
              </Link>
            </div>
          )}
        </div>

        {/* As Freelancer */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-4 h-4" />
              Freelance Jobs
            </h2>
            <Link
              href="/jobs?role=freelancer"
              className="text-white/40 hover:text-white text-xs transition-colors hover:underline"
            >
              View all
            </Link>
          </div>

          {MOCK_FREELANCER_JOBS.length > 0 ? (
            <div className="space-y-4">
              {MOCK_FREELANCER_JOBS.map((job) => (
                <JobCard key={job.id} job={job} userRole="freelancer" />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 border-dashed border-white/10">
              <p className="text-white/40 mb-6 text-sm">No active freelance work</p>
              <Link href="/jobs" className="btn-secondary inline-flex text-sm py-2">
                Browse Jobs
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions */}
      <div className="mt-12">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          Actions Required
        </h2>
        <div className="card bg-orange-500/[0.03] border-orange-500/20 hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
               </div>
               <div>
                  <p className="text-white font-medium mb-1">
                    Deliverable submitted for &ldquo;Brand Identity Package&rdquo;
                  </p>
                  <p className="text-white/50 text-xs">
                    Review the deliverable and accept or request changes.
                  </p>
               </div>
            </div>
            <Link href="/jobs/0x1234..." className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors">
              Review Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
