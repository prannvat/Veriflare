"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Plus, Search, Filter, LayoutGrid, Zap } from "lucide-react";
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
  
  // Use store
  const { jobs, initDemoJobs } = useAppStore();
  
  // Initialize demo jobs on mount
  useEffect(() => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Demo Banner */}
      <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-3">
        <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-orange-400 font-medium text-sm">Demo Mode Active</p>
          <p className="text-orange-400/70 text-xs mt-1">
            This is a proof-of-concept demo. Get testnet C2FLR from the{" "}
            <a href={FLARE_LINKS.faucet} target="_blank" className="underline hover:text-orange-300">
              Coston2 faucet
            </a>
            {" "}to test real transactions.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Jobs</h1>
          <p className="text-white/60 mt-1">
            Browse freelance opportunities across every discipline
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Job
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
        <div className="text-center py-16">
          <div className="text-white/40 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
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
