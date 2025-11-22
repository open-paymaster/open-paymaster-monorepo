'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type DropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type DropdownProps = {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
  onChange?: (option: DropdownOption) => void;
};

export function Dropdown({
  options,
  value,
  defaultValue,
  placeholder,
  className,
  buttonClassName,
  listClassName,
  onChange,
}: DropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | undefined>(
    () => value ?? defaultValue ?? (placeholder ? undefined : options[0]?.value)
  );

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const selected = useMemo(() => {
    const match = options.find((option) => option.value === currentValue);
    if (match) return match;
    if (!isControlled && placeholder === undefined) {
      return options[0];
    }
    return undefined;
  }, [currentValue, isControlled, options, placeholder]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = selected?.label ?? placeholder ?? 'Select an option';

  function handleSelect(option: DropdownOption) {
    if (value === undefined) {
      setInternalValue(option.value);
    }
    onChange?.(option);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={clsx(['relative inline-block w-full', className])}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx([
          'relative w-full overflow-hidden shadow-md rounded-2xl border border-white/70 bg-white/70 px-2 py-1 text-left transition',
          'cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200/70',
          open ? 'ring-2 ring-sky-200/70' : '',
          buttonClassName,
        ])}
      >
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-white/80 via-white/40 to-white/10 opacity-90" />
        <span className="pointer-events-none absolute -left-10 top-0 h-full w-24 bg-white/50 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {selected?.icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-slate-700 shadow-inner shadow-white/40">
                {selected.icon}
              </span>
            ) : null}
            <span
              className={clsx([
                'truncate text-sm font-semibold',
                selected ? 'text-slate-700' : 'text-slate-400',
              ])}
            >
              {displayLabel}
            </span>
          </div>
          <span
            className={clsx([
              'flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-slate-600 backdrop-blur-lg transition-transform',
              open ? 'rotate-180' : '',
            ])}
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="none"
              className="h-3.5 w-3.5 stroke-current"
            >
              <path
                d="m5 8 5 5 5-5"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>

      {open ? (
        <div
          role="listbox"
          className={clsx([
            'absolute left-0 right-0 z-50 mt-2 space-y-1.5 rounded-2xl border border-white/80 bg-gray-300/50 p-2 shadow-[0_25px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl',
            'before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:content-[""]',
            listClassName,
          ])}
        >
          {options.length === 0 ? (
            <div className="flex w-full items-center justify-center rounded-xl bg-white/70 px-3 py-3 text-sm text-slate-400 shadow-inner">
              No options
            </div>
          ) : null}
          {options.map((option) => {
            const isSelected = option.value === selected?.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={clsx([
                  'group relative flex w-full items-center gap-3 rounded-xl border border-white/40 px-2 py-1 transition',
                  'bg-white/70 hover:-translate-y-px hover:border-white/60 hover:bg-white/90',
                  isSelected
                    ? 'border-sky-200/70 bg-white/90 shadow-[0_12px_30px_rgba(56,189,248,0.18)]'
                    : '',
                ])}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-slate-700 shadow-inner shadow-white/40">
                  {option.icon ?? (
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col text-left leading-tight">
                  <span className=" truncate text-sm font-semibold text-slate-700">
                    {option.label}
                  </span>
                </span>
                <span
                  className={clsx([
                    'ml-auto flex h-6 w-6 items-center justify-center rounded-full border border-white/60 bg-white/60 text-sky-500 transition',
                    isSelected
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-60',
                  ])}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-3 w-3 stroke-current"
                  >
                    <path
                      d="m5.5 10.5 2.5 2.5 6-6"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export type { DropdownOption, DropdownProps };
