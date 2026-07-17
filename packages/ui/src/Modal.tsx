'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';
import { IconX } from './Icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'card relative z-10 flex w-full max-h-[90vh] flex-col overflow-hidden animate-fade-in',
          SIZE_CLASS[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-maison-border px-5 py-4">
          <div>
            <p id="modal-title" className="text-sm font-medium text-maison-cream">{title}</p>
            {description && (
              <p className="mt-1 text-xs text-maison-cream-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-maison-cream-dim transition-colors hover:bg-surface-2 hover:text-maison-cream"
            aria-label="Cerrar"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-maison-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
