"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle2, XCircle, MessageSquare, Loader2, FileCheck, Package } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { FREELANCER_ESCROW_ABI } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/lib/wagmi";

interface DeliverablePreviewProps {
  jobId: string;
  previewUrl: string;
  deliverableHash: string;
  sourceHash: string;
  requirements: string[];
  isClient: boolean;
  status: number;
}

export function BuildPreview({
  jobId,
  previewUrl,
  deliverableHash,
  sourceHash,
  requirements,
  isClient,
  status,
}: DeliverablePreviewProps) {
  const { chain } = useAccount();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { writeContract: acceptDeliverable, data: acceptHash, isPending: isAccepting } = useWriteContract();
  const { isLoading: isAcceptConfirming } = useWaitForTransactionReceipt({ hash: acceptHash });

  const contractAddress = chain?.id
    ? CONTRACT_ADDRESSES[chain.id as keyof typeof CONTRACT_ADDRESSES]?.escrow
    : undefined;

  const toggleRequirement = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const handleAcceptDeliverable = () => {
    if (!contractAddress) return;
    acceptDeliverable({
      address: contractAddress as `0x${string}`,
      abi: FREELANCER_ESCROW_ABI,
      functionName: "acceptBuild",
      args: [jobId as `0x${string}`],
    });
  };

  const allRequirementsMet = checkedItems.size === requirements.length;
  const isDeliverableSubmitted = status === 2;

  return (
    <div className="card">
      <h3 className="text-white font-medium mb-4">Deliverable Preview</h3>

      {/* Preview Frame */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 mb-4">
        {previewUrl && (previewUrl.startsWith('http://localhost') || previewUrl.startsWith('http://127.0.0.1')) ? (
          <>
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-black/60 backdrop-blur-md rounded-md hover:bg-white text-white/70 hover:text-black transition-all border border-white/10 hover:border-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </>
        ) : previewUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <FileCheck className="w-7 h-7 text-emerald-400/60" />
            </div>
            <div className="text-center">
              <p className="text-white/60 text-sm font-medium mb-1">Deliverable Submitted</p>
              <p className="text-white/30 text-xs">Open the preview link to review externally</p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 rounded-lg text-white/70 hover:text-white text-xs font-medium transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Preview
            </a>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30 gap-3">
             <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin opacity-50" />
             </div>
            <span className="text-sm font-light">Processing preview...</span>
          </div>
        )}
      </div>

      {/* Preview URL */}
      <div className="flex items-center gap-2 text-xs text-white/40 mb-8 px-1">
        <span>Preview Endpoint</span>
        <div className="h-px bg-white/10 flex-1" />
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 hover:text-white hover:underline flex items-center gap-1.5 transition-colors font-mono"
        >
          {previewUrl ? (() => { try { return new URL(previewUrl).host; } catch { return previewUrl; } })() : 'pending...'}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Requirements Checklist */}
      <div className="mb-8">
        <h4 className="label mb-4">
          Verification Checklist
        </h4>
        <div className="space-y-2">
          {requirements.map((req, index) => (
            <label
              key={index}
              className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                checkedItems.has(index)
                  ? "bg-green-500/[0.05] border-green-500/20"
                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
              }`}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={checkedItems.has(index)}
                  onChange={() => toggleRequirement(index)}
                  className="sr-only"
                  disabled={!isClient || !isDeliverableSubmitted}
                />
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    checkedItems.has(index)
                      ? "bg-green-500 border-green-500 text-black shadow-[0_0_10px_-2px_rgba(34,197,94,0.4)]"
                      : "bg-transparent border-white/20 group-hover:border-white/40"
                  }`}
                >
                  {checkedItems.has(index) && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>
              <span className={`text-sm leading-snug transition-colors ${checkedItems.has(index) ? "text-white/90" : "text-white/50 group-hover:text-white/70"}`}>
                {req}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Deliverable Hashes */}
      <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-lg mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs uppercase tracking-wider">Deliverable Hash</span>
          <code className="text-white/60 font-mono text-xs bg-white/[0.05] px-2 py-1 rounded">
            {(deliverableHash ?? "—").slice(0, 16)}{deliverableHash ? "..." : ""}
          </code>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-white/30 text-xs uppercase tracking-wider">Source Files</span>
            <code className="text-white/60 font-mono text-xs bg-white/[0.05] px-2 py-1 rounded">
                {(sourceHash ?? "—").slice(0, 16)}{sourceHash ? "..." : ""}
            </code>
        </div>
      </div>

      {/* Actions */}
      {isClient && isDeliverableSubmitted && (
        <div className="flex gap-3">
          <button
            onClick={handleAcceptDeliverable}
            disabled={!allRequirementsMet || isAccepting || isAcceptConfirming}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isAccepting || isAcceptConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Accept Deliverable
              </>
            )}
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Request Changes
          </button>
          <button className="btn-danger flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>
      )}

      {!isClient && isDeliverableSubmitted && (
        <div className="text-center text-white/50 py-4">
          Waiting for client to review deliverable...
        </div>
      )}
    </div>
  );
}
