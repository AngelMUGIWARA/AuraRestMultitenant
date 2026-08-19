'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBranch } from '@maison/ui';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  href: string;
  category: 'route' | 'branch';
  icon?: string;
}

const ROUTES: SearchResult[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', category: 'route' },
  { id: 'reportes', label: 'Reportes', href: '/reportes', category: 'route' },
  { id: 'reservaciones', label: 'Reservaciones', href: '/reservaciones', category: 'route' },
  { id: 'inventario', label: 'Inventario', href: '/inventario', category: 'route' },
  { id: 'sucursales', label: 'Sucursales', href: '/sucursales', category: 'route' },
  { id: 'configuracion', label: 'Configuración', href: '/admin/settings', category: 'route' },
];

export function GlobalSearch() {
  const router = useRouter();
  const { branches } = useBranch();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Combine routes with branches
  const getResults = useCallback((): SearchResult[] => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();

    // Filter routes
    const routeResults = ROUTES.filter(
      (route) =>
        route.label.toLowerCase().includes(q) ||
        route.href.toLowerCase().includes(q)
    );

    // Filter branches
    const branchResults = branches
      .filter((branch) => branch.name.toLowerCase().includes(q))
      .map((branch) => ({
        id: `branch-${branch.id}`,
        label: branch.name,
        description: branch.city || undefined,
        href: `/sucursales`,
        category: 'branch' as const,
      }));

    return [...routeResults, ...branchResults];
  }, [query, branches]);

  const results = getResults();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      // Only handle these if search is open
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        navigateToResult(results[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const navigateToResult = (result: SearchResult) => {
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative mx-3 hidden max-w-xs flex-1 lg:flex">
        <label htmlFor="global-search" className="sr-only">
          Buscar
        </label>
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          id="global-search"
          type="text"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="h-8 w-full rounded border border-maison-border bg-surface-2 pl-8 pr-12 text-sm text-maison-cream placeholder:text-maison-cream-dim outline-none transition-colors focus:border-maison-amber"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-maison-border px-1 py-0.5 font-mono text-2xs text-maison-cream-dim">
          ⌘K
        </kbd>
      </div>

      {/* Results dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 max-h-96 overflow-y-auto rounded-lg border border-maison-border bg-surface-1 shadow-lg">
          {results.length > 0 ? (
            <ul role="listbox">
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => navigateToResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm transition-colors',
                      index === selectedIndex
                        ? 'bg-surface-2 text-maison-cream'
                        : 'text-maison-cream-muted hover:bg-surface-2 hover:text-maison-cream'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase text-maison-cream-dim">
                        {result.category === 'route' ? 'Ruta' : 'Sucursal'}
                      </span>
                      <span className="font-medium">{result.label}</span>
                      {result.description && (
                        <span className="text-xs text-maison-cream-dim">
                          ({result.description})
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-maison-cream-dim">
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
