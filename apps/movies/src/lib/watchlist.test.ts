import { describe, expect, it } from 'vitest';

import { watchlistItemContract } from './watchlist';

const VALID_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  tmdb_id: 603,
  title: 'The Matrix',
  poster_path: '/abc.jpg',
  release_date: '1999-03-31',
  watched: false,
  added_by: '22222222-2222-4222-8222-222222222222',
  picked_at: '2024-02-01T00:00:00Z',
  picked_by: '22222222-2222-4222-8222-222222222222',
  created_at: '2024-01-01T00:00:00Z'
};

describe('watchlistItemContract', () => {
  it('parses a fully-populated valid row', () => {
    const result = watchlistItemContract.parse(VALID_ROW);
    expect(result).toEqual(VALID_ROW);
  });

  it('accepts null poster_path', () => {
    const row = { ...VALID_ROW, poster_path: null };
    const result = watchlistItemContract.parse(row);
    expect(result.poster_path).toBeNull();
  });

  it('accepts null release_date', () => {
    const row = { ...VALID_ROW, release_date: null };
    const result = watchlistItemContract.parse(row);
    expect(result.release_date).toBeNull();
  });

  it('accepts a null tonight pick', () => {
    const row = { ...VALID_ROW, picked_at: null, picked_by: null };
    const result = watchlistItemContract.parse(row);
    expect(result.picked_at).toBeNull();
    expect(result.picked_by).toBeNull();
  });

  it('rejects a non-UUID id', () => {
    const row = { ...VALID_ROW, id: 'not-a-uuid' };
    expect(() => watchlistItemContract.parse(row)).toThrow();
  });

  it('rejects a row with tmdb_id missing', () => {
    const { tmdb_id: _omitted, ...row } = VALID_ROW;
    expect(() => watchlistItemContract.parse(row)).toThrow();
  });

  it('rejects a row with title missing', () => {
    const { title: _omitted, ...row } = VALID_ROW;
    expect(() => watchlistItemContract.parse(row)).toThrow();
  });
});
