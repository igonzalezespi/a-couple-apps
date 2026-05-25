import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  CoreProvider,
  createQueryClient,
  PersonProvider,
  useCurrentPerson,
  type AppSupabaseClient,
  type PersonStorage
} from '@aca/core';

import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useSetWatched,
  useWatchlist,
  useWatchlistRealtime
} from '../hooks/useWatchlist';
import { TEST_PEOPLE } from '../test/fakeClient';

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

const PERSON_ID = 'personA';
function personStorage(): PersonStorage {
  let value: string | null = PERSON_ID;
  return {
    getItem: () => Promise.resolve(value),
    setItem: (_k, v) => {
      value = v;
      return Promise.resolve();
    },
    removeItem: () => {
      value = null;
      return Promise.resolve();
    }
  };
}

/** Wrap with the person + core providers (useAddToWatchlist reads the current person). */
function makeProviders(client: AppSupabaseClient, queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PersonProvider people={TEST_PEOPLE} storage={personStorage()}>
        <CoreProvider client={client} queryClient={queryClient}>
          {children}
        </CoreProvider>
      </PersonProvider>
    );
  };
}

function makeWrapper(client: AppSupabaseClient) {
  return makeProviders(client, createQueryClient());
}

/** Like makeWrapper but disables retries so error state settles in a single attempt. */
function makeWrapperNoRetry(client: AppSupabaseClient) {
  return makeProviders(
    client,
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
  );
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

  it('useAddToWatchlist inserts the new item attributed to the current person', async () => {
    const { client, from, builder } = makeWatchlistClient({ data: null, error: null });
    const { result } = renderHook(
      () => ({ add: useAddToWatchlist(), current: useCurrentPerson() }),
      { wrapper: makeWrapper(client) }
    );
    // The selected person loads asynchronously; wait so added_by is populated.
    await waitFor(() => expect(result.current.current.person?.id).toBe('personA'));

    const item = {
      tmdb_id: 603,
      title: 'The Matrix',
      poster_path: '/abc.jpg',
      release_date: '1999-03-31'
    };
    await act(async () => {
      await result.current.add.mutateAsync(item);
    });

    expect(from).toHaveBeenCalledWith('watchlist_items');
    expect(builder.insert).toHaveBeenCalledWith({ ...item, added_by: 'personA' });
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

  it('useWatchlist is in error state when the query returns an error', async () => {
    const { client } = makeWatchlistClient({ data: null, error: { message: 'db error' } });
    const { result } = renderHook(() => useWatchlist(), { wrapper: makeWrapperNoRetry(client) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useAddToWatchlist is in error state when insert returns an error', async () => {
    const { client } = makeWatchlistClient({ data: null, error: { message: 'insert failed' } });
    const { result } = renderHook(() => useAddToWatchlist(), {
      wrapper: makeWrapperNoRetry(client)
    });

    await act(async () => {
      await result.current
        .mutateAsync({ tmdb_id: 603, title: 'The Matrix', poster_path: null, release_date: null })
        .catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useRemoveFromWatchlist is in error state when delete returns an error', async () => {
    const { client } = makeWatchlistClient({ data: null, error: { message: 'delete failed' } });
    const { result } = renderHook(() => useRemoveFromWatchlist(), {
      wrapper: makeWrapperNoRetry(client)
    });

    await act(async () => {
      await result.current.mutateAsync('the-id').catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useSetWatched is in error state when update returns an error', async () => {
    const { client } = makeWatchlistClient({ data: null, error: { message: 'update failed' } });
    const { result } = renderHook(() => useSetWatched(), { wrapper: makeWrapperNoRetry(client) });

    await act(async () => {
      await result.current.mutateAsync({ id: 'the-id', watched: true }).catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useAddToWatchlist calls invalidateQueries with watchlist_items key on success', async () => {
    const { client } = makeWatchlistClient({ data: null, error: null });
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const Wrapper = makeProviders(client, queryClient);
    const { result } = renderHook(() => useAddToWatchlist(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        tmdb_id: 603,
        title: 'The Matrix',
        poster_path: null,
        release_date: null
      });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlist_items'] });
  });

  it('useRemoveFromWatchlist calls invalidateQueries with watchlist_items key on success', async () => {
    const { client } = makeWatchlistClient({ data: null, error: null });
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const Wrapper = makeProviders(client, queryClient);
    const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('the-id');
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlist_items'] });
  });

  it('useSetWatched calls invalidateQueries with watchlist_items key on success', async () => {
    const { client } = makeWatchlistClient({ data: null, error: null });
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const Wrapper = makeProviders(client, queryClient);
    const { result } = renderHook(() => useSetWatched(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'the-id', watched: true });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlist_items'] });
  });
});

describe('useWatchlistRealtime', () => {
  it('subscribes on the movies schema and invalidates watchlist_items on a change', () => {
    let onChange: ((payload: { table: string }) => void) | undefined;
    const channel = {
      on: vi.fn((_event: string, _filter: unknown, handler: (p: { table: string }) => void) => {
        onChange = handler;
        return channel;
      }),
      subscribe: vi.fn(() => channel)
    };
    const removeChannel = vi.fn();
    const client = {
      channel: vi.fn(() => channel),
      removeChannel
    } as unknown as AppSupabaseClient;

    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const Wrapper = makeProviders(client, queryClient);

    const { unmount } = renderHook(() => useWatchlistRealtime(), { wrapper: Wrapper });

    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'movies' },
      expect.any(Function)
    );
    expect(channel.subscribe).toHaveBeenCalled();

    onChange?.({ table: 'watchlist_items' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlist_items'] });

    unmount();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
