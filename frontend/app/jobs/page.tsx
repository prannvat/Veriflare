"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Plus, Search, Filter, LayoutGrid } from "lucide-react";
import { JobCard, CreateJobModal } from "@/components";
import { Job, JOB_CATEGORIES, JobCategory } from "@/lib/store";

// Diverse mock data across categories
const MOCK_JOBS: Job[] = [
  {
    id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    client: "0x1234567890123456789012345678901234567890",
    freelancer: "0x0000000000000000000000000000000000000000",
    freelancerGitHub: "",
    paymentAmount: BigInt("1000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "acme-corp/e-commerce-api",
    targetBranch: "main",
    requirementsHash: "0xabcd",
    acceptedBuildHash: "0x0000",
    acceptedSourceHash: "0x0000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
    reviewPeriod: 86400 * 3,
    codeDeliveryDeadline: 0,
    status: 0,
    category: "development",
    title: "E-Commerce REST API",
    verificationType: "github_commit",
  },
  {
    id: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    client: "0x1234567890123456789012345678901234567890",
    freelancer: "0x9876543210987654321098765432109876543210",
    freelancerGitHub: "alice-design",
    paymentAmount: BigInt("5000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://brand-identity-v2",
    targetBranch: "final",
    requirementsHash: "0xefgh",
    acceptedBuildHash: "0x1111",
    acceptedSourceHash: "0x2222",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 14,
    reviewPeriod: 86400 * 5,
    codeDeliveryDeadline: 0,
    status: 2,
    category: "design",
    title: "Brand Identity Package",
    verificationType: "ipfs_delivery",
  },
  {
    id: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
    client: "0x1234567890123456789012345678901234567890",
    freelancer: "0x5555555555555555555555555555555555555555",
    freelancerGitHub: "bob-beats",
    paymentAmount: BigInt("10000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://album-masters",
    targetBranch: "v1.0",
    requirementsHash: "0xijkl",
    acceptedBuildHash: "0x3333",
    acceptedSourceHash: "0x4444",
    deadline: Math.floor(Date.now() / 1000) - 86400,
    reviewPeriod: 86400 * 7,
    codeDeliveryDeadline: Math.floor(Date.now() / 1000) + 86400,
    status: 3,
    category: "music",
    title: "10-Track Album Production",
    verificationType: "ipfs_delivery",
  },
  {
    id: "0x456789abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
    client: "0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333",
    freelancer: "0x0000000000000000000000000000000000000000",
    freelancerGitHub: "",
    paymentAmount: BigInt("3000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "https://gallery.example.com/product-shoot",
    targetBranch: "high-res",
    requirementsHash: "0xmnop",
    acceptedBuildHash: "0x0000",
    acceptedSourceHash: "0x0000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 10,
    reviewPeriod: 86400 * 2,
    codeDeliveryDeadline: 0,
    status: 0,
    category: "photography",
    title: "Product Photography — 50 SKUs",
    verificationType: "ipfs_delivery",
  },
  {
    id: "0xdef0123456789abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    client: "0xBBBBCCCCDDDDEEEEFFFF000011112222333344445",
    freelancer: "0x0000000000000000000000000000000000000000",
    freelancerGitHub: "",
    paymentAmount: BigInt("8000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "https://ads.brandco.io/campaign-q1",
    targetBranch: "launch",
    requirementsHash: "0xqrst",
    acceptedBuildHash: "0x0000",
    acceptedSourceHash: "0x0000",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 21,
    reviewPeriod: 86400 * 3,
    codeDeliveryDeadline: 0,
    status: 0,
    category: "advertising",
    title: "Social Media Ad Campaign",
    verificationType: "url_live",
  },
  {
    id: "0xef0123456789abcdef1234567890abcdef1234567890abcdef1234567890abcde",
    client: "0xCCCCDDDDEEEEFFFF00001111222233334444555566",
    freelancer: "0x7777888899990000AAAABBBBCCCCDDDDEEEEFFFF",
    freelancerGitHub: "motion-maya",
    paymentAmount: BigInt("15000000000000000000"),
    paymentToken: "0x0000000000000000000000000000000000000000",
    clientRepo: "ipfs://explainer-video-v3",
    targetBranch: "final-cut",
    requirementsHash: "0xuvwx",
    acceptedBuildHash: "0x5555",
    acceptedSourceHash: "0x6666",
    deadline: Math.floor(Date.now() / 1000) + 86400 * 5,
    reviewPeriod: 86400 * 4,
    codeDeliveryDeadline: 0,
    status: 1,
    category: "video",
    title: "2-Minute Explainer Video",
    verificationType: "ipfs_delivery",
  },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "0", label: "Open" },
  { value: "1", label: "In Progress" },
  { value: "2", label: "Submitted" },
  { value: "3", label: "Accepted" },
  { value: "5", label: "Completed" },
];

export default function JobsPage() {
  const { isConnected } = useAccount();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredJobs = MOCK_JOBS.filter((job) => {
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
