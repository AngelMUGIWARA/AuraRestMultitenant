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

      // Obtener todos los días del mes
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const dateFrom = firstDay.toISOString().slice(0, 10);
      const dateTo = lastDay.toISOString().slice(0, 10);

      // Llamar API con filtros de fecha y sucursal
      const response = await reservationsService.getAll({
        dateFrom,
        dateTo,
        branchId,
        limit: 1000,
      });

      const reservations = (response && 'data' in response) ? (response as any).data : response;
      const data = Array.isArray(reservations) ? reservations : (reservations?.data || []);

      // Agrupar por día
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
      {/* Header */}
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

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-1 bg-surface-2 p-1 rounded">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-maison-cream-muted py-2 bg-surface-1 rounded">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-surface-2 p-1 rounded">
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} className="aspect-square bg-surface-1" />
        ))}
        {dayNumbers.map((day) => {
          const dayData = days.get(day);
          const isToday = day === todayDate;
          return (
            <button
              key={day}
              type="button"
              onClick={() => {}}
              className={`
                aspect-square rounded-sm text-xs font-medium transition-all
                ${isToday
                  ? 'bg-maison-gold/20 text-maison-gold border border-maison-gold'
                  : dayData && dayData.count > 0
                    ? 'bg-maison-gold-bg text-maison-gold border border-maison-gold/30 hover:bg-maison-gold/10'
                    : 'bg-surface-1 text-maison-cream-muted hover:bg-surface-2 border border-transparent'
                }
              `}
              title={dayData ? `${dayData.count} reservación(es)` : undefined}
            >
              <div className="flex flex-col items-center justify-center h-full gap-0.5">
                <span className="font-semibold">{day}</span>
                {dayData && dayData.count > 0 && (
                  <span className="text-[9px] leading-tight opacity-75">
                    {dayData.count === 1 ? '●' : `●●`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
