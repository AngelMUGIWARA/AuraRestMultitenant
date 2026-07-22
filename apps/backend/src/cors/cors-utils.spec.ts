import { parseAllowedOrigins, isOriginAllowed } from './cors-utils';

describe('parseAllowedOrigins', () => {
  it('parses a single origin', () => {
    expect(parseAllowedOrigins('http://localhost:3000')).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('parses multiple comma-separated origins', () => {
    expect(
      parseAllowedOrigins(
        'http://localhost:3000,http://localhost:3001,http://localhost:5001',
      ),
    ).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5001',
    ]);
  });

  it('trims whitespace around values', () => {
    expect(
      parseAllowedOrigins('  http://localhost:3000 , http://localhost:3001 '),
    ).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('filters empty entries from consecutive commas', () => {
    expect(parseAllowedOrigins('http://localhost:3000,,http://localhost:3001')).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
    ]);
  });

  it('filters leading and trailing commas', () => {
    expect(parseAllowedOrigins(',http://localhost:3000,')).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('strips trailing slashes', () => {
    expect(parseAllowedOrigins('http://localhost:3000/')).toEqual([
      'http://localhost:3000',
    ]);
    expect(parseAllowedOrigins('http://localhost:3000///')).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('returns empty array for undefined', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseAllowedOrigins('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseAllowedOrigins('   ')).toEqual([]);
  });

  it('handles mixed whitespace and empty entries', () => {
    expect(
      parseAllowedOrigins(' , http://localhost:3000 , , http://localhost:3001 , '),
    ).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('preserves duplicates', () => {
    expect(
      parseAllowedOrigins('http://localhost:3000,http://localhost:3000'),
    ).toEqual(['http://localhost:3000', 'http://localhost:3000']);
  });
});

describe('isOriginAllowed', () => {
  const allowed = [
    'http://localhost:3000',
    'http://localhost:5001',
    'https://staging.example.com',
  ];

  it('returns true for an exact match', () => {
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
  });

  it('returns false for a non-matching origin', () => {
    expect(isOriginAllowed('http://evil.com', allowed)).toBe(false);
  });

  it('rejects a malicious suffix attack', () => {
    expect(
      isOriginAllowed('http://localhost:3000.attacker.example', allowed),
    ).toBe(false);
  });

  it('rejects a malicious subdomain', () => {
    expect(
      isOriginAllowed('https://staging.example.com.attacker.net', allowed),
    ).toBe(false);
  });

  it('returns false for undefined origin', () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
  });

  it('returns false for null origin', () => {
    expect(isOriginAllowed(null, allowed)).toBe(false);
  });

  it('returns false for empty string origin', () => {
    expect(isOriginAllowed('', allowed)).toBe(false);
  });

  it('returns false when allowed list is empty', () => {
    expect(isOriginAllowed('http://localhost:3000', [])).toBe(false);
  });

  it('normalizes trailing slash in origin', () => {
    expect(isOriginAllowed('http://localhost:3000/', allowed)).toBe(true);
  });

  it('trims whitespace in origin', () => {
    expect(isOriginAllowed('  http://localhost:3000  ', allowed)).toBe(true);
  });

  it('rejects protocol mismatch (https vs http)', () => {
    expect(isOriginAllowed('https://localhost:3000', allowed)).toBe(false);
  });

  it('rejects port mismatch', () => {
    expect(isOriginAllowed('http://localhost:3001', allowed)).toBe(false);
  });

  it('rejects origin with different path', () => {
    expect(
      isOriginAllowed('https://staging.example.com/path', allowed),
    ).toBe(false);
  });
});
