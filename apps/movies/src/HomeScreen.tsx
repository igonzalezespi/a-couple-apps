import { getSharedConfig } from '@aca/config';
import { signOut, useSupabase } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Button, Card, Screen, Text } from '@aca/ui';

import coupleConfig from '../../../couple.config';

const [personA, personB] = getSharedConfig(coupleConfig).people;

/** Authenticated home: renders from @aca/ui + @aca/i18n + @aca/config, and can sign out. */
export function HomeScreen() {
  const { t, language, setLanguage } = useLocale();
  const client = useSupabase();
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
      <Button onPress={() => void setLanguage(language === 'en' ? 'es' : 'en')}>
        <Text color="$onPrimary">
          {t('language')}: {language}
        </Text>
      </Button>
      <Button tone="neutral" onPress={() => void signOut(client)}>
        <Text>{t('signOut')}</Text>
      </Button>
    </Screen>
  );
}
