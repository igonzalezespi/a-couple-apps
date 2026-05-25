import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchScreen } from './SearchScreen';
import { makeFakeClient, renderWithProviders } from './test/fakeClient';

/** QueryClient with retries disabled — lets query error state settle in a single attempt. */
function noRetryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}));

const h = vi.hoisted(() => ({
  add: vi.fn(),
  addState: { isError: false, error: null as unknown },
  watchlist: [] as Array<{ tmdb_id: number }>
}));
vi.mock('./hooks/useWatchlist', () => ({
  useAddToWatchlist: () => ({
    mutate: h.add,
    isError: h.addState.isError,
    error: h.addState.error
  }),
  useWatchlist: () => ({ data: h.watchlist })
}));

const SAMPLE = {
  results: [
    {
      id: 603,
      title: 'The Matrix',
      overview: 'A hacker discovers reality is a simulation.',
      release_date: '1999-03-31',
      poster_path: '/abc.jpg',
      vote_average: 8.2
    }
  ]
};

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SAMPLE)
      } as unknown as Response)
    )
  );
}

describe('SearchScreen', () => {
  beforeEach(() => {
    h.addState = { isError: false, error: null };
    h.watchlist = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    h.add.mockClear();
  });

  it('searches TMDB on submit and lists results', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    stubFetch();

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'matrix' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('The Matrix (1999)')).toBeTruthy();
  });

  it('adds a search result to the watchlist', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    stubFetch();

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'matrix' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));

    expect(h.add).toHaveBeenCalledWith({
      tmdb_id: 603,
      title: 'The Matrix',
      poster_path: '/abc.jpg',
      release_date: '1999-03-31'
    });
  });

  it('shows results already on the watchlist as added, not addable', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    stubFetch();
    h.watchlist = [{ tmdb_id: 603 }];

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'matrix' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('button', { name: 'Added' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  });

  it('surfaces a duplicate-add error as a friendly message', () => {
    h.addState = { isError: true, error: { code: '23505' } };

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    expect(screen.getByText('Already on your watchlist.')).toBeTruthy();
  });

  it('shows the loading indicator while the search query is in flight', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    // Never resolves: query stays in-flight so isLoading stays true.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'matrix' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Loading...')).toBeTruthy();
  });

  it('shows no-results text when the search returns an empty list', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results: [] })
        } as unknown as Response)
      )
    );

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'xyzxyzxyz' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('No results.')).toBeTruthy();
  });

  it('shows the error state when the search query fails', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({})
        } as unknown as Response)
      )
    );

    // Disable retries so the error state settles without the backoff delay.
    renderWithProviders(<SearchScreen />, makeFakeClient().client, 'en', noRetryClient());

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'matrix' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  });

  it('shows the generic error for a non-23505 add failure', () => {
    h.addState = { isError: true, error: { code: '00000' } };

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    expect(screen.getByText('Something went wrong. Try again.')).toBeTruthy();
    expect(screen.queryByText('Already on your watchlist.')).toBeNull();
  });
});
