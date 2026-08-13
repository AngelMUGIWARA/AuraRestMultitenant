import { navigateTo } from '@maison/event-bus';
import type { RestaurantTable, TableStatus } from '@maison/types';

// ── Status config ─────────────────────────────────────────────────────────────

const S = {
  AVAILABLE: {
    fill: 'rgba(78,125,94,0.10)',    stroke: 'rgba(78,125,94,0.45)',
    text: '#3d6b4e',                  dot: '#4E7D5E',
    label: 'Libre',                   chairFill: 'rgba(78,125,94,0.60)',
    badgeBg: 'rgba(78,125,94,0.10)', badgeText: '#3d6b4e', badgeBorder: 'rgba(78,125,94,0.22)',
    actionLabel: 'Nueva Orden',       actionBg: '#4E7D5E',
    headerBg: 'rgba(78,125,94,0.07)',
  },
  OCCUPIED: {
    fill: 'rgba(176,86,74,0.10)',     stroke: 'rgba(176,86,74,0.45)',
    text: '#943c32',                  dot: '#B0564A',
    label: 'Ocupada',                 chairFill: 'rgba(176,86,74,0.60)',
    badgeBg: 'rgba(176,86,74,0.10)', badgeText: '#943c32', badgeBorder: 'rgba(176,86,74,0.22)',
    actionLabel: 'Ver Orden',         actionBg: '#B0564A',
    headerBg: 'rgba(176,86,74,0.07)',
  },
  RESERVED: {
    fill: 'rgba(172,126,64,0.10)',    stroke: 'rgba(172,126,64,0.45)',
    text: '#8a6020',                  dot: '#AC7E40',
    label: 'Reservada',               chairFill: 'rgba(172,126,64,0.60)',
    badgeBg: 'rgba(172,126,64,0.10)',badgeText: '#8a6020', badgeBorder: 'rgba(172,126,64,0.22)',
    actionLabel: 'Ver Reserva',       actionBg: '#AC7E40',
    headerBg: 'rgba(172,126,64,0.07)',
  },
  MAINTENANCE: {
    fill: 'rgba(122,118,109,0.07)',   stroke: 'rgba(122,118,109,0.28)',
    text: '#7A766D',                  dot: '#9e9a92',
    label: 'Mantenimiento',           chairFill: 'rgba(122,118,109,0.38)',
    badgeBg: 'rgba(122,118,109,0.07)',badgeText: '#7A766D', badgeBorder: 'rgba(122,118,109,0.18)',
    actionLabel: '',                  actionBg: '',
    headerBg: 'rgba(122,118,109,0.05)',
  },
} satisfies Record<TableStatus, unknown>;

function cfg(status: string) {
  return S[status as TableStatus] ?? S.MAINTENANCE;
}

// ── Chair layout ──────────────────────────────────────────────────────────────

function layout(n: number) {
  if (n <= 2)  return { t: 1, b: 1, l: 0, r: 0 };
  if (n <= 4)  return { t: 2, b: 2, l: 0, r: 0 };
  if (n <= 6)  return { t: 2, b: 2, l: 1, r: 1 };
  if (n <= 8)  return { t: 3, b: 3, l: 1, r: 1 };
  if (n <= 10) return { t: 3, b: 3, l: 2, r: 2 };
  return { t: 4, b: 4, l: Math.floor((n - 8) / 2), r: Math.ceil((n - 8) / 2) };
}

// ── SVG chair diagram ─────────────────────────────────────────────────────────

// Table SVG coords
const TX = 44, TY = 48, TW = 112, TH = 68;
const CW = 22, CH = 12; // horizontal chair
const VW = 12, VH = 22; // vertical chair
const G = 8;             // gap

interface DiagramProps { capacity: number; status: string }

