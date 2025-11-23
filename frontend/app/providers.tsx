'use client';

import { usePathname } from 'next/navigation';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { arbitrum, base } from '@reown/appkit/networks';
import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ControlOrb } from '@/components/control-orb';
import { projectId, wagmiAdapter } from '@/config/wagmi-config';
import useGetPools from '@/hooks/useGetPools';

if (!projectId) {
  throw new Error('Reown project ID is not defined');
}

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  metadata: {
    name: 'open-paymaster',
    description: 'Open Paymaster',
    url: 'openpaymaster.com',
    icons: [''],
  },
  networks: [base, arbitrum],
  defaultNetwork: arbitrum,
  enableWalletConnect: false,
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
    analytics: false,
  },
});

const queryClient = new QueryClient();

const PoolsProvider = ({ children }: PropsWithChildren) => {
  useGetPools();
  return <>{children}</>;
};

export const Providers = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PoolsProvider>
          {children}
          {pathname != '/' && <ControlOrb />}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
                backdropFilter: 'blur(10px)',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#ecfdf3' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
              },
            }}
          />
        </PoolsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
