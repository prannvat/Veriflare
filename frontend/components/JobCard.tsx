"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Job, JOB_CATEGORIES } from "@/lib/store";
import { StatusBadge } from "./StatusBadge";
import {
  formatFLR,
  formatTimeRemaining,
  truncateAddress,
  truncateJobId,
} from "@/lib/utils";
import { Clock, Wallet, ExternalLink, Package } from "lucide-react";

interface JobCardProps {
  job: Job;
  userRole?: "client" | "freelancer" | "viewer";
}

export function JobCard({ job, userRole = "viewer" }: JobCardProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = job.status === 0;
  const isPastDeadline = mounted ? job.deadline < Math.floor(Date.now() / 1000) : false;
  const category = JOB_CATEGORIES.find(c => c.value === job.category);
  
  // Avoid hydration mismatch by showing placeholder until client mounts
  const timeDisplay = mounted 
    ? (isOpen ? formatTimeRemaining(job.deadline) : isPastDeadline ? "Expired" : formatTimeRemaining(job.deadline))
    : "--";

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="group p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-white/90 group-hover:text-white transition-colors truncate tracking-wide">
              {job.title || job.clientRepo}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              {category && (
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  {category.label}
                </span>
              )}
              <span className="text-[10px] text-white/20 font-mono">
                {truncateJobId(job.id)}
              </span>
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* Details */}
        <div className="space-y-4 my-6">
          {/* Payment */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
               <Wallet className="w-4 h-4 text-white/50" />
            </div>
            <span className="font-medium text-white/80 text-lg">
              {formatFLR(job.paymentAmount)}
            </span>
          </div>

          <div className="flex gap-5">
            {/* Deliverable destination */}
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Package className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{job.clientRepo}</span>
            </div>

            {/* Deadline */}
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span className={isPastDeadline && isOpen ? "text-red-400" : ""}>
                {timeDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-5 border-t border-white/[0.04] flex items-center justify-between">
          <div className="text-[11px] text-white/30 uppercase tracking-wider">
            {job.freelancer !== "0x0000000000000000000000000000000000000000" ? (
              <span>
                Freelancer:{" "}
                <span className="text-white/60 normal-case">{job.freelancerGitHub || truncateAddress(job.freelancer)}</span>
              </span>
            ) : (
              <span className="text-white/60">Open for applications</span>
            )}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-white/80 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
