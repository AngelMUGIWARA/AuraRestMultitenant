import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type { RestaurantTable, TableStatus } from '@maison/types';

// ── Design tokens (Maison palette → Konva hex) ───────────────────────────────

const STATUS: Record<
  TableStatus,
  { fill: string; stroke: string; text: string; dot: string; label: string }
> = {
  AVAILABLE: {
    fill: 'rgba(78, 125, 94, 0.09)',
    stroke: 'rgba(78, 125, 94, 0.55)',
    text: '#3d6b4e',
    dot: '#4E7D5E',
    label: 'Libre',
  },
  OCCUPIED: {
    fill: 'rgba(176, 86, 74, 0.09)',
    stroke: 'rgba(176, 86, 74, 0.55)',
    text: '#943c32',
    dot: '#B0564A',
    label: 'Ocupada',
  },
  RESERVED: {
    fill: 'rgba(172, 126, 64, 0.09)',
    stroke: 'rgba(172, 126, 64, 0.55)',
    text: '#8a6020',
    dot: '#AC7E40',
    label: 'Reservada',
  },
  MAINTENANCE: {
    fill: 'rgba(122, 118, 109, 0.07)',
    stroke: 'rgba(122, 118, 109, 0.28)',
    text: '#7A766D',
    dot: '#9e9a92',
    label: 'Mantenim.',
  },
};

const CARD_W = 152;
const CARD_H = 88;
const COLS = 4;
const GAP_X = 190;
const GAP_Y = 126;
const ORIGIN_X = 48;
const ORIGIN_Y = 48;

function defaultPos(idx: number) {
  return {
    x: ORIGIN_X + (idx % COLS) * GAP_X,
    y: ORIGIN_Y + Math.floor(idx / COLS) * GAP_Y,
  };
}

// ── Single table card ─────────────────────────────────────────────────────────

