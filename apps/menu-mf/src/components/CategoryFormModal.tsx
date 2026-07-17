import { useEffect, useState } from 'react';
import { Modal, IconLoader } from '@maison/ui';
import type { Category, CreateCategoryPayload } from '@maison/types';

interface CategoryFormModalProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSubmit: (payload: CreateCategoryPayload) => Promise<void>;
}

const EMPTY_FORM: CreateCategoryPayload = {
  name: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

export function CategoryFormModal({ open, category, onClose, onSubmit }: CategoryFormModalProps) {
  const [form, setForm] = useState<CreateCategoryPayload>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      category
        ? {
            name: category.name,
            description: category.description ?? '',
            imageUrl: '',
            sortOrder: category.sortOrder,
            isActive: category.isActive,
          }
        : EMPTY_FORM,
    );
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        description: form.description?.trim() || undefined,
        imageUrl: form.imageUrl?.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la categoría.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" form="category-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <IconLoader className="h-3.5 w-3.5 animate-spin" />}
            {category ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded border border-maison-ruby/30 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">Nombre *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input-base w-full"
            placeholder="Ej. Entradas"
            autoFocus
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">Descripción</span>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input-base h-20 w-full resize-none py-2"
            placeholder="Descripción breve de la categoría"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">URL de imagen</span>
          <input
            type="text"
            value={form.imageUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            className="input-base w-full"
            placeholder="https://..."
          />
        </label>

        <div className="flex items-center gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-maison-cream-muted">Orden</span>
            <input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              className="input-base w-full"
            />
          </label>

          <label className="flex flex-1 items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-maison-border accent-maison-amber"
            />
            <span className="text-xs font-medium text-maison-cream-muted">Categoría activa</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
