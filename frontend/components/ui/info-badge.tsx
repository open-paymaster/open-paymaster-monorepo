'use client';

import type { ReactNode } from 'react';
import { Tooltip } from '@/components/ui/tooltip';

type InfoBadgeProps = {
  content: ReactNode;
  className?: string;
};

export function InfoBadge({ content, className }: InfoBadgeProps) {
  return (
    <Tooltip content={content} className={className}>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] border border-slate-200 bg-white/80 text-slate-500 shadow-sm">
        <p className="ml-0.5">i</p>
      </span>
    </Tooltip>
  );
}
