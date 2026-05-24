import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeFakeClient, renderWithProviders } from '../test/fakeClient';
import { SignInScreen } from './SignInScreen';

describe('SignInScreen', () => {
  it('sends an OTP for the entered email, then advances to the code step', async () => {
    const fake = makeFakeClient(null);
    renderWithProviders(<SignInScreen />, fake.client);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'couple@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => expect(fake.signInWithOtp).toHaveBeenCalledTimes(1));
    expect(fake.signInWithOtp).toHaveBeenCalledWith({
      email: 'couple@example.com',
      options: { shouldCreateUser: true }
    });

    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Verify' })).toBeTruthy();
  });
});
