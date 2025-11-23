'use client';

import { usePathname } from 'next/navigation';
import { WagmiProvider } from 'wagmi';
import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ControlOrb } from '@/components/control-orb';
import { projectId, wagmiAdapter } from '@/config/wagmi-config';
import { createAppKit } from '@reown/appkit/react';
import { arbitrum, base } from '@reown/appkit/networks';

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

export const Providers = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        {pathname != '/' && <ControlOrb />}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
