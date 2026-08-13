#!/usr/bin/env node

/**
 * ✅ Cross-platform cleanup script (Windows, Mac, Linux)
 * Elimina cachés sin depender de comandos específicos del sistema operativo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dirsToDelete = [
  './apps/*/.mf',
  './apps/*/dist',
  './apps/web-shell/.next',
  './node_modules/.vite',
];

/**
 * Eliminar directorio recursivamente (compatible con Windows)
 */
function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const curPath = path.join(dirPath, file);
    const stat = fs.statSync(curPath);

    if (stat.isDirectory()) {
      removeDir(curPath); // Recursivamente eliminar subdirectorios
    } else {
      fs.unlinkSync(curPath); // Eliminar archivo
    }
  });

  fs.rmdirSync(dirPath); // Eliminar directorio vacío
}

/**
 * Expandir patrones glob simples
 */
function expandGlob(pattern) {
  const basePath = process.cwd();
  const normalized = pattern.replace(/\\/g, '/');

  // Patrón: ./apps/*/.mf
  if (normalized.includes('*/')) {
    const parts = normalized.split('/');
    const wildIndex = parts.findIndex((p) => p === '*');

    if (wildIndex === -1) return [pattern];

    const beforeWild = parts.slice(0, wildIndex).join('/');
    const afterWild = parts.slice(wildIndex + 1).join('/');
    const searchDir = path.join(basePath, beforeWild);

    if (!fs.existsSync(searchDir)) return [];

    return fs
      .readdirSync(searchDir)
      .map((dir) => path.join(searchDir, dir, afterWild))
      .filter((dir) => fs.existsSync(dir));
  }

  return [pattern];
}

console.log('🧹 Limpiando cachés...\n');

dirsToDelete.forEach((pattern) => {
  const dirs = expandGlob(pattern);

  dirs.forEach((dir) => {
    const fullPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

    try {
      if (fs.existsSync(fullPath)) {
        removeDir(fullPath);
        console.log(`✅ Eliminado: ${dir}`);
      }
    } catch (err) {
      console.warn(`⚠️  No se pudo eliminar ${dir}:`, err.message);
    }
  });
});

console.log('\n✅ Limpieza completada');
