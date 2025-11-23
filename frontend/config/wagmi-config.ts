import { arbitrum, base } from 'viem/chains';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

import { cookieStorage, createStorage } from 'wagmi';
import { env } from './env';

export const projectId = env.projectId;

if (!projectId) {
  throw new Error('Reown project ID is not defined');
}

export const networks = [base, arbitrum];
export const chainIds = [BigInt(base.id), BigInt(arbitrum.id)];

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
