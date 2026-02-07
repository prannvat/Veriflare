"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from "wagmi";
import { useState, useEffect } from "react";
import { Wallet, ChevronDown, LogOut, Check, AlertCircle, ExternalLink, Coins } from "lucide-react";

const COSTON2_CHAIN = {
  chainId: '0x72', // 114 in hex
  chainName: 'Coston2 Testnet',
  nativeCurrency: {
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
    decimals: 18,
  },
  rpcUrls: ['https://coston2-api.flare.network/ext/C/rpc'],
  blockExplorerUrls: ['https://coston2-explorer.flare.network'],
};

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, chains } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  
  const [showMenu, setShowMenu] = useState(false);
  const [showChainMenu, setShowChainMenu] = useState(false);
  const [addingChain, setAddingChain] = useState(false);

  const currentChain = chains.find(c => c.id === chainId);
  const isWrongNetwork = isConnected && chainId !== 114;
  
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: typeof balance) => {
    if (!bal) return "0";
    const num = parseFloat(bal.formatted);
    if (num < 0.01) return "<0.01";
    return num.toFixed(2);
  };

  // Auto-add Coston2 if wrong network
  const addCoston2Network = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    setAddingChain(true);
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [COSTON2_CHAIN],
      });
    } catch (err) {
      console.error('Failed to add network:', err);
    }
    setAddingChain(false);
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClick = () => {
      setShowMenu(false);
      setShowChainMenu(false);
    };
    if (showMenu || showChainMenu) {
      setTimeout(() => document.addEventListener('click', handleClick), 0);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showMenu, showChainMenu]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 relative">
        {/* Wrong network warning */}
        {isWrongNetwork && (
          <button
            onClick={addCoston2Network}
            disabled={addingChain}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4" />
            {addingChain ? "Switching..." : "Switch to Coston2"}
          </button>
        )}

        {/* Chain Selector */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowChainMenu(!showChainMenu); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
              isWrongNetwork 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.1] text-white/80'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isWrongNetwork ? 'bg-red-400' : 'bg-green-400'}`} />
            <span>{currentChain?.name || 'Unknown Network'}</span>
            <ChevronDown className="w-3 h-3 text-white/50" />
          </button>
          
          {showChainMenu && (
            <div className="absolute top-full mt-2 right-0 w-56 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider">Select Network</p>
              </div>
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    switchChain({ chainId: chain.id });
                    setShowChainMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-white/[0.05] flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${chain.id === chainId ? 'bg-green-400' : 'bg-white/20'}`} />
                    <span className="text-white/80">{chain.name}</span>
                    {chain.testnet && <span className="text-xs text-orange-400/70">testnet</span>}
                  </div>
                  {chain.id === chainId && <Check className="w-4 h-4 text-green-400" />}
                </button>
              ))}
              <a
                href="https://faucet.flare.network/coston2"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3 text-left hover:bg-white/[0.05] flex items-center gap-2 text-sm text-orange-400 border-t border-white/10"
              >
                <Coins className="w-4 h-4" />
                Get Free Testnet Tokens
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </div>
          )}
        </div>

        {/* Balance Display */}
        {balance && !isWrongNetwork && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
            <Coins className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-white/80">{formatBalance(balance)}</span>
            <span className="text-white/40">{balance.symbol}</span>
          </div>
        )}

        {/* Account */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors text-sm"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
            {truncateAddress(address)}
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showMenu && (
            <div className="absolute top-full mt-2 right-0 w-56 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-white/40 text-xs">Connected as</p>
                <p className="text-white font-mono text-xs mt-1">{address}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(address);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-white/[0.05] text-white/80 text-sm"
              >
                Copy Address
              </button>
              <a
                href={`https://coston2-explorer.flare.network/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3 text-left hover:bg-white/[0.05] text-white/80 text-sm flex items-center gap-2"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3 text-white/40" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  disconnect();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-white/[0.05] text-red-400 flex items-center gap-2 text-sm border-t border-white/10"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        disabled={isPending}
        className="btn-primary flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      
      {showMenu && !isPending && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 bg-orange-500/5">
            <p className="text-white/80 text-sm font-medium">Connect to Veriflare</p>
            <p className="text-white/40 text-xs mt-0.5">Using Coston2 Testnet</p>
          </div>
          <div className="p-2">
            {connectors.map((connector) => {
              // Better naming for the connector
              const displayName = connector.name === 'Injected' ? 'MetaMask' : connector.name;
              const isMetaMask = connector.name === 'Injected' || connector.name.toLowerCase().includes('metamask');
              
              return (
                <button
                  key={connector.uid}
                  onClick={(e) => {
                    e.stopPropagation();
                    connect({ connector });
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-white/[0.05] rounded-lg flex items-center gap-3 text-sm"
                >
                  <div className={`w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center ${
                    isMetaMask 
                      ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20' 
                      : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                  }`}>
                    {isMetaMask ? (
                      <span className="text-xl">🦊</span>
                    ) : (
                      <Wallet className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-white font-medium block">{displayName}</span>
                    <span className="text-white/40 text-xs">Click to connect</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
            <p className="text-white/40 text-xs">
              Need testnet tokens?{' '}
              <a 
                href="https://faucet.flare.network/coston2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300"
              >
                Get free C2FLR →
              </a>
            </p>
          </div>
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              {error.message.slice(0, 100)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
