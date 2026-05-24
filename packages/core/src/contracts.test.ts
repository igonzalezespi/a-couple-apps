import { describe, expect, it } from 'vitest';

import { profileContract } from './contracts';

const uuid = '00000000-0000-0000-0000-000000000000';

describe('profileContract', () => {
  it('parses a valid profile', () => {
    const profile = profileContract.parse({
      id: uuid,
      display_name: 'Person A',
      created_at: '2026-01-01T00:00:00Z'
    });
    expect(profile.display_name).toBe('Person A');
  });

  it('rejects a non-uuid id', () => {
    expect(() =>
      profileContract.parse({ id: 'nope', display_name: 'A', created_at: '2026-01-01' })
    ).toThrow();
  });

  it('rejects a missing display_name', () => {
    expect(() => profileContract.parse({ id: uuid, created_at: '2026-01-01' })).toThrow();
  });
});
