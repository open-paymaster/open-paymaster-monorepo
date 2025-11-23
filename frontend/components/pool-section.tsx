'use client';

import { User } from 'lucide-react';
import { useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { PoolAnalyticsShell } from '@/components/pool-analytics-shell';
import { PoolCreationPanel } from '@/components/pool-creation-panel';
import SlideOver from '@/components/ui/slide-over';
import type { PoolRow } from '@/data/pools';

type PoolSectionProps = {
  actions: Parameters<typeof PoolAnalyticsShell>[0]['actions'];
  data?: PoolRow[];
};

export function PoolSection({ actions, data }: PoolSectionProps) {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <section className="flex h-full flex-col gap-6">
        <div className="flex flex-col gap-4 shrink-0 sm:flex-row sm:items-center sm:justify-between">
          <p className="ml-1 text-sm font-medium uppercase tracking-[0.5em] text-slate-500">
            Pools
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-1 items-center gap-3 rounded-4xl border border-white/60 bg-white/75 px-4 py-2 shadow-[0_15px_45px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:w-80">
              <span className="text-slate-400">🔍</span>
              <input
                type="search"
                placeholder="Search pools or tokens"
                value={query}
                onChange={(evt) => setQuery(evt.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <LiquidGlassButton
              type="button"
              className="sm:w-auto"
              onClick={() => setIsCreateOpen(true)}
            >
              Create
            </LiquidGlassButton>

            <LiquidGlassButton
              type="button"
              className={`h-full ${isConnected ? 'connected-user-button' : ''}`}
              onClick={() =>
                void open({ view: isConnected ? 'Account' : 'Connect' })
              }
              aria-label="Open wallet"
            >
              <User size={20} className="relative z-10" />
            </LiquidGlassButton>
          </div>
        </div>
        <div className="min-h-0 flex-1 ">
          <PoolAnalyticsShell
            actions={actions}
            data={data}
            searchQuery={query}
          />
        </div>
      </section>

      <SlideOver
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        eyebrowText="Pool creation"
        ariaLabel="Create pool panel"
        panelClassName="before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_top_left,rgba(216,180,254,0.32),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.32),transparent_40%)]"
      >
        <PoolCreationPanel onClose={() => setIsCreateOpen(false)} />
      </SlideOver>
    </>
  );
}
