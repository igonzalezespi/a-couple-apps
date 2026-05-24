import { describe, expect, it } from 'vitest';

import { EnvError, parseEnv, parseSupabaseEnv, redact, SENSITIVE_ENV_VARS } from './index';

const validEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  TMDB_API_KEY: 'tmdb-key'
};

describe('parseEnv', () => {
  it('parses a valid environment', () => {
    expect(parseEnv(validEnv).SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('throws naming a missing required secret', () => {
    const { SUPABASE_ANON_KEY: _omitted, ...missing } = validEnv;
    expect(() => parseEnv(missing)).toThrow(EnvError);
    expect(() => parseEnv(missing)).toThrow(/SUPABASE_ANON_KEY/);
  });

  it('rejects a malformed SUPABASE_URL', () => {
    expect(() => parseEnv({ ...validEnv, SUPABASE_URL: 'not-a-url' })).toThrow(/SUPABASE_URL/);
  });
});

describe('parseSupabaseEnv', () => {
  it('parses the Supabase subset without requiring TMDB_API_KEY', () => {
    const env = parseSupabaseEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key'
    });
    expect(env).toEqual({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key'
    });
  });

  it('throws when a client var is missing', () => {
    expect(() => parseSupabaseEnv({ SUPABASE_URL: 'https://example.supabase.co' })).toThrow(
      EnvError
    );
    expect(() => parseSupabaseEnv({ SUPABASE_URL: 'https://example.supabase.co' })).toThrow(
      /SUPABASE_ANON_KEY/
    );
  });
});

describe('secret safety', () => {
  it('lists the secret-bearing vars', () => {
    expect(SENSITIVE_ENV_VARS).toContain('SUPABASE_ANON_KEY');
    expect(SENSITIVE_ENV_VARS).toContain('TMDB_API_KEY');
  });

  it('redacts sensitive values but not public ones', () => {
    expect(redact('SUPABASE_ANON_KEY', 'secret')).toBe('***');
    expect(redact('SUPABASE_URL', 'https://x')).toBe('https://x');
  });
});
