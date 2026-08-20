import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'maison:cashier:settings';

export interface CashierSettings {
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

function readSettings(): CashierSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useCashierSettings() {
  const [settings, setSettings] = useState<CashierSettings>(readSettings);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettings(readSettings());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const refresh = useCallback(() => setSettings(readSettings()), []);

  return { ...settings, refresh };
}
