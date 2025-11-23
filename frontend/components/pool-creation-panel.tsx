'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { type Address } from 'viem';

import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { createPool } from '@/lib/sc-actions';

type PoolCreationPanelProps = {
  onClose?: () => void;
  className?: string;
};

function PoolCreationPanel({ className, onClose }: PoolCreationPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const tokenInput = formData.get('token')?.toString().trim() ?? '';
    const oracleInput = formData.get('oracle')?.toString().trim() ?? '';
    const lpFeeInput = formData.get('lpFeeBps')?.toString().trim() ?? '';
    const rebalancingFeeInput =
      formData.get('rebalancingFeeBps')?.toString().trim() ?? '';

    if (!tokenInput || !oracleInput || !lpFeeInput || !rebalancingFeeInput) {
      setError('All fields are required.');
      return;
    }

    const lpFeeBps = BigInt(lpFeeInput);
    const rebalancingFeeBps = BigInt(rebalancingFeeInput);

    if (
      Number.isNaN(lpFeeBps.toString()) ||
      Number.isNaN(rebalancingFeeBps.toString()) ||
      lpFeeBps < 0 ||
      rebalancingFeeBps < 0
    ) {
      setError('Fee inputs must be positive numbers (in basis points).');
      return;
    }

    setIsSubmitting(true);

    try {
      const { hash } = await createPool({
        token: tokenInput as Address,
        oracle: oracleInput as Address,
        lpFeeBps,
        rebalancingFeeBps,
      });

      setFeedback(`Pool creation submitted. Tx hash: ${hash}`);
    } catch (submitError) {
      console.error(submitError);
      setError('Failed to submit pool creation. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        'relative h-full max-h-screen overflow-hidden p-6',
        className,
      )}
    >
      <div className="flex h-full flex-col gap-10">
        <div className="pt-5 space-y-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  1. Pool ingredients
                </p>
                <p className="text-xs text-slate-500">
                  Provide the token and oracle powering this pool.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="pool-token"
                  className="text-xs tracking-widest font-medium text-slate-500"
                >
                  token address
                </label>
                <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-md">
                  <input
                    id="pool-token"
                    name="token"
                    type="text"
                    required
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="0x1234... token"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pool-oracle"
                  className="text-xs tracking-widest font-medium text-slate-500"
                >
                  oracle address
                </label>
                <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-md">
                  <input
                    id="pool-oracle"
                    name="oracle"
                    type="text"
                    required
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="0xabcd... oracle"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                2. Fee settings
              </p>
              <p className="text-xs text-slate-500">
                Set LP and rebalancing fees in basis points (10,000 = 100%).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="lp-fee"
                  className="text-xs tracking-widest font-medium text-slate-500"
                >
                  lp fee (bps)
                </label>
                <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-md">
                  <input
                    id="lp-fee"
                    name="lpFeeBps"
                    type="number"
                    min="0"
                    step="1"
                    required
                    className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="35"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="rebalancing-fee"
                  className="text-xs tracking-widest font-medium text-slate-500"
                >
                  rebalancing fee (bps)
                </label>
                <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-md">
                  <input
                    id="rebalancing-fee"
                    name="rebalancingFeeBps"
                    type="number"
                    min="0"
                    step="1"
                    required
                    className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-35.5 flex items-center justify-center w-full px-10">
          <LiquidGlassButton
            type="submit"
            disabled={isSubmitting}
            className="w-full justify-center"
          >
            {isSubmitting ? 'Creating pool...' : 'Create pool'}
          </LiquidGlassButton>
          {feedback && (
            <p className="text-xs font-medium text-slate-600">{feedback}</p>
          )}
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
      </div>
    </form>
  );
}

export { PoolCreationPanel };
