'use client';

import { useAccount, useChainId, useBalance } from 'wagmi';
import { useTotalJobs, useTotalValueLocked } from '@/lib/hooks';
import { getEscrowAddress, CONTRACT_ADDRESSES } from '@/lib/contracts';
import { formatEther } from 'viem';

/**
 * Component showing real contract status from the blockchain
 */
export function ContractStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const escrowAddress = getEscrowAddress(chainId);
  
  const { data: balance } = useBalance({ address });
  const { data: totalJobs, isLoading: loadingJobs } = useTotalJobs();
  const { data: tvl, isLoading: loadingTvl } = useTotalValueLocked();

  const networkName = chainId === 114 ? 'Coston2 Testnet' : chainId === 14 ? 'Flare Mainnet' : 'Unknown';
  const isSupported = chainId === 114 || chainId === 14;

  return (
    <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-6 border border-purple-500/30">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
        Live Contract Status
      </h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Network Info */}
        <div className="space-y-2">
          <div>
            <span className="text-gray-400">Network:</span>
            <span className={`ml-2 font-medium ${isSupported ? 'text-green-400' : 'text-red-400'}`}>
              {networkName}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">Chain ID:</span>
            <span className="ml-2 text-white">{chainId}</span>
          </div>
          
          {escrowAddress && (
            <div>
              <span className="text-gray-400">Contract:</span>
              <a 
                href={`https://coston2-explorer.flare.network/address/${escrowAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-purple-400 hover:text-purple-300 font-mono text-xs"
              >
                {escrowAddress.slice(0, 10)}...{escrowAddress.slice(-8)}
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div>
            <span className="text-gray-400">Total Jobs:</span>
            <span className="ml-2 text-white font-bold">
              {loadingJobs ? '...' : totalJobs?.toString() ?? '0'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">TVL:</span>
            <span className="ml-2 text-white font-bold">
              {loadingTvl ? '...' : tvl ? `${formatEther(tvl)} ${chainId === 114 ? 'C2FLR' : 'FLR'}` : '0'}
            </span>
          </div>
          
          {isConnected && balance && (
            <div>
              <span className="text-gray-400">Your Balance:</span>
              <span className="ml-2 text-green-400 font-bold">
                {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
              </span>
            </div>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className="mt-4 text-center text-gray-400 text-sm">
          Connect wallet to interact with the contract
        </div>
      )}

      {isConnected && !isSupported && (
        <div className="mt-4 p-3 bg-red-500/20 rounded-lg text-red-400 text-sm text-center">
          Please switch to Coston2 Testnet (Chain ID: 114)
        </div>
      )}
    </div>
  );
}

/**
 * Mini badge showing contract is live
 */
export function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full text-green-400 text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
      Live on Coston2
    </div>
  );
}
