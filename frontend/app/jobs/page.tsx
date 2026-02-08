"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Plus, Search, Filter, LayoutGrid, Shield } from "lucide-react";
import Link from "next/link";
import { JobCard, CreateJobModal } from "@/components";
import { Job, JOB_CATEGORIES, JobCategory, useAppStore } from "@/lib/store";
import { FLARE_LINKS } from "@/lib/demo-data";

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "0", label: "Open" },
  { value: "1", label: "Accepted" },
  { value: "2", label: "In Progress" },
  { value: "3", label: "Submitted" },
  { value: "4", label: "Approved" },
  { value: "5", label: "Completed" },
];

export default function JobsPage() {
  const { isConnected } = useAccount();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  
  // Use store
  const { jobs, initDemoJobs } = useAppStore();
  
  // Initialize demo jobs on mount
  useEffect(() => {
    setMounted(true);
    if (jobs.size === 0) {
      initDemoJobs();
    }
  }, []);

  // Convert map to array
  const jobsArray = Array.from(jobs.values());

  const filteredJobs = jobsArray.filter((job) => {
    const searchTarget = (job.title || job.clientRepo).toLowerCase();
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || job.status.toString() === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || job.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-white/10 rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
      {/* Testnet Info Banner */}
      <div className="mb-10 p-5 bg-white/[0.02] border border-white/[0.08] rounded-2xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-white/80 font-medium text-sm">Coston2 Testnet — Live Smart Contract</p>
          <p className="text-white/40 text-sm mt-1">
            All on-chain jobs use real transactions on Flare Coston2. Get testnet FLR from the{" "}
            <a href={FLARE_LINKS.faucet} target="_blank" className="text-white/60 hover:text-white underline underline-offset-2">
              Coston2 faucet
            </a>
            {" "}to create and accept jobs. Demo jobs are available for exploring the UI.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Jobs</h1>
          <p className="text-white/40 mt-2">
            Browse opportunities across every discipline
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <select
            className="input pl-10 pr-8 appearance-none cursor-pointer min-w-[180px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <select
            className="input pl-10 pr-8 appearance-none cursor-pointer min-w-[180px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
            <Search className="w-7 h-7 text-white/30" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No jobs found</h3>
          <p className="text-white/60">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Be the first to create a job!"}
          </p>
        </div>
      )}

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
