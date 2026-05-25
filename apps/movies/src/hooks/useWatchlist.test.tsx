import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CoreProvider, createQueryClient, type AppSupabaseClient } from '@aca/core';

import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useSetWatched,
  useWatchlist
} from '../hooks/useWatchlist';

interface PostgrestLike {
  data: unknown;
  error: unknown;
}

/** A chainable, thenable fake of the Supabase query builder (no network). */
function makeBuilder(result: PostgrestLike) {
  const builder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then: (onFulfilled: (value: PostgrestLike) => unknown) =>
      Promise.resolve(result).then(onFulfilled)
  };
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order'] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
}

function makeWatchlistClient(result: PostgrestLike = { data: [], error: null }) {
  const builder = makeBuilder(result);
  const from = vi.fn().mockReturnValue(builder);
  const schema = vi.fn().mockReturnValue({ from });
  return { client: { schema } as unknown as AppSupabaseClient, schema, from, builder };
}

function makeWrapper(client: AppSupabaseClient) {
  const queryClient = createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CoreProvider client={client} queryClient={queryClient}>
        {children}
      </CoreProvider>
    );
  };
}

const ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  tmdb_id: 603,
  title: 'The Matrix',
  poster_path: '/abc.jpg',
  release_date: '1999-03-31',
  watched: false,
  added_by: '22222222-2222-4222-8222-222222222222',
  created_at: '2024-01-01T00:00:00Z'
};

describe('watchlist hooks', () => {
  it('useWatchlist selects from movies.watchlist_items, ordered, and parses rows', async () => {
    const { client, schema, from, builder } = makeWatchlistClient({ data: [ROW], error: null });

    const { result } = renderHook(() => useWatchlist(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(schema).toHaveBeenCalledWith('movies');
    expect(from).toHaveBeenCalledWith('watchlist_items');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual([ROW]);
  });

  it('useAddToWatchlist inserts the new item', async () => {
    const { client, from, builder } = makeWatchlistClient({ data: null, error: null });
    const { result } = renderHook(() => useAddToWatchlist(), { wrapper: makeWrapper(client) });
    const item = {
      tmdb_id: 603,
      title: 'The Matrix',
      poster_path: '/abc.jpg',
      release_date: '1999-03-31'
    };

    await act(async () => {
      await result.current.mutateAsync(item);
    });

    expect(from).toHaveBeenCalledWith('watchlist_items');
    expect(builder.insert).toHaveBeenCalledWith(item);
  });

  it('useRemoveFromWatchlist deletes by id', async () => {
    const { client, builder } = makeWatchlistClient({ data: null, error: null });
    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync('the-id');
    });

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'the-id');
  });

  it('useSetWatched updates watched by id', async () => {
    const { client, builder } = makeWatchlistClient({ data: null, error: null });
    const { result } = renderHook(() => useSetWatched(), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ id: 'the-id', watched: true });
    });

    expect(builder.update).toHaveBeenCalledWith({ watched: true });
    expect(builder.eq).toHaveBeenCalledWith('id', 'the-id');
  });
});
