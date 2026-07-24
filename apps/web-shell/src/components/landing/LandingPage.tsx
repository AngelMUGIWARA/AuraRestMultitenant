'use client';

import Link from 'next/link';
import {
  IconAnalytics,
  IconCalendar,
  IconChevronRight,
  IconInventory,
  IconOrders,
  IconPayment,
  IconTable,
  IconTrendingUp,
} from '@maison/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';
import { IconChefHat, IconQuoteMark } from './landing-icons';

/* ── Datos de contenido ──────────────────────────────────────────── */

const NAV_LINKS = [
  { href: '#modulos', label: 'Producto' },
  { href: '#equipo', label: 'Equipo' },
  { href: '#manifiesto', label: 'Filosofía' },
];

const STATS = [
  { value: '07', label: 'Módulos operativos' },
  { value: '07', label: 'Roles con permisos propios' },
  { value: '∞', label: 'Sucursales por tenant' },
  { value: '24/7', label: 'Servicio en la nube' },
];

const MODULES = [
  {
    numeral: 'I',
    icon: IconOrders,
    name: 'Pedidos',
    description:
      'Captura cada orden desde la mesa y síguela hasta cocina y caja, sin llamadas ni papeles perdidos.',
    tag: 'Tiempo real',
  },
  {
    numeral: 'II',
    icon: IconChefHat,
    name: 'Cocina',
    description:
      'Comandas organizadas por estación, con prioridad y tiempos visibles para toda la brigada.',
    tag: 'Pantalla KDS',
  },
  {
    numeral: 'III',
    icon: IconInventory,
    name: 'Inventario',
    description:
      'Existencias, mermas y recetas — con los costos visibles solo para quien debe verlos.',
    tag: 'Acceso por rol',
  },
  {
    numeral: 'IV',
    icon: IconPayment,
    name: 'Caja',
    description:
      'Cortes de turno, movimientos y conciliación de cada sucursal, auditados por usuario.',
    tag: 'Auditable',
  },
  {
    numeral: 'V',
    icon: IconAnalytics,
    name: 'Reportes',
    description:
      'Ventas, horarios pico y desempeño comparado entre sucursales, en un vistazo.',
    tag: 'Multi-sucursal',
  },
  {
    numeral: 'VI',
    icon: IconCalendar,
    name: 'Reservaciones',
    description: 'Disponibilidad de mesas y confirmaciones al instante, sin sobrecupo.',
    tag: 'Instantáneo',
  },
  {
    numeral: 'VII',
    icon: IconTable,
    name: 'Mesas',
    description:
      'Mapa de piso con estatus y zonas, para saber de un vistazo qué mesa está lista.',
    tag: 'Mapa en vivo',
  },
] as const;

const ROLES = [
  { code: 'OWNER', desc: 'Visión completa del negocio y de todas las sucursales.' },
  { code: 'ADMIN', desc: 'Gestión administrativa total de la sucursal.' },
  { code: 'MANAGER', desc: 'Operación diaria: stock, turnos y alertas.' },
  { code: 'CHEF', desc: 'Cocina, recetas y disponibilidad de insumos.' },
  { code: 'KITCHEN_STAFF', desc: 'Consulta operativa de disponibilidad.' },
  { code: 'WAITER', desc: 'Mesas, comandas y estatus de servicio.' },
  { code: 'CASHIER', desc: 'Cobro, cortes y conciliación de caja.' },
] as const;

/* ── Marca ────────────────────────────────────────────────────────── */

function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]',
        className,
      )}
      style={{
        background:
          'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)',
      }}
      aria-hidden="true"
    >
      <span className="font-display text-lg font-medium italic leading-none text-white">M</span>
    </div>
  );
}

