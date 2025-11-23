'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address } from 'viem';

import {
  publicClient,
  PoolInitializedLog,
  fetchPoolInitializedLogs,
} from '@/lib/sc-actions';
import { env } from '@/config/env';
import { OpenPaymasterAbi } from '@/lib/abi/openPaymasterAbi';
import { mapPoolLogToRow } from '@/lib/utils';

const QUERY_KEY = ['pools', 'PoolInitialized'];

export default function useGetPools() {
  const queryClient = useQueryClient();

  // 1) Historical events
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchPoolInitializedLogs(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // 2) Live subscription
  useEffect(() => {
    const unwatch = publicClient.watchContractEvent({
      address: env.paymasterAddress as Address,
      abi: OpenPaymasterAbi,
      eventName: 'PoolInitialized',
      // if you don't have websocket transport, polling is fine:
      poll: true,
      pollingInterval: 4_000,
      onLogs: (logs) => {
        if (!logs.length) return;

        queryClient.setQueryData<PoolInitializedLog[] | undefined>(
          QUERY_KEY,
          (prev = []) => {
            const nextLogs: PoolInitializedLog[] = logs.map((log) => ({
              token: log.args.token as Address,
              oracle: log.args.oracle as Address,
              lpFeeBps: log.args.lpFeeBps,
              rebalancingFeeBps: log.args.rebalancingFeeBps,
              blockNumber: log.blockNumber!,
              transactionHash: log.transactionHash!,
              logIndex: log.logIndex!,
            }));

            const merged = [...prev, ...nextLogs];

            const byKey = new Map<string, PoolInitializedLog>();
            for (const item of merged) {
              const key = `${item.transactionHash}-${item.logIndex.toString()}`;
              byKey.set(key, item);
            }

            return Array.from(byKey.values()).sort((a, b) => {
              if (a.blockNumber === b.blockNumber) {
                return Number(a.logIndex - b.logIndex);
              }
              return Number(a.blockNumber - b.blockNumber);
            });
          },
        );
      },
      onError: (err) => {
        console.error('[PoolInitialized] watch error', err);
      },
    });

    return () => {
      unwatch?.();
    };
  }, [queryClient]);

  const poolRows = useMemo(
    () => query.data?.map(mapPoolLogToRow) ?? [],
    [query.data],
  );

  return { ...query, poolRows, poolsRow: poolRows };
}
