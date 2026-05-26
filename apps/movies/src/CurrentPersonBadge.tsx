import { useCurrentPerson } from '@aca/core';
import { Text, XStack, YStack } from '@aca/ui';

import { useMoviesLocale } from './i18n';

/**
 * Shows who is currently using the app (name + a dot in their accent color) on every screen. The
 * dot uses `$primary`, which the person's color already re-skinned, so it matches their theme.
 */
export function CurrentPersonBadge() {
  const { person } = useCurrentPerson();
  const { t } = useMoviesLocale();
  if (!person) return null;
  return (
    <XStack
      accessible
      gap="$2"
      alignItems="center"
      paddingHorizontal="$4"
      paddingTop="$3"
      accessibilityLabel={t('youArePerson', { name: person.displayName })}
    >
      {/* Decorative dot + name are grouped under the XStack's a11y label (accessible above). */}
      <YStack width={10} height={10} borderRadius={5} backgroundColor="$primary" />
      <Text fontWeight="600">{person.displayName}</Text>
    </XStack>
  );
}
