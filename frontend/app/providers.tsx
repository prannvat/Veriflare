"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with error handling
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Suppress any remaining WalletConnect connection errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Connection interrupted') || 
          event.message?.includes('WalletConnect') ||
          event.message?.includes('subscribe')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Connection interrupted') ||
          event.reason?.message?.includes('WalletConnect') ||
          event.reason?.message?.includes('subscribe')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
