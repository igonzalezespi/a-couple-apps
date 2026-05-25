import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchScreen } from './SearchScreen';
import { makeFakeClient, renderWithProviders } from './test/fakeClient';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}));

const h = vi.hoisted(() => ({ add: vi.fn() }));
vi.mock('./hooks/useWatchlist', () => ({
  useAddToWatchlist: () => ({ mutate: h.add })
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
});
