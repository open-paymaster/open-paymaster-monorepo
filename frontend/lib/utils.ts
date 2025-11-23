import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Address } from 'viem';
import { PoolInitializedLog } from './sc-actions';
import { PoolRow } from '@/components/pool-table';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------- */
/*                              Token config (JSON)                           */
/* -------------------------------------------------------------------------- */

const TOKEN_LIST = {
  USDC: [
    {
      chainId: 1,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    {
      chainId: 10,
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    },
    {
      chainId: 42161,
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    {
      chainId: 8453,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  ],
  WETH: [
    {
      chainId: 1,
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    {
      chainId: 10,
      address: '0x4200000000000000000000000000000000000006',
    },
    {
      chainId: 42161,
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    {
      chainId: 8453,
      address: '0x4200000000000000000000000000000000000006',
    },
  ],
  USDT: [
    {
      chainId: 1,
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    {
      chainId: 10,
      address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    },
    {
      chainId: 42161,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    },
    {
      chainId: 8453,
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    },
  ],
  DAI: [
    {
      chainId: 1,
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    {
      chainId: 10,
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
    {
      chainId: 42161,
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
    {
      chainId: 8453,
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    },
  ],
} as const;

type TokenList = typeof TOKEN_LIST;

type AddressMeta = {
  symbol: string;
  chainId: number;
};

const buildAddressMetadata = (config: TokenList) => {
  const result: Record<string, AddressMeta> = {};

  for (const [symbol, entries] of Object.entries(config)) {
    for (const entry of entries) {
      // key by lowercased address
      result[entry.address.toLowerCase()] = {
        symbol,
        chainId: entry.chainId,
      };
    }
  }

  return result;
};

// address (lowercase) -> { symbol, chainId }
const ADDRESS_METADATA: Record<string, AddressMeta> =
  buildAddressMetadata(TOKEN_LIST);

/* -------------------------------------------------------------------------- */
/*                                Small helpers                               */
/* -------------------------------------------------------------------------- */

const shortenAddress = (addr: Address) =>
  `${addr.slice(0, 6)}…${addr.slice(-4)}`;

const pseudoRandomFromString = (seed: string, min: number, max: number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const normalized = (hash >>> 0) / 2 ** 32; // 0..1
  return min + normalized * (max - min);
};

const formatMillions = (value: number) => `${value.toFixed(1)}M`;
const formatThousands = (value: number) => `${value.toFixed(1)}K`;

/* -------------------------------------------------------------------------- */
/*                            Log -> Table row mapper                         */
/* -------------------------------------------------------------------------- */

export const mapPoolLogToRow = (log: PoolInitializedLog): PoolRow => {
  const tokenAddress = log.token as Address;
  const tokenLower = tokenAddress.toLowerCase();
  const meta = ADDRESS_METADATA[tokenLower];

  const symbol = meta?.symbol ?? shortenAddress(tokenAddress);
  const chainId = meta?.chainId ?? 0; // if not found, 0; you can swap to your default chain id

  const id = `eth-${symbol.toLowerCase()}`;

  // lpFeeBps is bps (1% = 100 bps)
  const lpFeeBpsNumber =
    typeof log.lpFeeBps === 'bigint' ? Number(log.lpFeeBps) : log.lpFeeBps;
  const lpFeePct = lpFeeBpsNumber ?? 1 / 100; // 20 bps -> 0.20%
  const fee = `${lpFeePct.toFixed(2)}%`;

  // deterministic fake metrics (stable per chain + pair)
  const seed = `${chainId}-${id}`;

  const tvlMillions = pseudoRandomFromString(seed + 'tvl', 5, 80); // 5M–80M
  const aprPct = pseudoRandomFromString(seed + 'apr', 3, 12); // 3%–12%
  const volThousands = pseudoRandomFromString(seed + 'vol', 1, 25); // 1K–25K
  const rebalance = pseudoRandomFromString(seed + 'rebalance', 98, 100); // 98–100%

  return {
    id,
    pool: `ETH / ${symbol}`,
    tokens: ['ETH', symbol],
    fee,
    tvl: `$${formatMillions(tvlMillions)}`,
    apr: `${aprPct.toFixed(1)}%`,
    sevenDayVolume: `$${formatThousands(volThousands)}`,
    rebalanceFactor: `${rebalance.toFixed(1)}%`,

    chainId,
    tokenAddress,
  };
};
