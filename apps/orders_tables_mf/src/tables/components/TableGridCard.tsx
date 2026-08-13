import type { RestaurantTable, TableStatus } from '@maison/types';

// ── Status palette ────────────────────────────────────────────────────────────

const S = {
  AVAILABLE: {
    dot: '#4E7D5E', text: '#3d6b4e', label: 'Libre',
    fill: 'rgba(78,125,94,0.08)', chair: 'rgba(78,125,94,0.55)',
    strip: '#4E7D5E',
  },
  OCCUPIED: {
    dot: '#B0564A', text: '#943c32', label: 'Ocupada',
    fill: 'rgba(176,86,74,0.08)', chair: 'rgba(176,86,74,0.55)',
    strip: '#B0564A',
  },
  RESERVED: {
    dot: '#AC7E40', text: '#8a6020', label: 'Reservada',
    fill: 'rgba(172,126,64,0.08)', chair: 'rgba(172,126,64,0.55)',
    strip: '#AC7E40',
  },
  MAINTENANCE: {
    dot: '#9e9a92', text: '#7A766D', label: 'Mantenim.',
    fill: 'rgba(122,118,109,0.06)', chair: 'rgba(122,118,109,0.38)',
    strip: '#9e9a92',
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

// ── Mini top-view diagram (SVG) ───────────────────────────────────────────────

interface DiagramProps { capacity: number; status: string }

function MiniDiagram({ capacity, status }: DiagramProps) {
  const c = cfg(status);
  const lay = layout(capacity);

  // SVG canvas 84×54, table centred
  const TX = 16, TY = 13, TW = 52, TH = 28;
  const R = 3.2;    // chair radius (circles)
  const G = 5.5;    // gap chair-to-table

  type Pt = { cx: number; cy: number };
  const chairs: Pt[] = [];

  for (let i = 0; i < lay.t; i++)
    chairs.push({ cx: TX + (i + 1) * TW / (lay.t + 1), cy: TY - G });
  for (let i = 0; i < lay.b; i++)
    chairs.push({ cx: TX + (i + 1) * TW / (lay.b + 1), cy: TY + TH + G });
  for (let i = 0; i < lay.l; i++)
    chairs.push({ cx: TX - G, cy: TY + (i + 1) * TH / (lay.l + 1) });
  for (let i = 0; i < lay.r; i++)
    chairs.push({ cx: TX + TW + G, cy: TY + (i + 1) * TH / (lay.r + 1) });

  return (
    <svg viewBox="0 0 84 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {chairs.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={R} fill={c.chair} />
      ))}
      <rect
        x={TX} y={TY} width={TW} height={TH} rx={5}
        fill={c.fill} stroke={c.chair} strokeWidth={1.5}
      />
    </svg>
  );
}

// ── Card component ────────────────────────────────────────────────────────────

interface TableGridCardProps {
  table: RestaurantTable;
  selected: boolean;
  onSelect: (table: RestaurantTable) => void;
}

export function TableGridCard({ table, selected, onSelect }: TableGridCardProps) {
  const c = cfg(table.status);
  const name = table.name ?? `Mesa ${table.number}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      className={[
        'group relative flex flex-col text-left rounded-xl overflow-hidden',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maison-accent',
        selected
          ? 'shadow-[0_0_0_2.5px_rgba(172,126,64,0.7),0_4px_16px_rgba(0,0,0,0.10)]'
          : 'border border-maison-border shadow-sm hover:shadow-md hover:-translate-y-[1px]',
      ].join(' ')}
      style={{
        background: selected ? 'rgba(172,126,64,0.03)' : 'rgb(var(--color-surface, 255 255 255))',
      }}
    >
      {/* Status strip */}
      <div
        className="h-[3px] w-full flex-shrink-0 transition-all duration-150"
        style={{ background: c.strip, opacity: selected ? 1 : 0.75 }}
      />

      {/* Mini diagram area */}
      <div
        className="px-3 pt-2.5 pb-1"
        style={{ background: c.fill }}
      >
        <MiniDiagram capacity={table.capacity} status={table.status} />
      </div>

      {/* Text content */}
      <div className="px-3 pt-2 pb-3 flex flex-col gap-0.5 flex-1">
        <p
          className="font-bold text-[13px] leading-tight truncate text-maison-cream"
          title={name}
        >
          {name}
        </p>
        <p className="text-[11px] text-maison-cream-muted leading-tight">
          {table.capacity} pers.{table.locationZone ? ` · ${table.locationZone}` : ''}
        </p>

        {/* Status pill */}
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: c.dot }}
          />
          <span
            className="text-[10px] font-semibold tracking-wide uppercase"
            style={{ color: c.text }}
          >
            {c.label}
          </span>
        </div>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <span
          className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: '#AC7E40' }}
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        </span>
      )}
    </button>
  );
}
