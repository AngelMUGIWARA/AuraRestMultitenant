import { useCallback, useMemo, useState } from 'react';
import type { RestaurantTable } from '@maison/types';
import { TableGridCard } from '../components/TableGridCard';
import { TableDetailPanel } from '../components/TableDetailPanel';
import { useTables } from '../hooks/useTables';

export function TablesPage() {
  const { tables, isLoading, error, refresh, branch } = useTables();
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const rows = useMemo(() => tables?.data ?? [], [tables]);

  // Quick stats derived from table list
  const stats = useMemo(() => ({
    available:   rows.filter((t) => t.status === 'AVAILABLE').length,
    occupied:    rows.filter((t) => t.status === 'OCCUPIED').length,
    reserved:    rows.filter((t) => t.status === 'RESERVED').length,
    maintenance: rows.filter((t) => t.status === 'MAINTENANCE').length,
  }), [rows]);

  const handleSelect = useCallback((table: RestaurantTable) => {
    setSelectedTable((prev) => (prev?.id === table.id ? null : table));
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-maison-accent" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(176,86,74,0.12)' }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="#B0564A" strokeWidth="1.5" className="h-5 w-5">
            <circle cx="10" cy="10" r="8" />
            <path d="M10 6v4M10 14h.01" />
          </svg>
        </div>
        <p className="text-sm font-medium text-maison-cream">Error al cargar las mesas</p>
        <p className="text-xs text-maison-cream-muted">{error.message}</p>
        <button
          onClick={refresh}
          className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold border border-maison-border text-maison-cream hover:bg-surface-2 transition"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.25" className="h-12 w-12 text-maison-cream-dim opacity-30">
          <rect x="4" y="12" width="32" height="6" rx="2" />
          <path d="M10 18v10M30 18v10M15 28h10" />
        </svg>
        <p className="text-sm text-maison-cream-muted">Sin mesas configuradas</p>
        <p className="text-xs text-maison-cream-dim">Agrega mesas desde el panel de administración</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-maison-border">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold text-maison-cream tracking-tight">Mesas</h1>
            <p className="text-sm text-maison-cream-muted mt-0.5">{branch.name}</p>
          </div>

          <button
            onClick={refresh}
            title="Actualizar"
            className="p-2 rounded-lg border border-maison-border text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M1.5 8a6.5 6.5 0 1 0 1.1-3.6" />
              <polyline points="1.5,3 1.5,8 6.5,8" />
            </svg>
          </button>
        </div>

        {/* Quick stats bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip
            count={stats.available}
            label="Libres"
            color="#4E7D5E"
            bg="rgba(78,125,94,0.09)"
            border="rgba(78,125,94,0.22)"
          />
          <StatChip
            count={stats.occupied}
            label="Ocupadas"
            color="#B0564A"
            bg="rgba(176,86,74,0.09)"
            border="rgba(176,86,74,0.22)"
          />
          {stats.reserved > 0 && (
            <StatChip
              count={stats.reserved}
              label="Reservadas"
              color="#AC7E40"
              bg="rgba(172,126,64,0.09)"
              border="rgba(172,126,64,0.22)"
            />
          )}
          {stats.maintenance > 0 && (
            <StatChip
              count={stats.maintenance}
              label="Mantenim."
              color="#9e9a92"
              bg="rgba(122,118,109,0.07)"
              border="rgba(122,118,109,0.18)"
            />
          )}
          <span className="text-[11px] text-maison-cream-dim ml-auto">
            {rows.length} total
          </span>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
          >
            {rows.map((t) => (
              <TableGridCard
                key={t.id}
                table={t}
                selected={selectedTable?.id === t.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedTable && (
          <div className="flex-shrink-0 border-l border-maison-border overflow-y-auto">
            <TableDetailPanel
              table={selectedTable}
              onClose={() => setSelectedTable(null)}
            />
          </div>
        )}

      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function StatChip({
  count, label, color, bg, border,
}: {
  count: number; label: string; color: string; bg: string; border: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      {count} {label}
    </span>
  );
}
