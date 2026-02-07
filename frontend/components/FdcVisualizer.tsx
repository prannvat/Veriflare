"use client";

import { useState, useEffect } from "react";
import { 
  Shield, 
  CheckCircle, 
  Loader2, 
  ExternalLink, 
  AlertCircle,
  Database,
  GitCommit,
  FileCheck,
  Vote,
  Lock
} from "lucide-react";
import { FdcProgress, FDC_STEPS } from "@/lib/fdc";
import { FLARE_LINKS } from "@/lib/demo-data";

interface FdcVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  progress: FdcProgress | null;
  result: {
    success: boolean;
    proofHash?: string;
    txHash?: string;
    votingRound?: number;
    error?: string;
  } | null;
  title?: string;
}

const STEP_ICONS = [
  <FileCheck key="1" className="w-5 h-5" />,
  <GitCommit key="2" className="w-5 h-5" />,
  <Vote key="3" className="w-5 h-5" />,
  <Database key="4" className="w-5 h-5" />,
  <Lock key="5" className="w-5 h-5" />,
];

export function FdcVisualizer({ isOpen, onClose, progress, result, title = "FDC Attestation" }: FdcVisualizerProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    if (progress?.status === 'complete') {
      setCompletedSteps(prev => {
        const next = new Set(Array.from(prev));
        next.add(progress.step);
        return next;
      });
    }
  }, [progress]);

  useEffect(() => {
    if (!isOpen) {
      setCompletedSteps(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isComplete = result?.success;
  const hasError = result?.success === false && result?.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={isComplete || hasError ? onClose : undefined} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 glass rounded-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">{title}</h3>
              <p className="text-sm text-white/50">Flare Data Connector Web2Json</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-3">
          {FDC_STEPS.map((step, idx) => {
            const isActive = progress?.step === step.step && progress?.status === 'active';
            const isCompleted = completedSteps.has(step.step);
            const isPending = !isActive && !isCompleted && step.step > (progress?.step || 0);
            
            return (
              <div
                key={step.step}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-amber-500/10 border border-amber-500/30' 
                    : isCompleted 
                      ? 'bg-green-500/5 border border-green-500/20'
                      : 'bg-white/[0.02] border border-white/[0.05]'
                }`}
              >
                {/* Step icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : isCompleted 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/[0.05] text-white/30'
                }`}>
                  {isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    STEP_ICONS[idx]
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium uppercase tracking-wider ${
                      isActive ? 'text-amber-400' : isCompleted ? 'text-green-400' : 'text-white/30'
                    }`}>
                      Step {step.step}
                    </span>
                    {isCompleted && (
                      <span className="text-xs text-green-400/60">✓ Complete</span>
                    )}
                  </div>
                  <p className={`font-medium mt-0.5 ${
                    isActive || isCompleted ? 'text-white' : 'text-white/40'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-sm mt-1 ${
                    isActive ? 'text-amber-200/70' : isCompleted ? 'text-white/50' : 'text-white/30'
                  }`}>
                    {isActive && progress?.description 
                      ? progress.description 
                      : step.description}
                  </p>
                  
                  {/* Show tx hash if available */}
                  {isCompleted && progress?.step === step.step && progress?.txHash && (
                    <a 
                      href={`${FLARE_LINKS.explorer}/tx/${progress.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-amber-400 hover:text-amber-300"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Result */}
        {(isComplete || hasError) && (
          <div className={`p-6 border-t ${isComplete ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            {isComplete ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Attestation Complete!</span>
                </div>
                
                {result.proofHash && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-1">Proof Hash</p>
                    <code className="text-xs text-white/80 font-mono bg-black/30 px-2 py-1 rounded block truncate">
                      {result.proofHash}
                    </code>
                  </div>
                )}
                
                {result.txHash && (
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-1">Transaction</p>
                    <a 
                      href={`${FLARE_LINKS.explorer}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1"
                    >
                      {result.txHash.slice(0, 20)}...{result.txHash.slice(-8)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                
                {result.votingRound && (
                  <div className="mb-4">
                    <p className="text-xs text-white/40 mb-1">Voting Round</p>
                    <p className="text-sm text-white/80">#{result.votingRound}</p>
                  </div>
                )}
                
                <button onClick={onClose} className="btn-primary w-full">
                  Continue
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Attestation Failed</span>
                </div>
                <p className="text-sm text-white/60 mb-4">{result?.error}</p>
                <button onClick={onClose} className="btn-secondary w-full">
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* FDC Info Footer */}
        {!isComplete && !hasError && (
          <div className="px-6 py-4 border-t border-white/[0.05] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">
                Powered by Flare Data Connector
              </p>
              <a 
                href={FLARE_LINKS.fdcDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
