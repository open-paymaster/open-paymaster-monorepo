import { arbitrum, base } from 'viem/chains';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

import { cookieStorage, createStorage } from 'wagmi';

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('Reown project ID is not defined');
}

export const networks = [arbitrum, base];
export const chainIds = [BigInt(arbitrum.id), BigInt(base.id)];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  batch: { multicall: true },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
