import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { type AppSupabaseClient } from './client';
import { invalidateForTable, subscribeCoupleChannel } from './realtime';

describe('invalidateForTable', () => {
  it('invalidates the query key for the changed table', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    invalidateForTable(queryClient, 'profiles');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['profiles'] });
  });
});

describe('subscribeCoupleChannel', () => {
  it('opens a couple-scoped channel and invalidates the cache on a change', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    let onChange: ((payload: { table: string }) => void) | undefined;
    const channel = {
      on: (_event: string, _filter: unknown, handler: (payload: { table: string }) => void) => {
        onChange = handler;
        return channel;
      },
      subscribe: vi.fn(() => channel)
    };
    const client = { channel: vi.fn(() => channel) } as unknown as AppSupabaseClient;

    subscribeCoupleChannel(client, { coupleId: 'c1', queryClient });

    expect(channel.subscribe).toHaveBeenCalled();
    onChange?.({ table: 'profiles' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['profiles'] });
  });
});
