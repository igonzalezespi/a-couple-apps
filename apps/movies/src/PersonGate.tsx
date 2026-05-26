import { type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCurrentPerson } from '@aca/core';
import { Button, Card, Screen, Text, YStack } from '@aca/ui';

import { CurrentPersonBadge } from './CurrentPersonBadge';
import { useMoviesLocale } from './i18n';

/**
 * No login: pick which member of the couple is using this device. The choice is persisted and
 * switchable (the app is built for one couple with their own backend, so identity is a local
 * choice, not an account). Shows the picker until someone is chosen, then renders the app.
 */
export function PersonGate({ children }: { children: ReactNode }) {
  const { person, people, loading, setPerson } = useCurrentPerson();
  const { t } = useMoviesLocale();

  if (loading) {
    return (
      <Screen justifyContent="center" alignItems="center">
        <Text color="$colorMuted">{t('loading')}</Text>
      </Screen>
    );
  }

  if (!person) {
    return (
      <Screen justifyContent="center">
        <Text fontSize="$7" fontWeight="700">
          {t('appName')}
        </Text>
        <Card>
          <Text fontWeight="600">{t('whoAreYou')}</Text>
          <YStack gap="$2">
            {people.map((p) => (
              <Button key={p.id} onPress={() => setPerson(p.id)}>
                <Text color="$onPrimary">{p.displayName}</Text>
              </Button>
            ))}
          </YStack>
        </Card>
      </Screen>
    );
  }

  // Once someone is selected, show a persistent identity badge above every screen. SafeAreaView
  // keeps the badge clear of the status bar / notch on native (no-op padding on web).
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <CurrentPersonBadge />
      <YStack flex={1}>{children}</YStack>
    </SafeAreaView>
  );
}
