import { useEffect, useState } from 'react';
import { reservationsService } from '../services/reservations.service';
import { branchesService } from '../services/branches.service';
import { tablesService } from '../services/tables.service';

import type { Branch, CreateReservationPayload, RestaurantTable } from '@maison/types';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    branchId?: string; // Sucursal seleccionada en el contexto global; undefined si está en vista "Todas las sucursales"
}

interface FormState {
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    partySize: number;
    date: string;
    time: string;
    notes: string;
    tableId: string;
}

const EMPTY_FORM: FormState = {
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    partySize: 1,
    date: '',
    time: '',
    notes: '',
    tableId: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Devuelve fecha en formato YYYY-MM-DD UTC
 * Invariante: siempre UTC, nunca local
 */
function todayDateString(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Devuelve hora en formato HH:MM UTC
 * Invariante: siempre UTC, nunca local
 *
 * IMPORTANTE: JavaScript Date.toTimeString() devuelve hora LOCAL.
 * Este método devuelve hora UTC usando toISOString().
 */
function nowTimeString(): string {
    return new Date().toISOString().slice(11, 16);
}

export function ReservationModal({ isOpen, onClose, onSuccess, branchId }: ReservationModalProps) {
    const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const needsBranchPicker = !branchId;
    const [branchOptions, setBranchOptions] = useState<Branch[]>([]);
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);
    const [pickedBranchId, setPickedBranchId] = useState('');
    const effectiveBranchId = branchId || pickedBranchId;

    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [isLoadingTables, setIsLoadingTables] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reiniciar el formulario cada vez que se abre el modal
    useEffect(() => {
        if (!isOpen) return;
        setFormData(EMPTY_FORM);
        setErrors({});
        setSubmitError(null);
        setPickedBranchId('');
    }, [isOpen]);

    // Cargar sucursales cuando el modal necesita que el usuario elija una (vista "Todas las sucursales")
    useEffect(() => {
        if (!isOpen || !needsBranchPicker) return;
        setIsLoadingBranches(true);
        branchesService
            .getAll()
            .then((res) => setBranchOptions((res.data ?? []).filter((b) => b.isActive !== false)))
            .catch(() => setBranchOptions([]))
            .finally(() => setIsLoadingBranches(false));
    }, [isOpen, needsBranchPicker]);

    // Cargar mesas de la sucursal efectiva; limpiar la mesa elegida si cambia la sucursal
    useEffect(() => {
        setFormData((f) => ({ ...f, tableId: '' }));

        if (!isOpen || !effectiveBranchId) {
            setTables([]);
            return;
        }

        setIsLoadingTables(true);
        tablesService
            .findByBranch(effectiveBranchId)
            .then((mesas) => setTables(Array.isArray(mesas) ? mesas : []))
            .catch(() => setTables([]))
            .finally(() => setIsLoadingTables(false));
    }, [isOpen, effectiveBranchId]);

    function validate(): Record<string, string> {
        const errs: Record<string, string> = {};

        if (formData.guestName.trim().length < 2) {
            errs.guestName = 'Ingresa el nombre completo del cliente.';
        }

        const phoneDigits = formData.guestPhone.replace(/\D/g, '');
        if (phoneDigits.length < 7) {
            errs.guestPhone = 'Ingresa un teléfono válido (mínimo 7 dígitos).';
        }

        if (formData.guestEmail.trim() && !EMAIL_RE.test(formData.guestEmail.trim())) {
            errs.guestEmail = 'El correo electrónico no es válido.';
        }

        if (!Number.isInteger(formData.partySize) || formData.partySize < 1) {
            errs.partySize = 'El número de personas debe ser al menos 1.';
        }

        const today = todayDateString();
        if (!formData.date) {
            errs.date = 'Selecciona una fecha.';
        } else if (formData.date < today) {
            errs.date = 'La fecha no puede ser anterior a hoy.';
        }

        if (!formData.time) {
            errs.time = 'Selecciona una hora.';
        } else if (formData.date === today && formData.time < nowTimeString()) {
            errs.time = 'La hora ya pasó para el día de hoy.';
        }

        if (!effectiveBranchId) {
            errs.branchId = 'Selecciona una sucursal.';
        }

        if (!formData.tableId) {
            errs.tableId = tables.length === 0
                ? 'No hay mesas disponibles en esta sucursal.'
                : 'Selecciona una mesa.';
        }

        return errs;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const payload: CreateReservationPayload = {
                guestName: formData.guestName.trim(),
                guestPhone: formData.guestPhone.trim(),
                guestEmail: formData.guestEmail.trim() || undefined,
                partySize: Number(formData.partySize),
                date: formData.date,
                time: formData.time,
                notes: formData.notes.trim() || undefined,
                branchId: effectiveBranchId,
                tableId: formData.tableId,
            };

            await reservationsService.create(payload);
            onSuccess();
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                const message = error.message;

                if (message.includes('date') || message.includes('formato YYYY-MM-DD')) {
                    setErrors((prev) => ({
                        ...prev,
                        date: 'La fecha debe estar en formato YYYY-MM-DD',
                    }));
                } else if (message.includes('time') || message.includes('formato HH:MM')) {
                    setErrors((prev) => ({
                        ...prev,
                        time: 'La hora debe estar en formato HH:MM',
                    }));
                } else if (message.includes('nombre') || message.includes('guestName')) {
                    setErrors((prev) => ({
                        ...prev,
                        guestName: 'El nombre solo puede contener letras, espacios, guiones y apóstrofes',
                    }));
                } else if (message.includes('Hora no disponible') || message.includes('conflictiva')) {
                    setSubmitError('La hora seleccionada no está disponible en esta mesa. Intenta con otra hora.');
                } else if (message.includes('futuro')) {
                    setSubmitError('La fecha y hora deben ser en el futuro.');
                } else {
                    setSubmitError(message || 'No se pudo crear la reservación.');
                }
            } else {
                setSubmitError('No se pudo crear la reservación.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-surface-1 p-6 shadow-2xl border border-maison-border max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-medium text-maison-cream mb-4">Nueva Reservación</h2>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">

                    {submitError && (
                        <div className="rounded-lg border border-maison-ruby/40 bg-maison-ruby/10 px-4 py-3 flex gap-3 items-start">
                            <span className="text-maison-ruby text-lg flex-shrink-0 mt-0.5">⚠</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-maison-ruby">{submitError}</p>
                            </div>
                        </div>
                    )}

                    {/* Sucursal (solo si la vista está en "Todas las sucursales") */}
                    {needsBranchPicker && (
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Sucursal *</label>
                            <select
                                className="input-base w-full mt-1"
                                value={pickedBranchId}
                                onChange={(e) => setPickedBranchId(e.target.value)}
                                disabled={isLoadingBranches}
                            >
                                <option value="">
                                    {isLoadingBranches ? 'Cargando sucursales…' : 'Selecciona una sucursal...'}
                                </option>
                                {branchOptions.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            {!isLoadingBranches && branchOptions.length === 0 && (
                                <p className="mt-1 text-2xs text-maison-ruby">No hay sucursales activas registradas.</p>
                            )}
                            {errors.branchId && <p className="mt-1 text-2xs text-maison-ruby">{errors.branchId}</p>}
                        </div>
                    )}

                    {/* Nombre del Comensal */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Nombre del Cliente *</label>
                        <input
                            type="text"
                            className={`input-base w-full mt-1 ${errors.guestName ? 'border-maison-ruby' : ''}`}
                            placeholder="Ej. Juan Pérez"
                            value={formData.guestName}
                            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                        />
                        {errors.guestName && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.guestName}</p>}
                    </div>

                    {/* Fila: Teléfono y No. de Personas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Teléfono *</label>
                            <input
                                type="tel"
                                className={`input-base w-full mt-1 ${errors.guestPhone ? 'border-maison-ruby' : ''}`}
                                placeholder="Ej. 5512345678"
                                value={formData.guestPhone}
                                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                            />
                            {errors.guestPhone && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.guestPhone}</p>}
                        </div>
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Personas *</label>
                            <input
                                type="number"
                                min={1}
                                className={`input-base w-full mt-1 ${errors.partySize ? 'border-maison-ruby' : ''}`}
                                value={formData.partySize}
                                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value, 10) || 1 })}
                            />
                            {errors.partySize && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.partySize}</p>}
                        </div>
                    </div>

                    {/* Email (Opcional) */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Correo Electrónico (Opcional)</label>
                        <input
                            type="email"
                            className={`input-base w-full mt-1 ${errors.guestEmail ? 'border-maison-ruby' : ''}`}
                            placeholder="juan.perez@example.com"
                            value={formData.guestEmail}
                            onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                        />
                        {errors.guestEmail && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.guestEmail}</p>}
                    </div>

                    {/* Fila: Fecha y Hora */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Fecha *</label>
                            <input
                                type="date"
                                min={todayDateString()}
                                className={`input-base w-full mt-1 ${errors.date ? 'border-maison-ruby' : ''}`}
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                            {errors.date && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.date}</p>}
                        </div>
                        <div>
                            <label className="text-2xs text-maison-cream-muted uppercase font-bold">Hora *</label>
                            <input
                                type="time"
                                className={`input-base w-full mt-1 ${errors.time ? 'border-maison-ruby' : ''}`}
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            />
                            {errors.time && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.time}</p>}
                        </div>
                    </div>

                    {/* Selector de Mesas */}
                    <div>
                        <label className="text-2xs text-maison-cream-muted uppercase font-bold">Mesa *</label>
                        <select
                            className={`input-base w-full mt-1 ${errors.tableId ? 'border-maison-ruby' : ''}`}
                            value={formData.tableId}
                            onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                            disabled={!effectiveBranchId || isLoadingTables}
                        >
                            <option value="">
                                {!effectiveBranchId
                                    ? 'Elige primero una sucursal...'
                                    : isLoadingTables
                                        ? 'Cargando mesas…'
                                        : 'Selecciona una mesa...'}
                            </option>
                            {tables.map(table => (
                                <option key={table.id} value={table.id}>
                                    Mesa {table.number} {table.name ? `- ${table.name}` : ''} ({table.capacity} personas)
                                </option>
                            ))}
                        </select>
                        {!isLoadingTables && effectiveBranchId && tables.length === 0 && (
                            <p className="mt-1 text-2xs text-maison-ruby">No hay mesas registradas en esta sucursal.</p>
                        )}
                        {errors.tableId && <p className="mt-1 text-2xs text-maison-ruby flex items-center gap-1"><span>⚠</span> {errors.tableId}</p>}
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
                    <div className="flex justify-end gap-2 pt-4 border-t border-maison-border">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-maison-border text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2.5 text-sm font-medium bg-maison-cream text-surface-1 rounded-lg hover:bg-white active:bg-maison-cream-dim focus:outline-none focus:ring-2 focus:ring-maison-cream focus:ring-offset-2 focus:ring-offset-surface-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="inline-block animate-spin mr-2">⟳</span>
                                    Guardando...
                                </>
                            ) : (
                                'Crear Reservación'
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
