"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { FREELANCER_ESCROW_ABI } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/lib/wagmi";
import { hashRequirements, daysToSeconds } from "@/lib/utils";
import { JOB_CATEGORIES, VERIFICATION_TYPES, JobCategory, VerificationType } from "@/lib/store";
import { X, Loader2, Check } from "lucide-react";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateJobModal({ isOpen, onClose }: CreateJobModalProps) {
  const { chain } = useAccount();
  const [formData, setFormData] = useState({
    title: "",
    category: "development" as JobCategory,
    verificationType: "github_commit" as VerificationType,
    deliverableDestination: "",      // repo, IPFS path, URL, etc.
    deliverableRef: "main",          // branch, version, format, etc.
    requirements: "",
    paymentAmount: "",
    deadlineDays: "7",
    reviewPeriodDays: "3",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const contractAddress = chain?.id
    ? CONTRACT_ADDRESSES[chain.id as keyof typeof CONTRACT_ADDRESSES]?.escrow
    : undefined;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title) {
      newErrors.title = "Job title is required";
    }

    if (!formData.deliverableDestination) {
      newErrors.deliverableDestination = "Deliverable destination is required";
    }

    if (!formData.requirements) {
      newErrors.requirements = "Requirements are required";
    }

    if (!formData.paymentAmount || parseFloat(formData.paymentAmount) <= 0) {
      newErrors.paymentAmount = "Valid payment amount is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !contractAddress) return;

    try {
      const requirementsHash = await hashRequirements(formData.requirements);
      const deadline = Math.floor(Date.now() / 1000) + daysToSeconds(parseInt(formData.deadlineDays));
      const reviewPeriod = daysToSeconds(parseInt(formData.reviewPeriodDays));

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: FREELANCER_ESCROW_ABI,
        functionName: "createJob",
        args: [
          formData.deliverableDestination,
          formData.deliverableRef,
          requirementsHash as `0x${string}`,
          BigInt(deadline),
          BigInt(reviewPeriod),
        ],
        value: parseEther(formData.paymentAmount),
      });
    } catch (error) {
      console.error("Failed to create job:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 glass rounded-xl p-8 max-h-[90vh] overflow-y-auto border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-medium text-white tracking-wide">Create New Job</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-white/80" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Job Created</h3>
            <p className="text-white/50 mb-8 font-light">
              Your job has been created and is now visible to freelancers.
            </p>
            <button onClick={onClose} className="btn-primary w-full">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="label">Job Title *</label>
              <input
                type="text"
                placeholder="e.g. Logo Design, Album Production, REST API..."
                className={`input ${errors.title ? "border-red-500/50" : ""}`}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
              {errors.title && (
                <p className="text-red-400 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            {/* Category & Verification Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  className="input appearance-none cursor-pointer"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as JobCategory })
                  }
                >
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Verification</label>
                <select
                  className="input appearance-none cursor-pointer"
                  value={formData.verificationType}
                  onChange={(e) =>
                    setFormData({ ...formData, verificationType: e.target.value as VerificationType })
                  }
                >
                  {VERIFICATION_TYPES.map((vt) => (
                    <option key={vt.value} value={vt.value}>
                      {vt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Verification info */}
            <div className="px-3 py-2 bg-blue-500/[0.05] border border-blue-500/10 rounded-lg">
              <p className="text-white/50 text-xs leading-relaxed">
                {VERIFICATION_TYPES.find(v => v.value === formData.verificationType)?.description}
              </p>
            </div>

            {/* Deliverable Destination */}
            <div>
              <label className="label">
                {formData.verificationType === "github_commit" ? "GitHub Repository *" :
                 formData.verificationType === "ipfs_delivery" ? "IPFS Destination *" :
                 formData.verificationType === "url_live" ? "Target URL *" :
                 "Delivery Destination *"}
              </label>
              <input
                type="text"
                placeholder={
                  formData.verificationType === "github_commit" ? "owner/repository" :
                  formData.verificationType === "ipfs_delivery" ? "ipfs://... or destination path" :
                  formData.verificationType === "url_live" ? "https://example.com/deliverable" :
                  "Where should the deliverable go?"
                }
                className={`input ${errors.deliverableDestination ? "border-red-500/50" : ""}`}
                value={formData.deliverableDestination}
                onChange={(e) =>
                  setFormData({ ...formData, deliverableDestination: e.target.value })
                }
              />
              {errors.deliverableDestination && (
                <p className="text-red-400 text-xs mt-1">{errors.deliverableDestination}</p>
              )}
            </div>

            {/* Deliverable Ref */}
            <div>
              <label className="label">
                {formData.verificationType === "github_commit" ? "Target Branch" :
                 "Version / Format Reference"}
              </label>
              <input
                type="text"
                placeholder={
                  formData.verificationType === "github_commit" ? "main" :
                  "e.g. v1.0, final, high-res..."
                }
                className="input"
                value={formData.deliverableRef}
                onChange={(e) =>
                  setFormData({ ...formData, deliverableRef: e.target.value })
                }
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="label">Job Requirements *</label>
              <textarea
                rows={5}
                placeholder="Describe what you need built..."
                className={`textarea ${errors.requirements ? "border-red-500/50" : ""}`}
                value={formData.requirements}
                onChange={(e) =>
                  setFormData({ ...formData, requirements: e.target.value })
                }
              />
              {errors.requirements && (
                <p className="text-red-400 text-xs mt-1">{errors.requirements}</p>
              )}
            </div>

            {/* Payment */}
            <div>
              <label className="label">Payment Amount (FLR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="100"
                className={`input ${errors.paymentAmount ? "border-red-500/50" : ""}`}
                value={formData.paymentAmount}
                onChange={(e) =>
                  setFormData({ ...formData, paymentAmount: e.target.value })
                }
              />
              {errors.paymentAmount && (
                <p className="text-red-400 text-xs mt-1">{errors.paymentAmount}</p>
              )}
            </div>

            {/* Deadline & Review Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Deadline (days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="input"
                  value={formData.deadlineDays}
                  onChange={(e) =>
                    setFormData({ ...formData, deadlineDays: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Review Period (days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="input"
                  value={formData.reviewPeriodDays}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewPeriodDays: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || isConfirming || !contractAddress}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-8"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isPending ? "Confirm in wallet..." : "Creating..."}
                </>
              ) : (
                "Create Job & Deposit"
              )}
            </button>

            {!contractAddress && (
              <p className="text-red-400 text-xs text-center">
                Please connect to Flare network
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
