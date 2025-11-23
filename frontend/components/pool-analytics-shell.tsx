'use client';

import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { PoolRow, PoolTable } from '@/components/pool-table';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import SlideOver from '@/components/ui/slide-over';
import useGetPools from '@/hooks/useGetPools';
import { mapPoolLogToRow } from '@/lib/utils';

type PoolAction = {
  label: string;
  description?: string;
  action: (formData: FormData) => void;
  variant?: 'primary' | 'ghost';
};

type PoolAnalyticsShellProps = {
  actions?: PoolAction[];
  searchQuery?: string;
};

export function PoolAnalyticsShell({
  actions = [],
  searchQuery = '',
}: PoolAnalyticsShellProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const [, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(searchQuery);

  const { data: logs, isLoading } = useGetPools();

  console.log(logs);
  console.log(isLoading);

  const poolRows = useMemo(() => {
    if (!logs) return [];
    return logs.map(mapPoolLogToRow);
  }, [logs]);
  const filteredData = useMemo(() => {
    if (!poolRows.length) return [];

    if (!deferredQuery.trim()) {
      return poolRows;
    }

    const normalized = deferredQuery.trim().toLowerCase();

    return poolRows.filter((pool) => {
      const matchPool = pool.pool.toLowerCase().includes(normalized);
      const matchTokens = pool.tokens?.some((token) =>
        token.toLowerCase().includes(normalized),
      );
      return matchPool || matchTokens;
    });
  }, [deferredQuery, poolRows]);

  const selectedPool = useMemo(
    () => filteredData.find((pool) => pool.id === selectedPoolId) ?? null,
    [filteredData, selectedPoolId],
  );

  const handleSelectRow = (row: PoolRow) => {
    startTransition(() => {
      setSelectedPoolId(row.id);
      setIsPanelOpen(true);
    });
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedPoolId(null);
  };

  return (
    <div className="relative flex h-full flex-col">
      <PoolTable
        data={filteredData}
        onSelectRow={handleSelectRow}
        selectedPoolId={selectedPoolId}
      />

      <SlideOver
        isOpen={isPanelOpen}
        onClose={closePanel}
        eyebrowText="Pool"
        titleText={selectedPool?.pool ?? ''}
        ariaLabel="Pool action panel"
        panelClassName="flex flex-col gap-6"
      >
        {selectedPool ? (
          <div className="flex h-full flex-col justify-between">
            <dl className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  TVL
                </dt>
                <dd className="text-lg font-semibold text-slate-900">
                  {selectedPool.tvl}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  APR
                </dt>
                <dd className="text-lg font-semibold text-slate-900">
                  {selectedPool.apr}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  7D Volume
                </dt>
                <dd className="text-lg font-semibold text-slate-900">
                  {selectedPool.sevenDayVolume}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Rebalance Factor
                </dt>
                <dd className="text-lg font-semibold text-slate-900">
                  {selectedPool.rebalanceFactor}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  LPFee
                </dt>
                <dd className="text-lg font-semibold text-slate-900">
                  {selectedPool.fee}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Rebalancing Fee
                </dt>
                <dd className="text-lg font-semibold text-slate-900">0.5%</dd>
              </div>
            </dl>

            <div className="space-y-4">
              {actions.length === 0 && (
                <p className="text-sm text-slate-500">
                  Hook up server actions to perform rebalances, override fees,
                  or trigger alerts.
                </p>
              )}

              {actions.map((action) => (
                <div key={action.label} className="space-y-1">
                  <form action={action.action} className="flex w-full">
                    <input
                      type="hidden"
                      name="poolId"
                      value={selectedPool.id}
                    />
                    <input
                      type="hidden"
                      name="poolName"
                      value={selectedPool.pool}
                    />
                    <LiquidGlassButton type="submit" className="w-full">
                      {action.label}
                    </LiquidGlassButton>
                  </form>
                  {action.description && (
                    <p className="text-xs text-slate-400">
                      {action.description}
                    </p>
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <LiquidGlassButton type="button" className="w-full">
                  Rebalance
                </LiquidGlassButton>
                <p className="text-xs text-slate-400">
                  Swap ETH for the pool’s paired token to refill reserves.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">
            Select a pool to inspect its metrics.
          </div>
        )}
      </SlideOver>
    </div>
  );
}
