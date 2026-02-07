"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Briefcase, Plus, Clock, CheckCircle, Package, Eye, AlertCircle, ArrowRight } from "lucide-react";
import { JobCard, CreateJobModal } from "@/components";
import { useAppStore } from "@/lib/store";
import { JOB_STATUS } from "@/lib/constants";

export default function ClientDashboard() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { jobs, initDemoJobs, getClientJobs } = useAppStore();

  useEffect(() => {
    setMounted(true);
    if (jobs.size === 0) {
      initDemoJobs();
    }
  }, []);

  // Get jobs where user is the client
  const myJobs = mounted && address ? getClientJobs(address) : [];
  
  // Also show demo jobs for demonstration
  const allJobs = Array.from(jobs.values());
  const displayJobs = myJobs.length > 0 ? myJobs : allJobs.slice(0, 3);
  
  // Stats
  const activeJobs = displayJobs.filter(j => j.status < JOB_STATUS.Completed).length;
  const pendingReview = displayJobs.filter(j => j.status === JOB_STATUS.BuildSubmitted).length;
  const completedJobs = displayJobs.filter(j => j.status === JOB_STATUS.Completed).length;

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
            <Briefcase className="w-8 h-8 text-white/40" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Connect Your Wallet</h2>
          <p className="text-white/50 mb-8 max-w-md text-center">
            Connect your wallet to manage your job postings and review deliveries.
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
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-blue-400 text-sm font-medium uppercase tracking-wider">Client View</span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight">Your Posted Jobs</h1>
          <p className="text-white/40 mt-2">Post jobs, review submissions, and release payments</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </button>
      </div>

      {/* Client Flow Explanation */}
      <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-400" />
          Client Workflow
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-medium flex-shrink-0">1</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Post Job</p>
              <p className="text-white/40 text-xs">Create job with payment escrow</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-medium flex-shrink-0">2</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Wait for Freelancer</p>
              <p className="text-white/40 text-xs">Freelancer accepts & works</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-medium flex-shrink-0">3</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Review Submission</p>
              <p className="text-white/40 text-xs">Verify the deliverable</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-medium flex-shrink-0">4</div>
            <div>
              <p className="text-white/80 text-sm font-medium">Approve & Pay</p>
              <p className="text-white/40 text-xs">FDC verifies, payment released</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white/60" />
            </div>
            <span className="text-white/40 text-sm">Active Jobs</span>
          </div>
          <div className="text-3xl font-light text-white">{activeJobs}</div>
        </div>
        
        <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-yellow-400/80 text-sm">Pending Review</span>
          </div>
          <div className="text-3xl font-light text-white">{pendingReview}</div>
          {pendingReview > 0 && (
            <p className="text-yellow-400/60 text-xs mt-2">Action required</p>
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white/60" />
            </div>
            <span className="text-white/40 text-sm">Completed</span>
          </div>
          <div className="text-3xl font-light text-white">{completedJobs}</div>
        </div>
      </div>

      {/* Jobs Needing Review */}
      {pendingReview > 0 && (
        <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-medium text-white">Submissions Ready for Review</h2>
          </div>
          <div className="space-y-4">
            {displayJobs.filter(j => j.status === JOB_STATUS.BuildSubmitted).map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                <div className="p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{job.title}</p>
                    <p className="text-white/40 text-sm">Freelancer submitted work for review</p>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    Review Now
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div>
        <h2 className="text-xl font-medium text-white mb-6">All Your Jobs</h2>
        {displayJobs.length > 0 ? (
          <div className="grid gap-6">
            {displayJobs.map((job) => (
              <JobCard key={job.id} job={job} userRole="client" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.05] flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No jobs yet</h3>
            <p className="text-white/40 mb-6">Post your first job to get started</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </button>
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
