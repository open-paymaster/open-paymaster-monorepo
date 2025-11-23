'use client';

import { usePathname } from 'next/navigation';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { arbitrum, base } from '@reown/appkit/networks';
import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    name: 'universal-paymaster',
    description: 'Universal Paymaster',
    url: 'universalpaymaster.com',
    icons: [''],
  },
  networks: [base, arbitrum],
  defaultNetwork: base,
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
        </PoolsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
