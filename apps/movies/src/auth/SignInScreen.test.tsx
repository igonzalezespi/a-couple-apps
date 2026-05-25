import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeFakeClient, renderWithProviders } from '../test/fakeClient';
import { SignInScreen } from './SignInScreen';

const EMAIL = 'couple@example.com';

/** Advance the UI to the code-entry step and return the fake client. */
async function advanceToCodeStep() {
  const fake = makeFakeClient(null);
  renderWithProviders(<SignInScreen />, fake.client);

  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: EMAIL }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeTruthy());
  return fake;
}

describe('SignInScreen', () => {
  it('sends an OTP for the entered email, then advances to the code step', async () => {
    const fake = makeFakeClient(null);
    renderWithProviders(<SignInScreen />, fake.client);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: EMAIL }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() => expect(fake.signInWithOtp).toHaveBeenCalledTimes(1));
    expect(fake.signInWithOtp).toHaveBeenCalledWith({
      email: EMAIL,
      options: { shouldCreateUser: true }
    });

    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Verify' })).toBeTruthy();
  });

  it('calls verifyOtp with email, token, and type email when Verify is clicked', async () => {
    const fake = await advanceToCodeStep();

    fireEvent.change(screen.getByPlaceholderText('123456'), {
      target: { value: '654321' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(fake.verifyOtp).toHaveBeenCalledTimes(1));
    expect(fake.verifyOtp).toHaveBeenCalledWith({
      email: EMAIL,
      token: '654321',
      type: 'email'
    });
  });

  it('shows the rate-limit message when sendCode fails with status 429', async () => {
    const fake = makeFakeClient(null);
    fake.signInWithOtp.mockResolvedValue({ data: {}, error: { status: 429, message: 'rate' } });
    renderWithProviders(<SignInScreen />, fake.client);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: EMAIL }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() =>
      expect(screen.getByText('Too many attempts. Wait a minute and try again.')).toBeTruthy()
    );
    // Still on the email step — did not advance.
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('shows the generic auth error when sendCode fails with a non-429 status', async () => {
    const fake = makeFakeClient(null);
    fake.signInWithOtp.mockResolvedValue({ data: {}, error: { status: 500, message: 'oops' } });
    renderWithProviders(<SignInScreen />, fake.client);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: EMAIL }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

    await waitFor(() =>
      expect(screen.getByText('Could not sign in. Please try again.')).toBeTruthy()
    );
  });

  it('shows the rate-limit message when verifyOtp fails with status 429', async () => {
    const fake = await advanceToCodeStep();
    fake.verifyOtp.mockResolvedValue({ data: {}, error: { status: 429, message: 'rate' } });

    fireEvent.change(screen.getByPlaceholderText('123456'), {
      target: { value: '000000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(screen.getByText('Too many attempts. Wait a minute and try again.')).toBeTruthy()
    );
  });

  it('shows the generic auth error when verifyOtp fails with a non-429 status', async () => {
    const fake = await advanceToCodeStep();
    fake.verifyOtp.mockResolvedValue({ data: {}, error: { status: 401, message: 'bad token' } });

    fireEvent.change(screen.getByPlaceholderText('123456'), {
      target: { value: '000000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(screen.getByText('Could not sign in. Please try again.')).toBeTruthy()
    );
  });
});
