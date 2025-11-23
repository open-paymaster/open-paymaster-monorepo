'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type LiquidGlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function LiquidGlassButton({
  children,
  className,
  ...props
}: LiquidGlassButtonProps) {
  return (
    <button
      {...props}
      className={clsx([
        'rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-md backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lg',
        className,
      ])}
    >
      {children}
    </button>
  );
}
