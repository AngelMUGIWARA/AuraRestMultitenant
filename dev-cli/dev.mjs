#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';

// El CLI vive en dev-cli/, y los servicios estan una carpeta arriba (la raiz del repo).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IS_WIN = process.platform === 'win32';

// Servicio obligatorio: el backend es el punto unico de entrada a la API, no se puede desactivar.
const REQUIRED = 'backend';

// Catalogo de servicios que el CLI sabe levantar.
// Cada servicio se lanza con los scripts ya definidos en el package.json raiz
// (pnpm --filter backend start:dev / pnpm dev:shell / pnpm dev:<mf>), corriendo
// siempre desde la raiz del repo. No se usa Docker: por ahora todo corre local.
const SERVICES = {
  backend: {
    label: 'backend — API NestJS, punto unico de entrada (:4000)',
    dir: 'apps/backend',
    command: 'pnpm',
    args: ['--filter', 'backend', 'start:dev'],
    color: 'magenta',
    required: true,
    checked: true,
  },
  'web-shell': {
    label: 'web-shell — host de microfrontends (:3030)',
    dir: 'apps/web-shell',
    command: 'pnpm',
    args: ['dev:shell'],
    color: 'blue',
    checked: true,
  },
  'core_auth_dashboard_mf': {
    label: 'core_auth_dashboard_mf — autenticacion, dashboard y admin (:5011)',
    dir: 'apps/core_auth_dashboard_mf',
    command: 'pnpm',
    args: ['dev:core'],
    color: 'cyan',
    checked: true,
  },
  'orders_tables_mf': {
    label: 'orders_tables_mf — ordenes y gestion de mesas (:5012)',
    dir: 'apps/orders_tables_mf',
    command: 'pnpm',
    args: ['dev:orders'],
    color: 'red',
    checked: true,
  },
  'reservations_reports_mf': {
    label: 'reservations_reports_mf — reservaciones e informes (:5013)',
    dir: 'apps/reservations_reports_mf',
    command: 'pnpm',
    args: ['dev:reserv'],
    color: 'magentaBright',
    checked: true,
  },
  'menu-mf': {
    label: 'menu-mf — microfrontend de menu (:5003)',
    dir: 'apps/menu-mf',
    command: 'pnpm',
    args: ['dev:menu'],
    color: 'yellow',
  },
  'kitchen-mf': {
    label: 'kitchen-mf — microfrontend de cocina (:5005)',
    dir: 'apps/kitchen-mf',
    command: 'pnpm',
    args: ['dev:kitchen'],
    color: 'gray',
  },
  'cashier-mf': {
    label: 'cashier-mf — microfrontend de caja (:5006)',
    dir: 'apps/cashier-mf',
    command: 'pnpm',
    args: ['dev:cashier'],
    color: 'white',
  },
};

const children = [];

function banner() {
  let art;
  try {
    art = figlet.textSync('HEXACODE', { font: 'ANSI Shadow' });
  } catch {
    art = 'HEXACODE';
  }
  console.log(chalk.green(art));
  console.log(chalk.bold('  Panel de arranque de microservicios\n'));
}

function paintFor(color) {
  return chalk[color] ?? chalk.white;
}

// spawn multiplataforma: en Windows pnpm es un .cmd y requiere shell.
function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    shell: IS_WIN,
    windowsHide: IS_WIN,
    ...options,
  });
}

// Antepone [servicio] a cada linea de log del proceso hijo.
function prefixChunk(prefix, chunk) {
  return chunk
    .toString()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line, i, arr) =>
      i === arr.length - 1 && line === '' ? '' : `${prefix} ${line}`,
    )
    .filter((l) => l !== '')
    .join('\n')
    .concat('\n');
}

function launchService(key) {
  const s = SERVICES[key];
  const paint = paintFor(s.color);
  const prefix = paint(`[${key}]`);
  const child = spawnProcess(s.command, s.args, {
    cwd: ROOT,
  });
  child.stdout.on('data', (d) => process.stdout.write(prefixChunk(prefix, d)));
  child.stderr.on('data', (d) => process.stderr.write(prefixChunk(prefix, d)));
  child.on('exit', (code) =>
    console.log(`${prefix} ${chalk.red(`proceso terminado (code ${code})`)}`),
  );
  child.on('error', (err) =>
    console.log(`${prefix} ${chalk.red(err.message)}`),
  );
  children.push(child);
  console.log(`${prefix} ${chalk.green('iniciado')}`);
}

