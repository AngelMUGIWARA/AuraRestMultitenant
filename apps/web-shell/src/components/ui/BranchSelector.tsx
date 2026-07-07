'use client';

import { useRef, useState, useEffect } from 'react';
import { useBranch, GLOBAL_BRANCH } from '@/context/BranchContext';
import { cn } from '@/lib/utils';
import type { Branch } from '@maison/types';

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function BranchSelector() {
  const { selectedBranch, branches, setBranch } = useBranch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allOptions: Branch[] = [GLOBAL_BRANCH, ...branches];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 items-center gap-2 rounded border border-maison-border bg-surface-1 px-2.5 text-sm transition-colors',
          'hover:border-maison-border-subtle hover:bg-surface-2',
          open && 'border-maison-border-subtle bg-surface-2',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Seleccionar sucursal"
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full flex-shrink-0',
            selectedBranch.isGlobal ? 'bg-maison-amber' : 'bg-maison-sage',
          )}
          aria-hidden="true"
        />
        <span className="max-w-[120px] truncate font-medium text-maison-cream">
          {selectedBranch.name}
        </span>
        <IconChevronDown
          className={cn(
            'h-3 w-3 text-maison-cream-dim transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-[calc(100%+6px)] z-50 min-w-[220px] rounded-lg border border-maison-border',
            'bg-surface-1 shadow-card-hover py-1.5 animate-slide-in-up',
          )}
          role="listbox"
          aria-label="Sucursales disponibles"
        >
          <p className="px-3 pb-1 pt-0.5 text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">
            Sucursal
          </p>

          {allOptions.map((branch) => {
            const isSelected = branch.id === selectedBranch.id;
            return (
              <button
                key={branch.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { setBranch(branch); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-surface-2',
                  isSelected && 'text-maison-amber',
                  !isSelected && 'text-maison-cream-muted',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                    branch.isGlobal ? 'bg-maison-amber' : 'bg-maison-sage',
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">
                  <span className="font-medium text-maison-cream">{branch.name}</span>
                  {branch.city && !branch.isGlobal && (
                    <span className="ml-1.5 text-maison-cream-dim text-2xs">{branch.city}</span>
                  )}
                  {branch.isGlobal && (
                    <span className="ml-1.5 text-2xs text-maison-cream-dim">Todas</span>
                  )}
                </span>
                {isSelected && <IconCheck className="h-3.5 w-3.5 text-maison-amber flex-shrink-0" />}
              </button>
            );
          })}

          {branches.length === 0 && (
            <p className="px-3 py-3 text-center text-xs text-maison-cream-dim">
              Sin sucursales registradas
            </p>
          )}
        </div>
      )}
    </div>
  );
}
