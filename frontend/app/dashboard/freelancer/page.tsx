"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Package, Clock, DollarSign, Search, Upload, CheckCircle, ArrowRight, Eye } from "lucide-react";
import { JobCard } from "@/components";
import { useAppStore } from "@/lib/store";
import { formatFLR } from "@/lib/utils";
import { JOB_STATUS } from "@/lib/constants";

export default function FreelancerDashboard() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);
  
  const { jobs, initDemoJobs, getFreelancerJobs } = useAppStore();

  useEffect(() => {
    setMounted(true);
    if (jobs.size === 0) {
      initDemoJobs();
    }
  }, []);

  // Get jobs where user is the freelancer
  const myJobs = mounted && address ? getFreelancerJobs(address) : [];
  
  // For demo, show some in-progress jobs
  const allJobs = Array.from(jobs.values());
  const inProgressDemoJobs = allJobs.filter(j => j.status >= JOB_STATUS.InProgress && j.status < JOB_STATUS.Completed);
  const displayJobs = myJobs.length > 0 ? myJobs : inProgressDemoJobs.slice(0, 2);
  
  // Stats
  const inProgress = displayJobs.filter(j => j.status === JOB_STATUS.InProgress).length;
  const awaitingApproval = displayJobs.filter(j => j.status === JOB_STATUS.BuildSubmitted || j.status === JOB_STATUS.BuildAccepted).length;
  const completedJobs = displayJobs.filter(j => j.status === JOB_STATUS.Completed);
  const totalEarnings = completedJobs.reduce((sum, job) => sum + job.paymentAmount, BigInt(0));
  
  // Jobs needing action (need to submit work)
  const needsSubmission = displayJobs.filter(j => j.status === JOB_STATUS.InProgress);

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
            <Package className="w-8 h-8 text-white/40" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Connect Your Wallet</h2>
          <p className="text-white/50 mb-8 max-w-md text-center">
            Connect your wallet to track your active jobs and submit deliveries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-green-400 text-sm font-medium uppercase tracking-wider">Freelancer View</span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight">Your Active Contracts</h1>
          <p className="text-white/40 mt-2">Accept jobs, submit work, and get paid</p>
        </div>
        <Link 
          href="/jobs" 
          className="btn-secondary flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Find Work
        </Link>
      </div>

      {/* Freelancer Flow Explanation */}
      <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-green-400" />
          Freelancer Workflow
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-medium flex-shrink-0">1</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Browse & Accept</p>
              <p className="text-white/40 text-xs">Find a job and accept it</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-medium flex-shrink-0">2</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Do the Work</p>
              <p className="text-white/40 text-xs">Complete the deliverable</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-medium flex-shrink-0">3</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Submit Work</p>
              <p className="text-white/40 text-xs">Upload to IPFS/GitHub</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-medium flex-shrink-0">4</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Get Paid</p>
              <p className="text-white/40 text-xs">FDC verifies, instant payment</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Package className="w-5 h-5 text-white/60" />
            </div>
            <span className="text-white/40 text-sm">In Progress</span>
          </div>
          <div className="text-3xl font-light text-white">{inProgress}</div>
        </div>
        
        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Clock className="w-5 h-5 text-white/60" />
            </div>
            <span className="text-white/40 text-sm">Awaiting Approval</span>
          </div>
          <div className="text-3xl font-light text-white">{awaitingApproval}</div>
        </div>

        <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-green-400/80 text-sm">Total Earnings</span>
          </div>
          <div className="text-3xl font-light text-white">{formatFLR(totalEarnings)}</div>
        </div>
      </div>

      {/* Jobs Needing Submission */}
      {needsSubmission.length > 0 && (
        <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-medium text-white">Ready to Submit Work</h2>
          </div>
          <div className="space-y-4">
            {needsSubmission.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                <div className="p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{job.title}</p>
                    <p className="text-white/40 text-sm">Complete your work and submit for review</p>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    Submit Work
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Jobs List */}
      <div>
        <h2 className="text-xl font-medium text-white mb-6">Your Contracts</h2>
        {displayJobs.length > 0 ? (
          <div className="grid gap-6">
            {displayJobs.map((job) => (
              <JobCard key={job.id} job={job} userRole="freelancer" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.05] flex items-center justify-center">
              <Package className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No active contracts</h3>
            <p className="text-white/40 mb-6">Browse open jobs and accept one to get started</p>
            <Link 
              href="/jobs"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Find Work
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
