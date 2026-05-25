import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeFakeClient, renderWithProviders } from './test/fakeClient';
import { Watchlist } from './Watchlist';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}));

const h = vi.hoisted(() => ({
  result: { data: [] as unknown[] | undefined, isLoading: false, isError: false },
  setWatched: vi.fn(),
  remove: vi.fn()
}));

vi.mock('./hooks/useWatchlist', () => ({
  useWatchlist: () => h.result,
  useSetWatched: () => ({ mutate: h.setWatched }),
  useRemoveFromWatchlist: () => ({ mutate: h.remove }),
  useWatchlistRealtime: () => {}
}));

const ITEMS = [
  {
    id: 'id-0',
    tmdb_id: 603,
    title: 'The Matrix',
    poster_path: '/m.jpg',
    release_date: '1999-03-31',
    watched: false,
    added_by: 'u',
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: 'id-1',
    tmdb_id: 604,
    title: 'John Wick',
    poster_path: null,
    release_date: '2014-10-24',
    watched: true,
    added_by: 'u',
    created_at: '2024-01-01T00:00:00Z'
  }
];

const renderWatchlist = () => renderWithProviders(<Watchlist />, makeFakeClient().client);

describe('Watchlist', () => {
  beforeEach(() => {
    h.result = { data: ITEMS, isLoading: false, isError: false };
    h.setWatched.mockClear();
    h.remove.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the watchlist items with their release year', () => {
    renderWatchlist();

    expect(screen.getByText('The Matrix (1999)')).toBeTruthy();
    expect(screen.getByText('John Wick (2014)')).toBeTruthy();
  });

  it('toggles an unwatched item to watched', () => {
    renderWatchlist();

    fireEvent.click(screen.getByRole('button', { name: 'Mark watched' }));

    expect(h.setWatched).toHaveBeenCalledWith({ id: 'id-0', watched: true });
  });

  it('removes an item', () => {
    renderWatchlist();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);

    expect(h.remove).toHaveBeenCalledWith('id-0');
  });

  it('shows an empty state with a call to action when there are no items', () => {
    h.result = { data: [], isLoading: false, isError: false };
    renderWatchlist();

    expect(
      screen.getByText("Nothing here yet. Add a movie you'd like to watch together.")
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search for a movie' })).toBeTruthy();
  });

  it('splits items into a to-watch section', () => {
    renderWatchlist();

    expect(screen.getByText('To watch')).toBeTruthy();
  });

  it('attributes an item to you when your session added it', async () => {
    renderWithProviders(<Watchlist />, makeFakeClient({ user: { id: 'u' } }).client);

    // useSession resolves the session asynchronously, so wait for the attribution.
    expect((await screen.findAllByText('Added by you')).length).toBeGreaterThan(0);
  });

  it('shows the loading state when data is still being fetched', () => {
    h.result = { data: undefined, isLoading: true, isError: false };
    renderWatchlist();

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows an error state when the watchlist query fails', () => {
    h.result = { data: undefined, isLoading: false, isError: true };
    renderWatchlist();

    expect(screen.getByText('Something went wrong. Try again.')).toBeTruthy();
  });
});
