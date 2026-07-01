import { useState, useEffect } from 'react';
import { reservationsService } from '../services/reservations.service';
import { tablesService } from '../../../tables-mf/src/services/tables.service';

import type { CreateReservationPayload, RestaurantTable } from '@maison/types';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Corregido/Asegurado de tus props originales
    branchId: string;      // Recibido automáticamente del contexto de la sucursal seleccionada
}

export function ReservationModal({ isOpen, onClose, onSuccess, branchId }: ReservationModalProps) {
    const [formData, setFormData] = useState({
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        partySize: 1,
        date: '',
        time: '',
        notes: '',
        tableId: '' 
    });

    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar mesas cuando se abre el modal (SIN CAMBIOS)
    useEffect(() => {
        console.log("Intentando buscar mesas para branchId:", branchId);

        if (isOpen && branchId) {
            tablesService.findByBranch(branchId)
                .then((mesas) => {
                    console.log("Mesas listas para renderizar en el modal:", mesas);
                    setTables(Array.isArray(mesas) ? mesas : []);
                })
                .catch((err) => {
                    console.error("Error atrapado en el componente:", err);
                    setTables([]);
                });
        }
    }, [isOpen, branchId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload: CreateReservationPayload = {
                guestName: formData.guestName,
                guestPhone: formData.guestPhone,
                guestEmail: formData.guestEmail.trim() || undefined, // Envía undefined si viene vacío para cumplir el contrato
                partySize: Number(formData.partySize),
                date: formData.date,
                time: formData.time,
                notes: formData.notes.trim() || undefined,           // Envía undefined si viene vacío para cumplir el contrato
                branchId: branchId,
                tableId: formData.tableId || undefined             // Se envía el ID seleccionado o undefined si es opcional
            };

            await reservationsService.create(payload);
            onSuccess();
            onClose();
            // Resetear el formulario al estado inicial
            setFormData({ 
                guestName: '', 
                guestPhone: '', 
                guestEmail: '', 
                partySize: 1, 
                date: '', 
                time: '', 
                notes: '', 
                tableId: '' 
            });
        } catch (error) {
            console.error("Error:", error);
            alert("Error al guardar. Asegúrate de haber seleccionado una mesa válida o llenado los campos obligatorios.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-surface-1 p-6 shadow-2xl border border-maison-border max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-medium text-maison-cream mb-4">Nueva Reservación</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Nombre del Comensal */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Nombre del Cliente *</label>
                        <input
                            type="text"
                            required
                            className="input-base w-full mt-1"
                            placeholder="Ej. Juan Pérez"
                            value={formData.guestName}
                            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                        />
                    </div>

                    {/* Fila: Teléfono y No. de Personas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Teléfono *</label>
                            <input
                                type="tel"
                                required
                                className="input-base w-full mt-1"
                                placeholder="Ej. 5512345678"
                                value={formData.guestPhone}
                                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Personas *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                className="input-base w-full mt-1"
                                value={formData.partySize}
                                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value, 10) || 1 })}
                            />
                        </div>
                    </div>

                    {/* Email (Opcional) */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Correo Electrónico (Opcional)</label>
                        <input
                            type="email"
                            className="input-base w-full mt-1"
                            placeholder="juan.perez@example.com"
                            value={formData.guestEmail}
                            onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                        />
                    </div>

                    {/* Fila: Fecha y Hora */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Fecha *</label>
                            <input
                                type="date"
                                required
                                className="input-base w-full mt-1"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Hora *</label>
                            <input
                                type="time"
                                required
                                className="input-base w-full mt-1"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Selector de Mesas (Mantenido intacto) */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Mesa</label>
                        <select
                            className="input-base w-full mt-1"
                            value={formData.tableId}
                            onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                        >
                            <option value="">Selecciona una mesa...</option>
                            {tables.map(table => (
                                <option key={table.id} value={table.id}>
                                    Mesa {table.number} {table.name ? `- ${table.name}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Notas Extra (Opcional) */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Notas Especiales (Opcional)</label>
                        <textarea
                            className="input-base w-full mt-1 resize-none h-20"
                            placeholder="Alergias, mesa exterior, cumpleaños..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex justify-end space-x-3 pt-2 border-t border-maison-border">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-maison-cream-muted hover:text-maison-cream transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium bg-maison-cream text-surface-1 rounded-lg hover:bg-white transition-colors disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting ? 'Guardando...' : 'Crear Reservación'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}