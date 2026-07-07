import type { DashboardStats } from '@maison/types';

export interface StatCardConfig {
  key: keyof DashboardStats;
  label: string;
  icon: string;
  format: 'number' | 'currency' | 'percent' | 'rating';
  trendKey?: keyof DashboardStats;
  colorVariant: 'amber' | 'sage' | 'gold' | 'cream';
}
