'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';

type TransferPanelProps = {
  onClose?: () => void;
  className?: string;
};

const iconClass =
  'flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-semibold text-white shadow-inner shadow-white/30 text-[11px] font-semibold text-white shadow-inner shadow-white/30';
const assetOptions: DropdownOption[] = [
  {
    value: 'ETH',
    label: 'Ether (ETH)',
    icon: (
      <span className={`${iconClass} from-indigo-500 via-sky-400 to-cyan-300 `}>
        ETH
      </span>
    ),
  },
  {
    value: 'BTC',
    label: 'Bitcoin (BTC)',
    icon: (
      <span
        className={`${iconClass} from-amber-400 via-orange-400 to-amber-500 `}
      >
        BTC
      </span>
    ),
  },
  {
    value: 'USDC',
    label: 'USD Coin (USDC)',
    icon: (
      <span className={`${iconClass} from-blue-500 via-sky-400 to-cyan-400 `}>
        USDC
      </span>
    ),
  },
];

const chainOptions: DropdownOption[] = [
  {
    value: 'Ethereum',
    label: 'Ethereum Mainnet',
    icon: (
      <span
        className={`${iconClass} from-slate-900 via-slate-700 to-slate-500 `}
      >
        ETH
      </span>
    ),
  },
  {
    value: 'Polygon',
    label: 'Polygon PoS',
    icon: (
      <span
        className={`${iconClass} from-fuchsia-500 via-purple-500 to-indigo-50`}
      >
        POLY
      </span>
    ),
  },
  {
    value: 'Base',
    label: 'Base',
    icon: (
      <span className={`${iconClass} from-blue-600 via-sky-500 to-cyan-400 `}>
        BASE
      </span>
    ),
  },
];

function TransferPanel({ className, onClose }: TransferPanelProps) {
  const [asset, setAsset] = useState(assetOptions[0].value);
  const [chain, setChain] = useState(chainOptions[0].value);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountValue = useMemo(() => Number(amount), [amount]);
  const isAmountValid = Number.isFinite(amountValue) && amountValue > 0;
  const isAddressValid = address.trim().length > 0;
  const isFormValid = isAmountValid && isAddressValid;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError('Enter a valid amount and receiver address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        asset,
        amount: amountValue,
        chain,
        address: address.trim(),
      };

      // Replace with actual transfer action when backend or wallet wiring is ready.
      console.log('Submitting transfer:', payload);

      onClose?.();
    } catch (err) {
      setError('Something went wrong while submitting the transfer.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(['overflow-hidden h-full max-h-screen p-6', , className])}
    >
      <div className="flex flex-col gap-10 h-full">
        <div className="pt-5 space-y-10">
          {/* 1. origin, asset, amount */}
          <div className="space-y-2">
            {/* header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  1. Where you are and what you want
                </p>
                <p className="text-xs text-slate-500">
                  Select origin chain & asset to send
                </p>
              </div>
              <span className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-inner shadow-white/50">
                Live balance: --
              </span>
            </div>

            {/* origin chain dropdown */}
            <div className="">
              <label className="text-xs tracking-widest font-medium text-slate-500">
                origin chain
              </label>
              <Dropdown
                options={chainOptions}
                value={chain}
                onChange={(option) => setChain(option.value)}
                buttonClassName="bg-white/80"
              />
            </div>

            {/* amount and asset dropdonw */}
            <div className="flex items-center gap-2">
              {/* amount input */}
              <div className="w-[45%]">
                <label
                  htmlFor="transfer-amount"
                  className="text-xs tracking-widest font-medium text-slate-500"
                >
                  amount
                </label>
                <div className="rounded-2xl border border-white/60 bg-white/75 px-3 py-1 items-center flex h-[46px] shadow-md">
                  <input
                    id="transfer-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* asset dropdown */}
              <div className="w-[55%]">
                <label className="text-xs tracking-widest font-medium text-slate-500">
                  asset
                </label>
                <Dropdown
                  options={assetOptions}
                  value={asset}
                  onChange={(option) => setAsset(option.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. destination and address */}
          <div className="space-y-2">
            {/* header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  2. Where you want to go
                </p>
                <p className="text-xs text-slate-500">
                  Select destination chain & receiver address
                </p>
              </div>
            </div>

            {/* destionation chain dropdown */}
            <div>
              <label className="text-xs tracking-widest font-medium text-slate-500">
                destination chain
              </label>
              <Dropdown
                options={chainOptions}
                value={chain}
                onChange={(option) => setChain(option.value)}
                buttonClassName="bg-white/80"
              />
            </div>

            <div>
              <label
                htmlFor="transfer-address"
                className="text-xs tracking-widest font-medium text-slate-500"
              >
                receiver address
              </label>
              <div className="rounded-2xl border border-white/60 bg-white/75 px-3 py-1 items-center flex h-[46px] shadow-md">
                <input
                  id="transfer-address"
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="0x123... destination"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. submit button */}
        <div className="flex w-full gap-5">
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-600 shadow-[0_10px_25px_rgba(225,29,72,0.12)]"
            >
              {error}
            </p>
          ) : null}

          <div className="flex w-full px-10 items-center justify-center mt-15">
            <LiquidGlassButton
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 justify-center text-center"
            >
              {isSubmitting ? 'Submitting...' : 'Submit transfer'}
            </LiquidGlassButton>
          </div>
        </div>
      </div>
    </form>
  );
}

export default TransferPanel;
