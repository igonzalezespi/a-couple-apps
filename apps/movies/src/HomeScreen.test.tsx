import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeScreen } from './HomeScreen';
import { makeFakeClient, renderWithProviders } from './test/fakeClient';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}));

describe('HomeScreen', () => {
  it('renders localized strings + a sign-out action from the shared packages', () => {
    renderWithProviders(<HomeScreen />, makeFakeClient({ user: { id: 'u1' } }).client);

    expect(screen.getByText('A Couple Apps')).toBeTruthy();
    expect(screen.getByText('Movies')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy();
  });
});
