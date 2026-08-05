#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '../apps/backend');

const commands = {
  'deploy': {
    description: 'Ejecuta todas las migraciones pendientes (system y tenant)',
    run: () => {
      console.log('\n🔄 Ejecutando migraciones del SISTEMA...\n');
      execSync('npx prisma migrate deploy --schema ./prisma/system/schema.prisma', {
        cwd: backendDir,
        stdio: 'inherit'
      });

      console.log('\n🔄 Ejecutando migraciones del TENANT...\n');
      execSync('npx prisma migrate deploy --schema ./prisma/tenant/schema.prisma', {
        cwd: backendDir,
        stdio: 'inherit'
      });

      console.log('\n✅ Migraciones completadas\n');
    }
  },
  'status': {
    description: 'Ver estado de las migraciones',
    run: () => {
      console.log('\n📊 Estado de migraciones del SISTEMA:\n');
      execSync('npx prisma migrate status --schema ./prisma/system/schema.prisma', {
        cwd: backendDir,
        stdio: 'inherit'
      });

      console.log('\n📊 Estado de migraciones del TENANT:\n');
      execSync('npx prisma migrate status --schema ./prisma/tenant/schema.prisma', {
        cwd: backendDir,
        stdio: 'inherit'
      });
    }
  },
  'seed': {
    description: 'Ejecuta los seeds iniciales',
    run: () => {
      console.log('\n🌱 Ejecutando seeds...\n');
      execSync('pnpm seed', {
        cwd: backendDir,
        stdio: 'inherit'
      });
    }
  },
  'seed:admin': {
    description: 'Ejecuta el seed de super admin',
    run: () => {
      console.log('\n👤 Ejecutando seed de super admin...\n');
      execSync('pnpm seed:super-admin', {
        cwd: backendDir,
        stdio: 'inherit'
      });
    }
  },
  'setup': {
    description: 'Setup completo: migraciones + seeds',
    run: () => {
      commands['deploy'].run();
      commands['seed'].run();
      commands['seed:admin'].run();
      console.log('\n🎉 Setup completado exitosamente!\n');
    }
  },
  'dev': {
    description: 'Ejecuta backend en modo desarrollo',
    run: () => {
      console.log('\n🚀 Iniciando backend en modo desarrollo...\n');
      execSync('npm run start:dev', {
        cwd: backendDir,
        stdio: 'inherit'
      });
    }
  },
  'dev:all': {
    description: 'Ejecuta backend + frontend completo (shell + todas las MFEs)',
    run: () => {
      console.log('\n🚀 Iniciando proyecto completo...\n');
      const rootDir = path.join(__dirname, '..');
      execSync('pnpm dev:all', {
        cwd: rootDir,
        stdio: 'inherit'
      });
    }
  }
};

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            🍽️  AuraRest Multitenant - CLI Manager             ║
╚════════════════════════════════════════════════════════════════╝

Uso: node scripts/migrate.js <comando>

COMANDOS DISPONIBLES:
`);

  Object.entries(commands).forEach(([cmd, { description }]) => {
    console.log(`  ${cmd.padEnd(15)} - ${description}`);
  });

  console.log(`
EJEMPLOS:
  node scripts/migrate.js deploy     # Ejecutar todas las migraciones
  node scripts/migrate.js setup      # Setup completo (migraciones + seeds)
  node scripts/migrate.js dev:all    # Backend + frontend
  node scripts/migrate.js status     # Ver estado actual
  `);
}

const command = process.argv[2];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!commands[command]) {
  console.error(`\n❌ Comando desconocido: "${command}"\n`);
  showHelp();
  process.exit(1);
}

try {
  commands[command].run();
} catch (error) {
  console.error(`\n❌ Error ejecutando "${command}":`, error.message);
  process.exit(1);
}
