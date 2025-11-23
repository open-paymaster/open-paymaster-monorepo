'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Config, cookieToInitialState, WagmiProvider } from 'wagmi';

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
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // metamask
  ],
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
    analytics: false,
  },
});

const queryClient = new QueryClient();

export const Providers = ({
  children,
  cookies,
}: {
  cookies: string | null;
  children: ReactNode;
}) => {
  const pathname = usePathname();
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {pathname != '/' && <ControlOrb />}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
