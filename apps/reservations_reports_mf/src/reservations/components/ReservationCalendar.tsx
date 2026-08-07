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
        limit: 1000, // Obtener todas las del mes
      });

      const reservations = (response && 'data' in response) ? (response as any).data : response;
      const data = Array.isArray(reservations) ? reservations : (reservations?.data || []);

      // Agrupar por día
      const dayMap = new Map<number, DayReservations>();

      data.forEach((r: Reservation) => {
        const reservDate = new Date(r.date ? `${r.date}T00:00:00` : r.createdAt);
        const day = reservDate.getDate();
        const key = day;

        if (!dayMap.has(key)) {
          dayMap.set(key, {
            date: reservDate.toISOString().slice(0, 10),
            count: 0,
            reservations: [],
          });
        }

        const dayData = dayMap.get(key)!;
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
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  if (isLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-surface-2 rounded w-3/4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-maison-cream capitalize">{monthName}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-1 hover:bg-surface-2 rounded text-maison-cream-muted hover:text-maison-cream transition-colors"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="px-2 py-1 text-2xs hover:bg-surface-2 rounded text-maison-cream-muted hover:text-maison-cream transition-colors"
            aria-label="Hoy"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-1 hover:bg-surface-2 rounded text-maison-cream-muted hover:text-maison-cream transition-colors"
            aria-label="Próximo mes"
          >
            →
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-2xs font-medium text-maison-cream-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {dayNumbers.map((day) => {
          const dayData = days.get(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => {}}
              className={`
                aspect-square rounded text-2xs font-medium transition-colors
                ${dayData && dayData.count > 0
                  ? 'bg-maison-gold-bg text-maison-gold hover:bg-maison-gold/20'
                  : 'text-maison-cream-muted hover:bg-surface-2'
                }
              `}
              title={dayData ? `${dayData.count} reservación(es)` : undefined}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span>{day}</span>
                {dayData && dayData.count > 0 && (
                  <span className="text-[10px] leading-none">{dayData.count}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
