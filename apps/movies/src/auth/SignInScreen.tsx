import { useState } from 'react';

import { useSupabase } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Button, Card, Input, Screen, Text } from '@aca/ui';

type Step = 'email' | 'code';

/**
 * Passwordless email-OTP sign-in (Supabase, per design D4). Step 1 emails a code;
 * step 2 verifies it. On success the gate's `useSession` flips to the app, so this
 * screen has nothing to do after a valid code.
 */
export function SignInScreen() {
  const client = useSupabase();
  const { t } = useLocale();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map auth failures to a friendly localized message rather than leaking raw Supabase
  // strings (which are user-enumeration signals). 429 is a rate-limit throttle, safe to name.
  function authErrorMessage(status: number | undefined): string {
    return status === 429 ? t('tooManyRequests') : t('authError');
  }

  async function sendCode() {
    setPending(true);
    setError(null);
    // try/finally so a thrown network error (offline/CORS/timeout) cannot leave `pending`
    // stuck true, which would disable the button until reload.
    try {
      const { error: otpError } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });
      if (otpError) {
        setError(authErrorMessage(otpError.status));
        return;
      }
      setStep('code');
    } catch {
      setError(t('authError'));
    } finally {
      setPending(false);
    }
  }

  async function verify() {
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await client.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });
      if (verifyError) setError(authErrorMessage(verifyError.status));
    } catch {
      setError(t('authError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen justifyContent="center">
      <Text fontSize="$7" fontWeight="700">
        {t('appName')}
      </Text>
      <Card>
        <Text fontWeight="600">{t('signIn')}</Text>

        {step === 'email' ? (
          <>
            <Text color="$colorMuted">{t('signInPrompt')}</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={t('emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              aria-label={t('email')}
            />
            <Button disabled={pending || email.length === 0} onPress={() => void sendCode()}>
              <Text color="$onPrimary">{t('sendCode')}</Text>
            </Button>
          </>
        ) : (
          <>
            <Text color="$colorMuted">{t('codePrompt', { email })}</Text>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={t('codePlaceholder')}
              keyboardType="number-pad"
              aria-label={t('code')}
            />
            <Button disabled={pending || code.length === 0} onPress={() => void verify()}>
              <Text color="$onPrimary">{t('verify')}</Text>
            </Button>
            <Button tone="neutral" onPress={() => setStep('email')}>
              <Text>{t('back')}</Text>
            </Button>
          </>
        )}

        {error ? <Text color="$colorMuted">{error}</Text> : null}
      </Card>
    </Screen>
  );
}