interface CardProps {
  table: RestaurantTable;
  x: number;
  y: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

function TableCard({ table, x, y, selected, onSelect, onDragEnd }: CardProps) {
  const cfg = STATUS[table.status as TableStatus] ?? STATUS.MAINTENANCE;
  const label = table.name ?? `Mesa ${table.number}`;

  return (
    <Group
      x={x}
      y={y}
      draggable
      onClick={() => onSelect(table.id)}
      onTap={() => onSelect(table.id)}
      onDragEnd={(e) => onDragEnd(table.id, Math.round(e.target.x()), Math.round(e.target.y()))}
    >
      {/* drop shadow */}
      <Rect
        x={2} y={3}
        width={CARD_W} height={CARD_H}
        cornerRadius={12}
        fill="rgba(0,0,0,0.06)"
        listening={false}
      />

      {/* selection ring */}
      {selected && (
        <Rect
          x={-3} y={-3}
          width={CARD_W + 6} height={CARD_H + 6}
          cornerRadius={15}
          fill="transparent"
          stroke="rgba(172, 126, 64, 0.5)"
          strokeWidth={2.5}
          listening={false}
        />
      )}

      {/*
        BUG FIX: Este Rect es el hit target del Group.
        Sin un hijo con listening=true, el Group no recibe ningún
        evento (click, drag). NO agregar listening={false} aquí.
      */}
      <Rect
        width={CARD_W} height={CARD_H}
        cornerRadius={12}
        fill={cfg.fill}
        stroke={selected ? '#AC7E40' : cfg.stroke}
        strokeWidth={selected ? 2 : 1.5}
      />

      {/* ── table icon (top-view) ── */}
      {/* tabletop */}
      <Rect x={16} y={20} width={30} height={7} cornerRadius={2} fill={cfg.text} opacity={0.45} listening={false} />
      {/* left leg */}
      <Rect x={19} y={27} width={4} height={11} cornerRadius={1} fill={cfg.text} opacity={0.3} listening={false} />
      {/* right leg */}
      <Rect x={39} y={27} width={4} height={11} cornerRadius={1} fill={cfg.text} opacity={0.3} listening={false} />
      {/* bottom bar */}
      <Line
        points={[22, 38, 40, 38]}
        stroke={cfg.text} strokeWidth={2.5} opacity={0.25}
        lineCap="round"
        listening={false}
      />

      {/* ── text content ── */}
      {/* name — wrap="none" required for ellipsis to work in Konva */}
      <Text
        x={56} y={15}
        width={CARD_W - 64}
        text={label}
        fontSize={12.5}
        fontStyle="bold"
        fontFamily="Outfit, system-ui, sans-serif"
        fill={cfg.text}
        wrap="none"
        ellipsis
        listening={false}
      />

      {/* capacity */}
      <Text
        x={56} y={33}
        width={CARD_W - 64}
        text={`${table.capacity} pers.`}
        fontSize={10}
        fontFamily="Outfit, system-ui, sans-serif"
        fill="rgba(100, 97, 90, 0.85)"
        listening={false}
      />

      {/* divider */}
      <Line
        points={[14, 58, CARD_W - 14, 58]}
        stroke={cfg.stroke} strokeWidth={1} opacity={0.6}
        listening={false}
      />

      {/* status dot */}
      <Circle
        x={22} y={72}
        radius={3.5}
        fill={cfg.dot}
        listening={false}
      />

      {/* status label — fontStyle solo acepta "normal"|"bold"|"italic"|"italic bold" en Konva */}
      <Text
        x={30} y={65}
        text={cfg.label}
        fontSize={10}
        fontStyle="bold"
        fontFamily="Outfit, system-ui, sans-serif"
        fill={cfg.text}
        listening={false}
      />

      {/* zone tag if present */}
      {table.locationZone && (
        <Text
          x={CARD_W - 74}
          y={65}
          text={table.locationZone}
          fontSize={9}
          fontFamily="Outfit, system-ui, sans-serif"
          fill="rgba(100, 97, 90, 0.6)"
          align="right"
          width={60}
          listening={false}
        />
      )}
    </Group>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'maison:table-positions:';

interface TablesMapProps {
  tables: RestaurantTable[];
  branchId: string;
  /** Controlled: which table is highlighted (null = none) */
  selectedId?: string | null;
  onSelect?: (table: RestaurantTable) => void;
}

export function TablesMap({ tables, branchId, selectedId = null, onSelect }: TablesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Start at 0 so we don't render the Stage until we know the real size
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const key = `${STORAGE_KEY}${branchId}`;

  // Restore saved positions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setPositions(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [key]);

  // Responsive Stage — use ResizeObserver to track container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0) {
        setSize({ w: Math.floor(width), h: Math.max(Math.floor(height), 480) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Selection is fully controlled by parent — just fire the callback
  const handleSelect = useCallback(
    (id: string) => {
      const table = tables.find((t) => t.id === id);
      if (table) onSelect?.(table);
    },
    [tables, onSelect],
  );

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setPositions((prev) => {
        const next = { ...prev, [id]: { x, y } };
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    [key],
  );

  return (
    /*
      BUG FIX: GridDots generaba 600-1600 nodos Konva/React para el fondo,
      causando lag severo. Reemplazado por CSS background-image que logra
      el mismo efecto visual sin costo de renderizado.
    */
    <div
      ref={containerRef}
      className="w-full flex-1 min-h-[480px] rounded-xl overflow-hidden border border-maison-border"
      style={{
        background: 'rgb(250, 249, 246)',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.09) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {size.w > 0 && (
        <Stage width={size.w} height={size.h}>
          <Layer>
            {tables.map((t, i) => {
              const pos = positions[t.id] ?? defaultPos(i);
              return (
                <TableCard
                  key={t.id}
                  table={t}
                  x={pos.x}
                  y={pos.y}
                  selected={selectedId === t.id}
                  onSelect={handleSelect}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

