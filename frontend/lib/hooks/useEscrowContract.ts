// React hooks for real on-chain contract interactions
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther, formatEther, keccak256, toHex } from 'viem';
import { FREELANCER_ESCROW_ABI, getEscrowAddress, JOB_STATUS, type JobStatus } from '../contracts';

// ═══════════════════════════════════════════════════════════
//                    READ HOOKS
// ═══════════════════════════════════════════════════════════

/**
 * Get job details from the contract
 */
export function useJob(jobId: `0x${string}` | undefined) {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);

  return useReadContract({
    address: escrowAddress ?? undefined,
    abi: FREELANCER_ESCROW_ABI,
    functionName: 'getJob',
    args: jobId ? [jobId] : undefined,
    query: {
      enabled: !!jobId && !!escrowAddress,
    },
  });
}

/**
 * Get build submission for a job
 */
export function useBuildSubmission(jobId: `0x${string}` | undefined) {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);

  return useReadContract({
    address: escrowAddress ?? undefined,
    abi: FREELANCER_ESCROW_ABI,
    functionName: 'getBuildSubmission',
    args: jobId ? [jobId] : undefined,
    query: {
      enabled: !!jobId && !!escrowAddress,
    },
  });
}

/**
 * Check if a wallet has linked GitHub
 */
export function useIsGitHubLinked(wallet: `0x${string}` | undefined) {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);

  return useReadContract({
    address: escrowAddress ?? undefined,
    abi: FREELANCER_ESCROW_ABI,
    functionName: 'isGitHubLinked',
    args: wallet ? [wallet] : undefined,
    query: {
      enabled: !!wallet && !!escrowAddress,
    },
  });
}

/**
 * Get GitHub username for a wallet
 */
export function useWalletGitHub(wallet: `0x${string}` | undefined) {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);

  return useReadContract({
    address: escrowAddress ?? undefined,
    abi: FREELANCER_ESCROW_ABI,
    functionName: 'getWalletGitHub',
    args: wallet ? [wallet] : undefined,
    query: {
      enabled: !!wallet && !!escrowAddress,
    },
  });
}

/**
 * Get total jobs count
 */
export function useTotalJobs() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);

  return useReadContract({
    address: escrowAddress ?? undefined,
    abi: FREELANCER_ESCROW_ABI,
    functionName: 'totalJobs',
    query: {
      enabled: !!escrowAddress,
    },
  });
}

/**
 * Get total value locked
 */
export function useTotalValueLocked() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);

  return useReadContract({
    address: escrowAddress ?? undefined,
    abi: FREELANCER_ESCROW_ABI,
    functionName: 'totalValueLocked',
    query: {
      enabled: !!escrowAddress,
    },
  });
}

// ═══════════════════════════════════════════════════════════
//                    WRITE HOOKS
// ═══════════════════════════════════════════════════════════

/**
 * Create a new job with escrowed payment
 */
export function useCreateJob() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createJob = async (params: {
    clientRepo: string;
    targetBranch: string;
    requirementsHash: `0x${string}`;
    deadline: bigint;
    reviewPeriod: bigint;
    paymentAmount: string; // in FLR/C2FLR
  }) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'createJob',
      args: [
        params.clientRepo,
        params.targetBranch,
        params.requirementsHash,
        params.deadline,
        params.reviewPeriod,
      ],
      value: parseEther(params.paymentAmount),
    });
  };

  return {
    createJob,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Accept a job as freelancer
 */
export function useAcceptJob() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const acceptJob = (jobId: `0x${string}`) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'acceptJob',
      args: [jobId],
    });
  };

  return {
    acceptJob,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Submit a build for review
 */
export function useSubmitBuild() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const submitBuild = (params: {
    jobId: `0x${string}`;
    buildHash: `0x${string}`;
    sourceCodeHash: `0x${string}`;
    previewUrl: string;
    buildManifestIpfs: string;
  }) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'submitBuild',
      args: [
        params.jobId,
        params.buildHash,
        params.sourceCodeHash,
        params.previewUrl,
        params.buildManifestIpfs,
      ],
    });
  };

  return {
    submitBuild,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Accept a build as client
 */
export function useAcceptBuild() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const acceptBuild = (jobId: `0x${string}`) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'acceptBuild',
      args: [jobId],
    });
  };

  return {
    acceptBuild,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Claim payment with FDC proof
 */
export function useClaimPayment() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claimPayment = (jobId: `0x${string}`, proof: any) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'claimPayment',
      args: [jobId, proof],
    });
  };

  return {
    claimPayment,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Request changes to a build
 */
export function useRequestChanges() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const requestChanges = (jobId: `0x${string}`, newRequirementsHash: `0x${string}`) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'requestChanges',
      args: [jobId, newRequirementsHash],
    });
  };

  return {
    requestChanges,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Open a dispute
 */
export function useOpenDispute() {
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const openDispute = (jobId: `0x${string}`, reason: string) => {
    if (!escrowAddress) throw new Error('Contract not deployed on this network');
    
    writeContract({
      address: escrowAddress,
      abi: FREELANCER_ESCROW_ABI,
      functionName: 'openDispute',
      args: [jobId, reason],
    });
  };

  return {
    openDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// ═══════════════════════════════════════════════════════════
//                    UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get human-readable job status
 */
export function getJobStatusLabel(status: number): string {
  return JOB_STATUS[status as JobStatus] || 'Unknown';
}

/**
 * Format payment amount from wei to FLR
 */
export function formatPayment(amount: bigint): string {
  return formatEther(amount);
}

/**
 * Generate requirements hash from content
 */
export function hashRequirements(content: string): `0x${string}` {
  return keccak256(toHex(content));
}
