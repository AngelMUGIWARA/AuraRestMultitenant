import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

/** Toque de cocinero — usado para el módulo de Cocina. Mismo trazo que @maison/ui/Icons. */
export function IconChefHat({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
      aria-hidden="true"
    >
      <path d="M7 11c-1.1 0-2-.9-2-2 0-1 .7-1.8 1.6-2 .2-1.7 1.7-3 3.4-3 .9 0 1.7.4 2.3 1 .6-.6 1.4-1 2.3-1 1.7 0 3.2 1.3 3.4 3 .9.2 1.6 1 1.6 2 0 1.1-.9 2-2 2" />
      <path d="M7 11v3h10v-3" />
      <rect x="6" y="17" width="12" height="3" rx="1" />
    </svg>
  );
}

/** Marca ornamental de comillas — usada en el pull-quote del manifiesto */
export function IconQuoteMark({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
    >
      <path d="M9.5 6C6.5 7.5 5 10 5 13c0 2.5 1.5 4 3.5 4S12 15.5 12 13.5c0-1.8-1.3-3-3-3-.3 0-.6 0-.9.1C8.5 8.5 9.8 7 11.5 6L9.5 6Z" />
      <path d="M18 6c-3 1.5-4.5 4-4.5 7 0 2.5 1.5 4 3.5 4s3.5-1.5 3.5-3.5c0-1.8-1.3-3-3-3-.3 0-.6 0-.9.1C17 8.5 18.3 7 20 6L18 6Z" />
    </svg>
  );
}
