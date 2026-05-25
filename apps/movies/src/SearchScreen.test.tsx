import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchScreen } from './SearchScreen';
import { makeFakeClient, renderWithProviders } from './test/fakeClient';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
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

describe('SearchScreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('searches TMDB on submit and lists results', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SAMPLE)
      } as unknown as Response)
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<SearchScreen />, makeFakeClient().client);

    fireEvent.change(screen.getByPlaceholderText('Search movies'), {
      target: { value: 'matrix' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('The Matrix (1999)')).toBeTruthy();
  });
});
