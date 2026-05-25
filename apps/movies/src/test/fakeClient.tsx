import { render, type RenderResult } from '@testing-library/react';
import { type ReactElement } from 'react';
import { vi } from 'vitest';

import { type Language } from '@aca/config';
import { CoreProvider, createQueryClient, type AppSupabaseClient } from '@aca/core';
import { createI18n, I18nProvider } from '@aca/i18n';
import { UIProvider } from '@aca/ui';

type AuthHandler = (event: string, session: unknown) => void;

/**
 * A minimal in-memory fake of the Supabase client for auth/gate tests; no network.
 * `emit` drives `onAuthStateChange` (e.g. sign-out); the auth methods are spies so
 * tests can assert calls.
 */
export function makeFakeClient(initialSession: unknown = null) {
  let handler: AuthHandler | undefined;
  const signInWithOtp = vi.fn(() => Promise.resolve({ data: {}, error: null }));
  const verifyOtp = vi.fn(() => Promise.resolve({ data: {}, error: null }));
  const signOut = vi.fn(() => Promise.resolve({ error: null }));
  const auth = {
    getSession: () => Promise.resolve({ data: { session: initialSession }, error: null }),
    onAuthStateChange: (cb: AuthHandler) => {
      handler = cb;
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithOtp,
    verifyOtp,
    signOut
  };
  return {
    client: { auth } as unknown as AppSupabaseClient,
    emit: (event: string, session: unknown) => handler?.(event, session),
    signInWithOtp,
    verifyOtp,
    signOut
  };
}

/** Render `ui` inside the app's real providers (UI + i18n + core), backed by `client`. */
export function renderWithProviders(
  ui: ReactElement,
  client: AppSupabaseClient,
  language: Language = 'en'
): RenderResult {
  return render(
    <UIProvider>
      <I18nProvider i18n={createI18n(language)}>
        <CoreProvider client={client} queryClient={createQueryClient()}>
          {ui}
        </CoreProvider>
      </I18nProvider>
    </UIProvider>
  );
}