/* ── Encabezado ───────────────────────────────────────────────────── */

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-maison-border/70 bg-surface-0/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg font-medium leading-none text-maison-cream">
            Maison
          </span>
        </Link>

        <nav aria-label="Secciones" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-maison-cream-muted transition-colors hover:text-maison-cream"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/auth/login" className="btn-primary !px-3.5 !py-1.5 !text-sm">
            Ingresar
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="grain-overlay relative overflow-hidden pb-20 pt-20 sm:pb-28 sm:pt-28">
      {/* Palabra ornamental de fondo */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[22vw] font-medium italic leading-none text-maison-cream opacity-[0.035] sm:text-[16vw]"
      >
        Maison
      </p>

      {/* Resplandores ámbar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 z-0 h-[420px] w-[420px] rounded-full bg-maison-amber/20 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 z-0 h-[380px] w-[380px] rounded-full bg-maison-amber/10 blur-[110px]"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Columna de texto */}
        <div>
          <p className="animate-fade-in font-mono text-2xs uppercase tracking-[0.3em] text-maison-amber">
            Plataforma multitenant · gestión de restaurantes
          </p>

          <h1
            className="animate-slide-in-up mt-5 font-display text-5xl font-medium leading-[1.05] text-maison-cream sm:text-6xl lg:text-[4.2rem]"
            style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}
          >
            La cocina, la caja y la sala,
            <br />
            <span className="italic text-maison-amber">en un mismo servicio.</span>
          </h1>

          <p
            className="animate-slide-in-up mt-6 max-w-lg text-base leading-relaxed text-maison-cream-muted sm:text-lg"
            style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}
          >
            Maison centraliza pedidos, cocina, inventario, caja, reservaciones y reportes de
            cada sucursal de tu restaurante — con un acceso distinto, diseñado a la medida,
            para cada rol de tu equipo.
          </p>

          <div
            className="animate-slide-in-up mt-9 flex flex-wrap items-center gap-4"
            style={{ animationDelay: '240ms', animationFillMode: 'backwards' }}
          >
            <Link href="/auth/login" className="btn-primary group !px-5 !py-2.5 !text-sm">
              Ingresar a mi restaurante
              <IconChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#modulos" className="btn-ghost !px-5 !py-2.5 !text-sm">
              Ver el recorrido
            </a>
          </div>

          <p
            className="animate-fade-in mt-7 flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-maison-cream-dim"
            style={{ animationDelay: '320ms', animationFillMode: 'backwards' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-maison-sage" aria-hidden="true" />
            Acceso con el identificador de tu restaurante
          </p>
        </div>

        {/* Composición decorativa — solo en pantallas grandes */}
        <div className="relative hidden h-[440px] lg:block" aria-hidden="true">
          <div
            className="animate-slide-in-up absolute left-0 top-6 w-64 rotate-[-4deg] card p-4 font-mono"
            style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}
          >
            <span className="badge absolute -right-2 -top-2 bg-maison-sage-bg text-maison-sage">
              En preparación
            </span>
            <div className="flex items-center justify-between border-b border-dashed border-maison-border pb-2">
              <span className="text-2xs uppercase tracking-widest text-maison-cream-dim">
                Comanda
              </span>
              <span className="text-2xs text-maison-amber">#0182</span>
            </div>
            <div className="flex flex-col gap-1.5 py-2.5 text-xs text-maison-cream-muted">
              <div className="flex justify-between">
                <span>2× Arrachera a las Brasas</span>
                <span>570.00</span>
              </div>
              <div className="flex justify-between">
                <span>1× Agua de Horchata</span>
                <span>55.00</span>
              </div>
              <div className="flex justify-between">
                <span>1× Flan Napolitano</span>
                <span>75.00</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-dashed border-maison-border pt-2 text-sm font-medium text-maison-cream">
              <span>Total</span>
              <span>$718.75</span>
            </div>
          </div>

          <div
            className="animate-slide-in-up absolute bottom-2 right-0 w-56 rotate-[3deg] card p-4"
            style={{ animationDelay: '360ms', animationFillMode: 'backwards' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-2xs uppercase tracking-widest text-maison-cream-dim">
                Salón · Terraza
              </span>
              <IconTable className="h-3.5 w-3.5 text-maison-cream-dim" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((n, i) => (
                <div
                  key={n}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md border font-mono text-2xs',
                    i % 3 === 0
                      ? 'border-maison-sage/40 bg-maison-sage-bg text-maison-sage'
                      : i % 3 === 1
                        ? 'border-maison-amber/40 bg-maison-amber-glow text-maison-amber'
                        : 'border-maison-border bg-surface-2 text-maison-cream-dim',
                  )}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          <div
            className="animate-fade-in absolute right-8 top-40 flex items-center gap-2 card px-3 py-2 shadow-amber-glow"
            style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
          >
            <IconTrendingUp className="h-3.5 w-3.5 text-maison-sage" />
            <span className="font-mono text-2xs font-medium text-maison-cream">
              98% mesas a tiempo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Franja de estadísticas ──────────────────────────────────────── */

function StatsStrip() {
  return (
    <section className="border-y border-maison-border bg-surface-1/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-6 py-14 sm:grid-cols-4">
        {STATS.map((stat, idx) => (
          <Reveal key={stat.label} delay={idx * 80} className="px-4 text-center">
            <span className="font-mono text-3xl font-medium tabular-nums text-maison-amber sm:text-4xl">
              {stat.value}
            </span>
            <p className="mt-1.5 font-mono text-2xs uppercase tracking-widest text-maison-cream-dim">
              {stat.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Módulos — "Le Menu" ──────────────────────────────────────────── */

function ModulesSection() {
  return (
    <section id="modulos" className="scroll-mt-20 py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <p className="font-mono text-2xs uppercase tracking-[0.3em] text-maison-amber">
            Le Menu
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium leading-tight text-maison-cream sm:text-5xl">
            Todo lo que ocurre en el servicio,
            <br />
            <span className="italic text-maison-amber">en un solo lugar.</span>
          </h2>
          <p className="mt-4 max-w-xl text-maison-cream-muted">
            Cada módulo se comporta como una estación de tu restaurante: con su propio ritmo,
            pero conectado al mismo servicio.
          </p>
        </Reveal>

        <div className="mt-14 border-t border-maison-border/60">
          {MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Reveal key={mod.name} delay={Math.min(idx * 60, 360)}>
                <div className="group flex flex-col gap-3 border-b border-maison-border/60 py-7 sm:flex-row sm:items-center sm:gap-6">
                  <span className="w-8 flex-shrink-0 font-mono text-sm text-maison-cream-dim">
                    {mod.numeral}.
                  </span>

                  <div className="flex flex-shrink-0 items-center gap-3 sm:w-60">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-maison-amber-glow text-maison-amber transition-colors group-hover:bg-maison-amber group-hover:text-surface-1">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-xl text-maison-cream sm:text-2xl">
                      {mod.name}
                    </h3>
                  </div>

                  <p className="flex-1 text-sm leading-relaxed text-maison-cream-muted">
                    {mod.description}
                  </p>

                  <span className="hidden flex-1 border-b border-dotted border-maison-border-subtle lg:block" />

                  <span className="flex-shrink-0 font-mono text-2xs uppercase tracking-widest text-maison-cream-dim sm:text-right">
                    {mod.tag}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Equipo / brigada ─────────────────────────────────────────────── */

function TeamSection() {
  return (
    <section id="equipo" className="scroll-mt-20 border-y border-maison-border bg-surface-1/40 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <p className="font-mono text-2xs uppercase tracking-[0.3em] text-maison-amber">
            La Brigada
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-medium leading-tight text-maison-cream sm:text-4xl">
            Un acceso distinto para cada estación del servicio.
          </h2>
          <p className="mt-4 max-w-xl text-maison-cream-muted">
            Ningún rol ve más de lo que necesita. El dueño ve el negocio completo; el chef ve
            su despensa. Así de simple.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ROLES.map((role, idx) => (
            <Reveal key={role.code} delay={idx * 50}>
              <div className="card card-hover flex h-full flex-col gap-2 p-4">
                <span className="font-mono text-2xs font-semibold uppercase tracking-widest text-maison-amber">
                  {role.code}
                </span>
                <span className="text-sm leading-snug text-maison-cream-muted">{role.desc}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Manifiesto ───────────────────────────────────────────────────── */

function ManifestoSection() {
  return (
    <section id="manifiesto" className="scroll-mt-20 py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <IconQuoteMark className="mx-auto text-maison-amber/40" />
          <blockquote className="mt-6 font-display text-3xl italic leading-snug text-maison-cream sm:text-4xl">
            El buen servicio no se improvisa. Se orquesta — plato a plato, mesa a mesa,
            sucursal a sucursal.
          </blockquote>
          <p className="mt-6 font-mono text-2xs uppercase tracking-[0.3em] text-maison-cream-dim">
            — Maison
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Llamado final ────────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="grain-overlay relative overflow-hidden border-t border-maison-border py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 z-0 h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-maison-amber/15 blur-[120px]"
      />
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <Reveal>
          <p className="font-mono text-2xs uppercase tracking-[0.3em] text-maison-amber">
            Reserva tu acceso
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium leading-tight text-maison-cream sm:text-5xl">
            Tu restaurante, <span className="italic text-maison-amber">en su punto.</span>
          </h2>
          <p className="mt-4 text-maison-cream-muted">
            Ingresa con el identificador de tu restaurante para ver el panel de tu rol.
          </p>
          <div className="mt-8">
            <Link href="/auth/login" className="btn-primary group !px-6 !py-3 !text-base">
              Ingresar ahora
              <IconChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Pie de página ────────────────────────────────────────────────── */

function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-maison-border bg-surface-1/30 py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="font-display text-lg font-medium text-maison-cream">Maison</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-maison-cream-dim">
              Software de operación para restaurantes multitenant — de la cocina a la caja.
            </p>
          </div>

          <div>
            <p className="section-label px-0">Producto</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-maison-cream-muted">
              <li>Pedidos</li>
              <li>Cocina</li>
              <li>Inventario</li>
              <li>Caja</li>
            </ul>
          </div>

          <div>
            <p className="section-label px-0">Plataforma</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-maison-cream-muted">
              <li>Reportes</li>
              <li>Reservaciones</li>
              <li>Mesas</li>
              <li>Multitenant</li>
            </ul>
          </div>

          <div>
            <p className="section-label px-0">Acceso</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              <li>
                <Link href="/auth/login" className="text-maison-cream-muted transition-colors hover:text-maison-amber">
                  Ingresar
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-maison-border/60 pt-6 font-mono text-2xs uppercase tracking-widest text-maison-cream-dim sm:flex-row">
          <p>© {year} Maison — Todos los derechos reservados.</p>
          <p>Hecho para equipos de servicio.</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Página ───────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0">
      <LandingHeader />
      <main>
        <Hero />
        <StatsStrip />
        <ModulesSection />
        <TeamSection />
        <ManifestoSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
