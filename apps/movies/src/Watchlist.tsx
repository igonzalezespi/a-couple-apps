import { useLocale } from '@aca/i18n';
import { Button, Card, Image, Text, XStack, YStack } from '@aca/ui';

import { useRemoveFromWatchlist, useSetWatched, useWatchlist } from './hooks/useWatchlist';
import { posterUrl } from './lib/tmdb';
import { type WatchlistItem } from './lib/watchlist';

/** The shared watchlist: poster, title, watched toggle, remove. Realtime sync lands next slice. */
export function Watchlist() {
  const { t } = useLocale();
  const { data, isLoading, isError } = useWatchlist();
  const setWatched = useSetWatched();
  const remove = useRemoveFromWatchlist();

  if (isLoading) return <Text color="$colorMuted">{t('loading')}</Text>;
  if (isError) return <Text color="$colorMuted">{t('searchError')}</Text>;
  if (!data || data.length === 0) return <Text color="$colorMuted">{t('watchlistEmpty')}</Text>;

  return (
    <YStack gap="$2">
      {data.map((item) => (
        <WatchlistRow
          key={item.id}
          item={item}
          onToggleWatched={() => setWatched.mutate({ id: item.id, watched: !item.watched })}
          onRemove={() => remove.mutate(item.id)}
        />
      ))}
    </YStack>
  );
}

function WatchlistRow({
  item,
  onToggleWatched,
  onRemove
}: {
  item: WatchlistItem;
  onToggleWatched: () => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const year = item.release_date ? item.release_date.slice(0, 4) : null;
  const poster = posterUrl(item.poster_path);
  return (
    <Card>
      <XStack gap="$3">
        {poster ? <Image source={{ uri: poster }} width={46} height={69} /> : null}
        <YStack flex={1} gap="$2">
          <Text fontWeight="600">{year ? `${item.title} (${year})` : item.title}</Text>
          <XStack gap="$2">
            <Button tone={item.watched ? 'primary' : 'neutral'} onPress={onToggleWatched}>
              <Text color={item.watched ? '$onPrimary' : '$color'}>
                {item.watched ? t('watched') : t('markWatched')}
              </Text>
            </Button>
            <Button tone="neutral" onPress={onRemove}>
              <Text>{t('remove')}</Text>
            </Button>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
