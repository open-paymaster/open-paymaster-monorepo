'use client';

import { useMemo } from 'react';
import { StatusDonut } from './status-donut';
import { CountUpValue } from '@/components/count-up-value';
import useGetPools from '@/hooks/useGetPools';

type StatusCardProps = {
  stats?: Array<{ label: string; value: string; change: string }>;
};

const parseTvlValue = (raw: string) => {
  const normalized = raw.replace(/,/g, '').trim();
  const match = normalized.match(/([\d.]+)/);
  if (!match) {
    return 0;
  }
  const amount = parseFloat(match[1]);
  if (normalized.toLowerCase().includes('b')) {
    return amount * 1_000_000_000;
  }
  if (normalized.toLowerCase().includes('m')) {
    return amount * 1_000_000;
  }
  if (normalized.toLowerCase().includes('k')) {
    return amount * 1_000;
  }
  return amount;
};

const parsePercentValue = (raw: string) => {
  const normalized = raw.replace(/,/g, '').trim();
  const match = normalized.match(/([-+]?[\d.]+)/);
  if (!match) {
    return 0;
  }
  return parseFloat(match[1]);
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString('en-US', {
    maximumFractionDigits: value < 100 ? 1 : 0,
  })}`;
};

export function StatusCard({ stats: fallbackStats = [] }: StatusCardProps) {
  const { poolsRow } = useGetPools();

  const { donutData, totalValue, statItems } = useMemo(() => {
    if (!poolsRow.length) {
      const fallbackTotal = fallbackStats[0]?.value
        ? parseTvlValue(fallbackStats[0].value)
        : 0;

      return {
        donutData: [],
        totalValue: fallbackTotal,
        statItems: fallbackStats,
      };
    }

    const sourcePools = poolsRow.map((pool) => ({
      id: pool.id,
      label: pool.pool,
      value: parseTvlValue(pool.tvl),
      apr: parsePercentValue(pool.apr),
      sevenDayVolume: parseTvlValue(pool.sevenDayVolume),
    }));

    const sortedPools = [...sourcePools].sort((a, b) => b.value - a.value);

    const topFive = sortedPools.slice(0, 5).map(({ id, label, value }) => ({
      id,
      label,
      value,
    }));
    const othersValue = sortedPools
      .slice(5)
      .reduce((sum, pool) => sum + pool.value, 0);

    const donutData =
      othersValue > 0
        ? [...topFive, { id: 'others', label: 'Others', value: othersValue }]
        : topFive;

    const totalValue = sortedPools.reduce((sum, pool) => sum + pool.value, 0);
    const avgApr =
      sortedPools.reduce((sum, pool) => sum + pool.apr, 0) / sortedPools.length;
    const sevenDayVolumeTotal = sortedPools.reduce(
      (sum, pool) => sum + pool.sevenDayVolume,
      0,
    );

    const statItems = [
      {
        label: 'TVL',
        value: formatCompactCurrency(totalValue),
        change: `${sortedPools.length} pools live`,
      },
      {
        label: 'Avg. APR',
        value: `${avgApr.toFixed(1)}%`,
        change: 'Blended across active pools',
      },
      {
        label: '7D Volume',
        value: formatCompactCurrency(sevenDayVolumeTotal),
        change: 'Across all pools',
      },
      {
        label: 'Pools',
        value: `${sortedPools.length}`,
        change: 'Active on Open Paymaster',
      },
    ];

    return { donutData, totalValue, statItems };
  }, [poolsRow, fallbackStats]);

  return (
    <section className="flex h-full flex-1 flex-col gap-6 rounded-4xl border border-white/75 bg-white/95 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-7">
      <div>
        <p className="shimmer-heading text-xs font-medium uppercase tracking-[0.4em] text-center">
          Open Paymaster
        </p>

        <div className="flex w-full items-center justify-center">
          <StatusDonut data={donutData} totalValue={totalValue} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-start justify-end gap-6 mb-10">
        {statItems.slice(1).map((stat) => (
          <div key={stat.label} className="flex flex-col justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-2 text-[0.95rem] font-medium text-slate-900/80 tracking-[0.01em]">
                <CountUpValue value={stat.value} durationMs={600} />
              </p>
            </div>
            <p className="text-[0.7rem] text-slate-500/90 tracking-widest uppercase">
              {stat.change}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
