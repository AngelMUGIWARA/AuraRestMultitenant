import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, formatCurrency, formatNumber, formatPercent, formatRelativeTime, getInitials } from '../utils';

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(cn('a', null, undefined, false, '', 'b')).toBe('a b');
  });

  it('returns empty string for no truthy values', () => {
    expect(cn(null, undefined, false)).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats MXN with no decimals', () => {
    expect(formatCurrency(1234)).toBe('$1,234');
  });

  it('formats USD', () => {
    expect(formatCurrency(100, 'USD', 'en-US')).toBe('$100');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });
});

describe('formatNumber', () => {
  it('formats with locale separator', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats small numbers', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatPercent', () => {
  it('formats positive with sign', () => {
    expect(formatPercent(12.5)).toBe('+12.5%');
  });

  it('formats negative without sign', () => {
    expect(formatPercent(-5.3)).toBe('-5.3%');
  });

  it('formats zero as positive', () => {
    expect(formatPercent(0)).toBe('+0.0%');
  });

  it('respects decimals param', () => {
    expect(formatPercent(10.123, 2)).toBe('+10.12%');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('returns ahora mismo for <1 min', () => {
    expect(formatRelativeTime('2024-06-15T11:59:30Z')).toBe('ahora mismo');
  });

  it('returns minutes for <60 min', () => {
    expect(formatRelativeTime('2024-06-15T11:45:00Z')).toBe('hace 15m');
  });

  it('returns hours for <24h', () => {
    expect(formatRelativeTime('2024-06-15T09:00:00Z')).toBe('hace 3h');
  });

  it('returns days for <7d', () => {
    expect(formatRelativeTime('2024-06-13T12:00:00Z')).toBe('hace 2d');
  });

  it('returns date for >=7d', () => {
    expect(formatRelativeTime('2024-06-01T12:00:00Z')).toMatch(/jun/);
  });
});

describe('getInitials', () => {
  it('returns first two letters uppercase', () => {
    expect(getInitials('juan perez')).toBe('JP');
  });

  it('handles single name', () => {
    expect(getInitials('maria')).toBe('M');
  });

  it('handles multiple words', () => {
    expect(getInitials('juan perez garcia')).toBe('JP');
  });
});
