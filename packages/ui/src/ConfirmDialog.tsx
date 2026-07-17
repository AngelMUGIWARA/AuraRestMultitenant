import { Modal } from './Modal';
import { IconLoader } from './Icons';
import { cn } from './cn';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-ghost" disabled={isLoading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-60',
              destructive
                ? 'border-maison-ruby bg-maison-ruby-bg text-maison-ruby hover:bg-maison-ruby hover:text-surface-1'
                : 'border-maison-amber bg-maison-amber-glow text-maison-amber hover:bg-maison-amber hover:text-surface-1',
            )}
          >
            {isLoading && <IconLoader className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-maison-cream-muted">{description}</p>
    </Modal>
  );
}
