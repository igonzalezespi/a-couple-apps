import { describe, expect, it, vi } from 'vitest';

import { createSupabaseClient } from './client';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({ mock: true }))
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

describe('createSupabaseClient', () => {
  it('creates the Supabase client with the provided env', () => {
    createSupabaseClient({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon-key' });
    expect(createClientMock).toHaveBeenCalledWith(
      'https://x.supabase.co',
      'anon-key',
      expect.objectContaining({ auth: expect.any(Object) })
    );
  });
});