function ChairDiagram({ capacity, status }: DiagramProps) {
  const c = cfg(status);
  const lay = layout(capacity);

  type R = { x: number; y: number; w: number; h: number };
  const chairs: R[] = [];

  for (let i = 0; i < lay.t; i++)
    chairs.push({ x: TX + (i + 1) * TW / (lay.t + 1) - CW / 2, y: TY - G - CH, w: CW, h: CH });
  for (let i = 0; i < lay.b; i++)
    chairs.push({ x: TX + (i + 1) * TW / (lay.b + 1) - CW / 2, y: TY + TH + G,  w: CW, h: CH });
  for (let i = 0; i < lay.l; i++)
    chairs.push({ x: TX - G - VW, y: TY + (i + 1) * TH / (lay.l + 1) - VH / 2,  w: VW, h: VH });
  for (let i = 0; i < lay.r; i++)
    chairs.push({ x: TX + TW + G, y: TY + (i + 1) * TH / (lay.r + 1) - VH / 2,  w: VW, h: VH });

  return (
    <svg viewBox="0 0 200 166" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden="true">
      {/* Chairs */}
      {chairs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={4} fill={c.chairFill} />
      ))}

      {/* Table surface */}
      <rect
        x={TX} y={TY} width={TW} height={TH} rx={10}
        fill={c.fill} stroke={c.stroke} strokeWidth={2}
      />

      {/* Capacity number */}
      <text
        x={TX + TW / 2} y={TY + TH / 2 + 6}
        textAnchor="middle" fontSize="20" fontWeight="700"
        fontFamily="Outfit, system-ui, sans-serif"
        fill={c.text} opacity={0.8}
      >
        {capacity}
      </text>
      <text
        x={TX + TW / 2} y={TY + TH / 2 + 20}
        textAnchor="middle" fontSize="9" letterSpacing="0.06em"
        fontFamily="Outfit, system-ui, sans-serif"
        fill={c.text} opacity={0.45}
      >
        SILLAS
      </text>
    </svg>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface TableDetailPanelProps {
  table: RestaurantTable;
  onClose: () => void;
}

export function TableDetailPanel({ table, onClose }: TableDetailPanelProps) {
  const status = table.status as TableStatus;
  const c = cfg(status);
  const name = table.name ?? `Mesa ${table.number}`;

  function handleAction() {
    if (status === 'AVAILABLE') navigateTo(`/waiter/orders/new?tableId=${table.id}`);
    else if (status === 'OCCUPIED') navigateTo(`/waiter/orders?tableId=${table.id}`);
    else if (status === 'RESERVED') navigateTo(`/waiter/reservations?tableId=${table.id}`);
  }

  return (
    <aside
      className="w-[268px] flex-shrink-0 flex flex-col rounded-xl overflow-hidden border border-maison-border"
      style={{ background: 'rgb(var(--color-surface, 255 255 255))' }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-4 pb-3 border-b border-maison-border"
        style={{ background: c.headerBg }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Status badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase mb-2"
              style={{ background: c.badgeBg, color: c.badgeText, border: `1px solid ${c.badgeBorder}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
              {c.label}
            </span>

            <h2 className="font-bold text-maison-cream text-base leading-tight truncate">
              {name}
            </h2>
            {table.locationZone && (
              <p className="text-[11px] text-maison-cream-muted mt-0.5">{table.locationZone}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md text-maison-cream-muted hover:text-maison-cream hover:bg-black/5 transition"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5">
              <path d="M11 3L3 11M3 3l8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Chair diagram ─────────────────────────────────────────────────── */}
      <div
        className="px-6 py-5"
        style={{
          background: 'rgb(var(--color-surface-2, 250 249 246))',
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <ChairDiagram capacity={table.capacity} status={status} />
      </div>

      {/* ── Info list ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex flex-col divide-y divide-maison-border">
        <InfoRow label="Número" value={`#${table.number}`} />
        <InfoRow label="Capacidad" value={`${table.capacity} personas`} />
        {table.locationZone && <InfoRow label="Zona" value={table.locationZone} />}
        <InfoRow
          label="Estado"
          value={
            <span className="text-[11px] font-semibold" style={{ color: c.text }}>
              {c.label}
            </span>
          }
        />
      </div>

      {/* ── Action ────────────────────────────────────────────────────────── */}
      <div className="mt-auto px-4 pb-4 pt-2">
        {c.actionLabel ? (
          <button
            onClick={handleAction}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: c.actionBg }}
          >
            {c.actionLabel}
          </button>
        ) : (
          <p className="text-center text-[11px] text-maison-cream-dim py-2 italic">
            Mesa fuera de servicio
          </p>
        )}
      </div>
    </aside>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-[11px]">
      <span className="text-maison-cream-muted">{label}</span>
      <span className="font-medium text-maison-cream">{value}</span>
    </div>
  );
}
