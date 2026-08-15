import { useEffect, useState } from 'react';
import { reservationsService } from '../services/reservations.service';
import type { Reservation } from '@maison/types';

interface ReservationCalendarProps {
  branchId?: string;
}

interface DayReservations {
  date: string;
  count: number;
  reservations: Reservation[];
}

export function ReservationCalendar({ branchId }: ReservationCalendarProps) {
  const [days, setDays] = useState<Map<number, DayReservations>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth, branchId]);

  async function loadCalendarData() {
    try {
      setIsLoading(true);

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const dateFrom = firstDay.toISOString().slice(0, 10);
      const dateTo = lastDay.toISOString().slice(0, 10);

      const response = await reservationsService.getAll({
        dateFrom,
        dateTo,
        branchId,
        limit: 1000,
      });

      const reservations = (response && 'data' in response) ? (response as any).data : response;
      const data = Array.isArray(reservations) ? reservations : (reservations?.data || []);

      const dayMap = new Map<number, DayReservations>();

      data.forEach((r: Reservation) => {
        const reservDate = new Date(r.date ? `${r.date}T00:00:00` : r.createdAt);
        const day = reservDate.getDate();

        if (!dayMap.has(day)) {
          dayMap.set(day, {
            date: reservDate.toISOString().slice(0, 10),
            count: 0,
            reservations: [],
          });
        }

        const dayData = dayMap.get(day)!;
        dayData.count += 1;
        dayData.reservations.push(r);
      });

      setDays(dayMap);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      setDays(new Map());
    } finally {
      setIsLoading(false);
    }
  }

  const monthName = currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentMonth.getFullYear() &&
                         today.getMonth() === currentMonth.getMonth();
  const todayDate = isCurrentMonth ? today.getDate() : null;

  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  if (isLoading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-5 bg-surface-2 rounded w-1/3"></div>
          <div className="h-32 bg-surface-2 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-maison-cream capitalize">{monthName}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="px-2 py-1 rounded border border-maison-border text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition-colors text-sm"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 rounded border border-maison-border text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition-colors text-xs font-medium"
            aria-label="Hoy"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="px-2 py-1 rounded border border-maison-border text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition-colors text-sm"
            aria-label="Próximo mes"
          >
            →
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'rgb(var(--color-surface-2))', padding: '4px', borderRadius: '6px', marginBottom: '4px' }}>
        {weekDays.map((day) => (
          <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'rgb(var(--color-muted))', padding: '8px 4px', backgroundColor: 'rgb(var(--color-surface))', borderRadius: '4px' }}>
            {day}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'rgb(var(--color-surface-2))', padding: '4px', borderRadius: '6px' }}>
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} style={{ aspectRatio: '1', backgroundColor: 'rgb(var(--color-surface))' }} />
        ))}
        {dayNumbers.map((day) => {
          const dayData = days.get(day);
          const isToday = day === todayDate;
          const bgColor = isToday
            ? 'rgb(212, 151, 90, 0.2)'
            : dayData && dayData.count > 0
              ? 'var(--color-warning-bg)'
              : 'rgb(var(--color-surface))';
          const textColor = isToday
            ? 'rgb(212, 151, 90)'
            : dayData && dayData.count > 0
              ? 'rgb(212, 151, 90)'
              : 'rgb(var(--color-muted))';
          const borderColor = isToday
            ? 'rgb(212, 151, 90)'
            : dayData && dayData.count > 0
              ? 'rgba(212, 151, 90, 0.3)'
              : 'transparent';

          return (
            <button
              key={day}
              type="button"
              onClick={() => {}}
              style={{
                aspectRatio: '1',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                cursor: dayData ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
              onMouseEnter={(e) => {
                if (dayData) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(212, 151, 90, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = bgColor;
              }}
              title={dayData ? `${dayData.count} reservación(es)` : undefined}
            >
              <span style={{ fontWeight: '600' }}>{day}</span>
              {dayData && dayData.count > 0 && (
                <span style={{ fontSize: '9px', lineHeight: '1', opacity: 0.75 }}>
                  {dayData.count === 1 ? '●' : '●●'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
