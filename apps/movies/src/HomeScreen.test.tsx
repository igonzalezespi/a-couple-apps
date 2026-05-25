import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeScreen } from './HomeScreen';
import { makeFakeClient, renderWithProviders } from './test/fakeClient';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}));

// HomeScreen now embeds <Watchlist/>; stub its data hooks so this test stays focused on
// the home chrome (the watchlist itself is covered in Watchlist.test.tsx).
vi.mock('./hooks/useWatchlist', () => ({
  useWatchlist: () => ({ data: [], isLoading: false, isError: false }),
  useSetWatched: () => ({ mutate: vi.fn() }),
  useRemoveFromWatchlist: () => ({ mutate: vi.fn() }),
  useWatchlistRealtime: () => {}
}));

describe('HomeScreen', () => {
  it('renders localized strings + a switch-person action from the shared packages', () => {
    renderWithProviders(<HomeScreen />, makeFakeClient().client);

    expect(screen.getByText('A Couple Apps')).toBeTruthy();
    expect(screen.getByText('Movies')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch person' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy();
  });

  it('renders Spanish strings when the language is es', () => {
    renderWithProviders(<HomeScreen />, makeFakeClient().client, 'es');

    expect(screen.getByText('Películas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cambiar de persona' })).toBeTruthy();
  });

  it('switches the visible strings when the language is toggled', async () => {
    renderWithProviders(<HomeScreen />, makeFakeClient().client);

    expect(screen.getByText('Movies')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Language:/ }));

    expect(await screen.findByText('Películas')).toBeTruthy();
    expect(screen.queryByText('Movies')).toBeNull();
  });
});
