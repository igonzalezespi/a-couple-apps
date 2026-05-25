import { useRouter } from 'expo-router';

import { getSharedConfig } from '@aca/config';
import { useCurrentPerson } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Button, Card, Screen, Text } from '@aca/ui';

import coupleConfig from '../../../couple.config';
import { Watchlist } from './Watchlist';

const [personA, personB] = getSharedConfig(coupleConfig).people;

/** The couple's home: renders from @aca/ui + @aca/i18n + @aca/config; switch which person you are. */
export function HomeScreen() {
  const { t, language, setLanguage } = useLocale();
  const { person, clearPerson } = useCurrentPerson();
  const router = useRouter();
  return (
    <Screen>
      <Text fontSize="$7" fontWeight="700">
        {t('appName')}
      </Text>
      <Card>
        <Text fontWeight="600">{t('movies')}</Text>
        <Text color="$colorMuted">
          {personA.displayName} &amp; {personB.displayName}
        </Text>
      </Card>
      <Button onPress={() => router.push('/search')}>
        <Text color="$onPrimary">{t('search')}</Text>
      </Button>
      <Text fontWeight="700">{t('watchlist')}</Text>
      <Watchlist />
      {person ? (
        <Text color="$colorMuted">{t('youArePerson', { name: person.displayName })}</Text>
      ) : null}
      <Button tone="neutral" onPress={() => clearPerson()}>
        <Text>{t('switchPerson')}</Text>
      </Button>
      {/* Settings-ish controls are secondary: a language switch is a setup preference, not a
          weekly action, so it sits last and quiet (a real settings screen lands later). */}
      <Button tone="neutral" onPress={() => void setLanguage(language === 'en' ? 'es' : 'en')}>
        <Text color="$colorMuted">
          {t('language')}: {t(language === 'en' ? 'english' : 'spanish')}
        </Text>
      </Button>
    </Screen>
  );
}
