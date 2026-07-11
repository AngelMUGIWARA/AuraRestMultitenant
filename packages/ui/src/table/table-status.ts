export const TABLE_STATUS_CONFIG: Record<
  string,
  { bg: string; border: string; dot: string; label: string; textColor: string }
> = {
  free: {
    bg: 'bg-maison-sage/10',
    border: 'border-maison-sage/40',
    dot: 'bg-maison-sage',
    label: 'Libre',
    textColor: 'text-maison-sage',
  },
  occupied: {
    bg: 'bg-maison-ruby/10',
    border: 'border-maison-ruby/40',
    dot: 'bg-maison-ruby',
    label: 'Ocupada',
    textColor: 'text-maison-ruby',
  },
  reserved: {
    bg: 'bg-maison-amber/10',
    border: 'border-maison-amber/40',
    dot: 'bg-maison-amber animate-pulse',
    label: 'Reservada',
    textColor: 'text-maison-amber',
  },
  maintenance: {
    bg: 'bg-surface-2',
    border: 'border-white/10',
    dot: 'bg-maison-cream-dim',
    label: 'Mantenim.',
    textColor: 'text-maison-cream-dim',
  },
};
