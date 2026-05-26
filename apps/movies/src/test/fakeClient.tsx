import { render, type RenderResult } from '@testing-library/react';
import { type ReactElement } from 'react';

import { type Language } from '@aca/config';
import {
  CoreProvider,
  createQueryClient,
  PersonProvider,
  type AppSupabaseClient,
  type PersonStorage
} from '@aca/core';
import { I18nProvider } from '@aca/i18n';
import { UIProvider } from '@aca/ui';

import { createMoviesI18n } from '../i18n';

/**
 * A minimal Supabase client stand-in. There is no auth anymore, and component tests mock the
 * data hooks, so the client is only ever passed through the provider. Accepts (and ignores) an
 * argument so older call sites still compile.
 */
export function makeFakeClient(_unused?: unknown) {
  return { client: {} as unknown as AppSupabaseClient };
}

/** People offered by the test PersonProvider (couple.config stand-in). */
export const TEST_PEOPLE = [
  { id: 'personA', displayName: 'Alex' },
  { id: 'personB', displayName: 'Sam' }
] as const;

function memoryStorage(initial: string | null): PersonStorage {
  let value = initial;
  return {
    getItem: () => Promise.resolve(value),
    setItem: (_key, v) => {
      value = v;
      return Promise.resolve();
    },
    removeItem: () => {
      value = null;
      return Promise.resolve();
    }
  };
}

/**
 * Render `ui` inside the app's real providers (UI + i18n + person + core). `currentPersonId`
 * pre-selects who you are (defaults to personA); pass null to render the picker/unselected state.
 */
export function renderWithProviders(
  ui: ReactElement,
  client: AppSupabaseClient,
  language: Language = 'en',
  queryClient = createQueryClient(),
  currentPersonId: string | null = 'personA'
): RenderResult {
  return render(
    <UIProvider>
      <I18nProvider i18n={createMoviesI18n(language)}>
        <PersonProvider people={TEST_PEOPLE} storage={memoryStorage(currentPersonId)}>
          <CoreProvider client={client} queryClient={queryClient}>
            {ui}
          </CoreProvider>
        </PersonProvider>
      </I18nProvider>
    </UIProvider>
  );
}
