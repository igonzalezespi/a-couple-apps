import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSession } from './auth';
import { type AppSupabaseClient } from './client';
import { CoreProvider } from './provider';
import { createQueryClient } from './query';

type AuthHandler = (event: string, session: unknown) => void;

function makeFakeClient(initialSession: unknown) {
  let handler: AuthHandler | undefined;
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: initialSession }, error: null }),
      onAuthStateChange: (cb: AuthHandler) => {
        handler = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => Promise.resolve({ error: null })
    },
    emit: (event: string, session: unknown) => handler?.(event, session)
  };
}

function Probe() {
  const { session, loading } = useSession();
  return <span data-testid="user">{loading ? 'loading' : (session?.user?.id ?? 'none')}</span>;
}

describe('useSession', () => {
  it('exposes the session, then clears it on sign-out', async () => {
    const fake = makeFakeClient({ user: { id: 'u1' } });
    render(
      <CoreProvider client={fake as unknown as AppSupabaseClient} queryClient={createQueryClient()}>
        <Probe />
      </CoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('u1');
    });

    await act(async () => {
      fake.emit('SIGNED_OUT', null);
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });
});
