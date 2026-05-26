import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CurrentPersonBadge } from './CurrentPersonBadge';
import { makeFakeClient, renderWithProviders } from './test/fakeClient';

describe('CurrentPersonBadge', () => {
  it('shows the current person name', async () => {
    renderWithProviders(<CurrentPersonBadge />, makeFakeClient().client); // current person = personA (Alex)

    // The selected person loads asynchronously from storage.
    expect(await screen.findByText('Alex')).toBeTruthy();
  });

  it('renders nothing when no person is selected', () => {
    renderWithProviders(<CurrentPersonBadge />, makeFakeClient().client, 'en', undefined, null);

    expect(screen.queryByText('Alex')).toBeNull();
    expect(screen.queryByText('Sam')).toBeNull();
  });
});
