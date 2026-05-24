import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text } from '@aca/ui';

import { makeFakeClient, renderWithProviders } from '../test/fakeClient';
import { SessionGate } from './SessionGate';

const APP = 'AUTHED_APP_CONTENT';

const gate = (
  <SessionGate>
    <Text>{APP}</Text>
  </SessionGate>
);

describe('SessionGate', () => {
  it('shows sign-in, not the app, when there is no session', async () => {
    renderWithProviders(gate, makeFakeClient(null).client);

    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy());
    expect(screen.queryByText(APP)).toBeNull();
  });

  it('shows the app when authenticated', async () => {
    renderWithProviders(gate, makeFakeClient({ user: { id: 'u1' } }).client);

    await waitFor(() => expect(screen.getByText(APP)).toBeTruthy());
  });

  it('returns to sign-in after sign-out', async () => {
    const fake = makeFakeClient({ user: { id: 'u1' } });
    renderWithProviders(gate, fake.client);
    await waitFor(() => expect(screen.getByText(APP)).toBeTruthy());

    await act(async () => {
      fake.emit('SIGNED_OUT', null);
    });

    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy());
    expect(screen.queryByText(APP)).toBeNull();
  });
});
