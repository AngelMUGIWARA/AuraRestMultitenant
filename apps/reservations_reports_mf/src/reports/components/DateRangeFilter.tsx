import { useState } from 'react';

interface DateRangeFilterProps{ 
    onFilter: (startDate: string, endDate: string) => void;
    isLoading?: boolean;
}

export function DateRangeFilter({ onFilter, isLoading }: DateRangeFilterProps) {
    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [rangeError, setRangeError] = useState<string | null>(null);

    function handleApply() {
        if (!startDate || !endDate) return;
        if (endDate < startDate) {
            setRangeError("La fecha 'Desde' no puede ser posterior a 'Hasta'");
            return;
        }
        setRangeError(null);
        onFilter(startDate, endDate);
    }

    function handleReset() {
        const start = `${currentYear}-01-01`;
        const end = new Date().toISOString().slice(0, 10);
        setStartDate(start);
        setEndDate(end);
        setRangeError(null);
        onFilter(start, end);
    }

    function handleStartChange(value: string) {
        setStartDate(value);
        if (rangeError) setRangeError(null);
    }

    function handleEndChange(value: string) {
        setEndDate(value);
        if (rangeError) setRangeError(null);
    }

    return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-maison-cream-muted uppercase tracking-wider">
          Desde
        </label>
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => handleStartChange(e.target.value)}
          className="h-8 rounded px-2 text-sm bg-surface-2 border border-surface-3 text-maison-cream focus:outline-none focus:border-maison-gold"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-maison-cream-muted uppercase tracking-wider">
          Hasta
        </label>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => handleEndChange(e.target.value)}
          className="h-8 rounded px-2 text-sm bg-surface-2 border border-surface-3 text-maison-cream focus:outline-none focus:border-maison-gold"
        />
      </div>

      {rangeError && (
        <div className="w-full">
          <p role="alert" className="text-xs text-maison-ruby">{rangeError}</p>
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={isLoading}
        className="h-8 px-4 rounded text-sm font-medium bg-maison-gold text-maison-dark hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isLoading ? 'Cargando...' : 'Aplicar'}
      </button>

      <button
        onClick={handleReset}
        disabled={isLoading}
        className="h-8 px-4 rounded text-sm font-medium border border-surface-3 text-maison-cream-muted hover:text-maison-cream hover:border-maison-cream-muted disabled:opacity-50 transition-colors"
      >
        Restablecer
      </button>
    </div>
  );
}