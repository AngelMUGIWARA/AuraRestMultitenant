import { isSwaggerEnabled, shouldPersistAuthorization } from './swagger';

describe('isSwaggerEnabled', () => {
  it('returns true for development by default', () => {
    expect(isSwaggerEnabled('development')).toBe(true);
  });

  it('returns true for test by default', () => {
    expect(isSwaggerEnabled('test')).toBe(true);
  });

  it('returns false for production by default', () => {
    expect(isSwaggerEnabled('production')).toBe(false);
  });

  it('SWAGGER_ENABLED=true overrides production default', () => {
    expect(isSwaggerEnabled('production', 'true')).toBe(true);
  });

  it('SWAGGER_ENABLED=false overrides development default', () => {
    expect(isSwaggerEnabled('development', 'false')).toBe(false);
  });

  it('SWAGGER_ENABLED=1 is truthy', () => {
    expect(isSwaggerEnabled('production', '1')).toBe(true);
  });

  it('SWAGGER_ENABLED=0 is falsy', () => {
    expect(isSwaggerEnabled('development', '0')).toBe(false);
  });

  it('SWAGGER_ENABLED=yes is truthy', () => {
    expect(isSwaggerEnabled('production', 'yes')).toBe(true);
  });

  it('SWAGGER_ENABLED=no is falsy', () => {
    expect(isSwaggerEnabled('development', 'no')).toBe(false);
  });

  it('handles TRUE uppercase', () => {
    expect(isSwaggerEnabled('production', 'TRUE')).toBe(true);
  });

  it('handles FALSE uppercase', () => {
    expect(isSwaggerEnabled('development', 'FALSE')).toBe(false);
  });

  it('handles value with leading/trailing spaces', () => {
    expect(isSwaggerEnabled('production', '  true  ')).toBe(true);
  });

  it('returns default for undefined env value', () => {
    expect(isSwaggerEnabled('production', undefined)).toBe(false);
    expect(isSwaggerEnabled('development', undefined)).toBe(true);
  });

  it('returns default for empty string env value', () => {
    expect(isSwaggerEnabled('production', '')).toBe(false);
  });

  it('returns default for unrecognized string', () => {
    expect(isSwaggerEnabled('production', 'maybe')).toBe(false);
    expect(isSwaggerEnabled('development', 'maybe')).toBe(true);
  });
});

describe('shouldPersistAuthorization', () => {
  it('returns true only in development when swagger is enabled', () => {
    expect(shouldPersistAuthorization('development')).toBe(true);
  });

  it('returns false in test even though swagger is enabled', () => {
    expect(shouldPersistAuthorization('test')).toBe(false);
  });

  it('returns false in production when swagger is disabled', () => {
    expect(shouldPersistAuthorization('production')).toBe(false);
  });

  it('returns false in production even when swagger is force-enabled', () => {
    expect(shouldPersistAuthorization('production', 'true')).toBe(false);
  });

  it('returns false when swagger is explicitly disabled', () => {
    expect(shouldPersistAuthorization('development', 'false')).toBe(false);
  });

  it('returns false in test with force-enabled swagger', () => {
    expect(shouldPersistAuthorization('test', 'true')).toBe(false);
  });
});
