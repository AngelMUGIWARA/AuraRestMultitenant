import { TABLE_STATUS_CONFIG } from './table-status';

interface TableCardProps {
  name: string;
  capacity: number;
  status: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function TableCard({ name, capacity, status, isSelected, onSelect }: TableCardProps) {
  const cfg = TABLE_STATUS_CONFIG[status] ?? TABLE_STATUS_CONFIG.maintenance;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-xl border-2 p-4 text-center transition-all hover:scale-[1.03] active:scale-[0.97] ${cfg.bg} ${cfg.border} ${isSelected ? 'ring-2 ring-maison-amber ring-offset-2 ring-offset-surface-0 shadow-lg shadow-maison-amber/20' : 'hover:shadow-md'}`}
    >
      {isSelected && (
        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-maison-amber flex items-center justify-center shadow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-surface-0">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </span>
      )}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6 mx-auto mb-1.5 text-maison-cream-dim">
        <rect x="3" y="7" width="18" height="3" rx="1" />
        <path d="M6 10v7M18 10v7M9 17h6" />
      </svg>
      <p className="text-sm font-bold text-maison-cream">{name}</p>
      <p className="text-[10px] text-maison-cream-muted">{capacity} pers.</p>
      <div className="flex items-center justify-center gap-1 mt-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        <span className={`text-[10px] font-semibold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
    </button>
  );
}
