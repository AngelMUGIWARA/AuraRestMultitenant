'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@maison/ui';
import { useTheme } from '@/context/ThemeContext';

const STORAGE_KEY = 'maison:cashier:settings';

interface CashierSettings {
  autoPrintTicket: boolean;
  showPrintPreview: boolean;
  soundOnNewOrder: boolean;
  confirmBeforeClosePayment: boolean;
  defaultPaymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'QR';
}

const DEFAULT_SETTINGS: CashierSettings = {
  autoPrintTicket: false,
  showPrintPreview: true,
  soundOnNewOrder: true,
  confirmBeforeClosePayment: true,
  defaultPaymentMethod: 'CASH',
};

function loadSettings(): CashierSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: CashierSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    console.error('Error saving cashier settings');
  }
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-maison-border bg-surface-1 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-maison-cream">{label}</p>
        <p className="mt-0.5 text-2xs text-maison-cream-dim">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-0 ${
          checked ? 'bg-emerald-500' : 'bg-surface-3'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function CashierSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<CashierSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  const update = useCallback(
    (partial: Partial<CashierSettings>) => {
      setSaved(false);
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        saveSettings(next);
        return next;
      });
      setTimeout(() => setSaved(true), 300);
    },
    [],
  );

  const resetDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'QR', label: 'Código QR' },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-maison-cream">Configuración</h1>
        <p className="text-xs text-maison-cream-dim">Preferencias de la terminal de caja</p>
      </div>

      {/* Apariencia */}
      <section className="space-y-3">
        <h2 className="section-label">Apariencia</h2>
        <Toggle
          label="Modo oscuro"
          description="Utilizar colores oscuros en el sistema"
          checked={theme === 'dark'}
          onChange={() => toggleTheme()}
        />
      </section>

      {/* Impresión */}
      <section className="space-y-3">
        <h2 className="section-label">Impresión de ticket</h2>
        <div className="space-y-2">
          <Toggle
            label="Imprimir ticket automáticamente"
            description="Imprimir ticket al completar un cobro"
            checked={settings.autoPrintTicket}
            onChange={(v) => update({ autoPrintTicket: v })}
          />
          <Toggle
            label="Mostrar vista previa antes de imprimir"
            description="Mostrar una vista previa del ticket antes de imprimirlo"
            checked={settings.showPrintPreview}
            onChange={(v) => update({ showPrintPreview: v })}
          />
        </div>
      </section>

      {/* Notificaciones */}
      <section className="space-y-3">
        <h2 className="section-label">Notificaciones</h2>
        <div className="space-y-2">
          <Toggle
            label="Sonido al recibir nuevo pedido"
            description="Reproducir un sonido cuando se envíe un pedido desde mesa"
            checked={settings.soundOnNewOrder}
            onChange={(v) => update({ soundOnNewOrder: v })}
          />
        </div>
      </section>

      {/* Cobro */}
      <section className="space-y-3">
        <h2 className="section-label">Cobro</h2>
        <div className="space-y-2">
          <Toggle
            label="Confirmar antes de cerrar cobro"
            description="Pedir confirmación antes de procesar el pago final"
            checked={settings.confirmBeforeClosePayment}
            onChange={(v) => update({ confirmBeforeClosePayment: v })}
          />
        </div>

        <div className="rounded-lg border border-maison-border bg-surface-1 p-4">
          <p className="text-sm font-medium text-maison-cream">Método de pago predeterminado</p>
          <p className="mt-0.5 mb-3 text-2xs text-maison-cream-dim">Método seleccionado por defecto al cobrar</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => update({ defaultPaymentMethod: m.value })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  settings.defaultPaymentMethod === m.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-maison-border bg-surface-2 text-maison-cream-muted hover:bg-surface-3 hover:text-maison-cream'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Reset */}
      <div className="flex items-center justify-between rounded-lg border border-maison-border bg-surface-1 p-4">
        <div>
          <p className="text-sm font-medium text-maison-cream">Restablecer valores predeterminados</p>
          <p className="mt-0.5 text-2xs text-maison-cream-dim">
            Restaurar todas las preferencias a su estado original
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="rounded-lg border border-maison-border bg-surface-2 px-4 py-2 text-xs font-medium text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
        >
          Restablecer
        </button>
      </div>

      {/* Save indicator */}
      {saved && (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-2xs font-medium text-emerald-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Preferencias guardadas
          </span>
        </div>
      )}
    </div>
  );
}
