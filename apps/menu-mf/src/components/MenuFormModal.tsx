import { useEffect, useState } from 'react';
import { Modal, IconLoader } from '@maison/ui';
import { categoriesService } from '../services/categories.service';
import type { Category, CreateMenuItemPayload, MenuItem } from '@maison/types';

interface MenuFormModalProps {
  open: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSubmit: (payload: CreateMenuItemPayload) => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  imageUrl: '',
  isAvailable: true,
};

export function MenuFormModal({ open, item, onClose, onSubmit }: MenuFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedFile(null);
    setForm(
      item
        ? {
            name: item.name,
            description: item.description ?? '',
            price: String(item.price),
            categoryId: item.categoryId,
            imageUrl: '',
            isAvailable: item.isAvailable,
          }
        : EMPTY_FORM,
    );
    categoriesService
      .getAll({ isActive: true })
      .then((res) => setCategories(res.data.data))
      .catch(() => setCategories([]));
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!form.categoryId) {
      setError('Selecciona una categoría.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('El precio debe ser un número válido.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId,
        price,
        file: selectedFile ?? undefined,
        imageUrl: item?.imageUrl ?? undefined,
        isAvailable: form.isAvailable,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Editar producto' : 'Nuevo producto'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost" disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" form="menu-item-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <IconLoader className="h-3.5 w-3.5 animate-spin" />}
            {item ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      <form id="menu-item-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            placeholder="Ej. Ensalada César"
            autoFocus
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">Descripción</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input-base h-20 w-full resize-none py-2"
            placeholder="Descripción breve del producto"
          />
        </label>

        <div className="flex items-center gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-maison-cream-muted">Precio *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="input-base w-full"
              placeholder="0.00"
              required
            />
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-maison-cream-muted">Categoría *</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="input-base w-full"
              required
            >
              <option value="" disabled>Selecciona…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-maison-cream-muted">
            Imagen
          </span>

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setSelectedFile(e.target.files?.[0] ?? null)
            }
            className="input-base w-full"
          />

          {item?.imageUrl && !selectedFile && (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-32 w-32 rounded-lg object-cover border border-maison-border"
            />
          )}

          {selectedFile && (
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Vista previa"
              className="h-32 w-32 rounded-lg object-cover border border-maison-border"
            />
          )}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
            className="h-4 w-4 rounded border-maison-border accent-maison-amber"
          />
          <span className="text-xs font-medium text-maison-cream-muted">Disponible para la venta</span>
        </label>
      </form>
    </Modal>
  );
}