function killChild(child) {
  if (!child.pid || child.killed) return;
  if (IS_WIN) {
    // En Windows SIGINT no siempre mata el arbol pnpm → vite/next/nest → node.
    spawnProcess('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    child.kill('SIGINT');
  }
}

function shutdown() {
  console.log(chalk.yellow('\nApagando servicios...'));
  for (const child of children) {
    killChild(child);
  }
  setTimeout(() => process.exit(0), 500);
}

async function main() {
  banner();

  const dry = process.argv.includes('--dry');

  // Opcion obligatoria: se muestra marcada y deshabilitada (no se puede tocar).
  const requiredChoice = {
    name: `${SERVICES[REQUIRED].label} ${chalk.yellow('[obligatorio]')}`,
    value: REQUIRED,
    checked: true,
    disabled: chalk.dim('siempre activo'),
  };

  const optionalChoices = Object.entries(SERVICES)
    .filter(([key]) => key !== REQUIRED)
    .map(([key, s]) => ({ name: s.label, value: key, checked: Boolean(s.checked) }));

  let selected;
  let withStudio;

  if (dry) {
    selected = Object.keys(SERVICES);
    withStudio = false;
  } else {
    selected = await checkbox({
      message: 'Servicios a levantar (espacio = marcar, enter = confirmar):',
      choices: [requiredChoice, ...optionalChoices],
      pageSize: 12,
    });
    withStudio = await confirm({
      message: '¿Abrir Prisma Studio (explorador visual de la BD)?',
      default: false,
    });
  }

  // backend SIEMPRE se levanta, elija lo que elija el usuario.
  const toStart = Array.from(new Set([...selected, REQUIRED]));

  console.log(chalk.bold('\nPlan de arranque:'));
  for (const key of toStart) {
    const exists = existsSync(join(ROOT, SERVICES[key].dir));
    const mark = exists ? chalk.green('✓') : chalk.red('✗ (carpeta no existe)');
    const req = SERVICES[key].required ? chalk.yellow(' [obligatorio]') : '';
    console.log(`  ${mark} ${key}${req}`);
  }
  console.log(
    `  ${withStudio ? chalk.green('✓') : chalk.gray('·')} Prisma Studio`,
  );

  if (dry) {
    console.log(chalk.gray('\n(--dry) No se lanza nada. Solo se muestra el plan.'));
    return;
  }

  // Levantar cada servicio seleccionado.
  console.log('');
  for (const key of toStart) {
    if (!existsSync(join(ROOT, SERVICES[key].dir))) {
      console.log(
        chalk.red(
          `  ✗ ${key}: no existe la carpeta "${SERVICES[key].dir}", se omite.`,
        ),
      );
      continue;
    }
    launchService(key);
  }

  // Prisma Studio (opcional), sobre el backend.
  if (withStudio && existsSync(join(ROOT, 'apps/backend'))) {
    const child = spawnProcess(
      'pnpm',
      ['--filter', 'backend', 'exec', 'prisma', 'studio'],
      { cwd: ROOT },
    );
    const prefix = chalk.blueBright('[prisma-studio]');
    child.stdout.on('data', (d) => process.stdout.write(prefixChunk(prefix, d)));
    child.stderr.on('data', (d) => process.stderr.write(prefixChunk(prefix, d)));
    children.push(child);
    console.log(`${prefix} ${chalk.green('iniciado')}`);
  }

  if (children.length === 0) {
    console.log(chalk.yellow('\nNo se levanto ningun servicio.'));
    return;
  }

  console.log(chalk.gray('\nPresiona Ctrl+C para apagar todo.\n'));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // Cancelar con Ctrl+C durante los prompts lanza un ExitPromptError.
  if (err?.name === 'ExitPromptError') {
    console.log(chalk.gray('\nCancelado.'));
    process.exit(0);
  }
  console.error(chalk.red(err));
  process.exit(1);
});
