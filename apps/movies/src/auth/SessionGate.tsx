import { type ReactNode } from 'react';

import { useSession } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Screen, Text } from '@aca/ui';

import { SignInScreen } from './SignInScreen';

/**
 * Auth gate (spec: "Authenticated access"). While the session hydrates, show a
 * loading state; with no session, sign-in; once authenticated, the app. Sign-in
 * and sign-out propagate through `useSession` (`onAuthStateChange`), so this
 * re-renders without any manual navigation.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const { t } = useLocale();

  if (loading) {
    return (
      <Screen justifyContent="center" alignItems="center">
        <Text color="$colorMuted">{t('loading')}</Text>
      </Screen>
    );
  }
  if (!session) return <SignInScreen />;
  return <>{children}</>;
}
