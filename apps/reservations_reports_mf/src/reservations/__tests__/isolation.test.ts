import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const RESERVATIONS_MF_SRC = resolve(__dirname, '..');
const TABLES_MF_SRC = resolve(__dirname, '../../../../orders_tables_mf/src/tables');
const DASHBOARD_MF_SRC = resolve(__dirname, '../../../../core_auth_dashboard_mf/src/dashboard');

function getAllTsTsxDirectories(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist' || entry === '__tests__') continue;
    if (statSync(full).isDirectory()) {
      results.push(...getAllTsTsxDirectories(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function getFileContents(dir: string): Array<{ path: string; content: string }> {
  return getAllTsTsxDirectories(dir).map((p) => ({
    path: p,
    content: readFileSync(p, 'utf-8'),
  }));
}

describe('Cross-MFE import isolation', () => {
  it('reservations-mf does not import from tables-mf source', () => {
    const files = getFileContents(RESERVATIONS_MF_SRC);
    const violations: string[] = [];

    for (const file of files) {
      if (file.content.includes("from '../../../tables-mf") ||
          file.content.includes("from '../../tables-mf") ||
          file.content.includes("from '../tables-mf") ||
          file.content.includes('from "../../../tables-mf') ||
          file.content.includes("from \"../../../tables-mf")) {
        violations.push(file.path);
      }
    }

    expect(violations).toEqual([]);
  });

  it('dashboard-mf does not import from reservations-mf source', () => {
    const files = getFileContents(DASHBOARD_MF_SRC);
    const violations: string[] = [];

    for (const file of files) {
      if (file.content.includes("from '../../reservations-mf") ||
          file.content.includes("from '../../../reservations-mf") ||
          file.content.includes("from '../reservations-mf") ||
          file.content.includes("from \"../../reservations-mf") ||
          file.content.includes("from \"../../../reservations-mf")) {
        violations.push(file.path);
      }
    }

    expect(violations).toEqual([]);
  });

  it('reservations-mf uses local tables service, not cross-MFE import', () => {
    const modalFile = join(RESERVATIONS_MF_SRC, 'components/ReservationModal.tsx');
    const content = readFileSync(modalFile, 'utf-8');
    expect(content).toContain("from '../services/tables.service'");
    expect(content).not.toContain('tables-mf');
  });

  it('dashboard-mf does not lazy-load from reservations-mf', () => {
    const appFile = join(DASHBOARD_MF_SRC, 'App.tsx');
    const content = readFileSync(appFile, 'utf-8');
    expect(content).not.toContain('reservations-mf');
    expect(content).not.toContain('ReservacionesPage');
  });
});
