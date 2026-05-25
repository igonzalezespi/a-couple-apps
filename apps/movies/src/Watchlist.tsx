import { useRouter } from 'expo-router';

import { useSession } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Button, Card, Image, Text, XStack, YStack } from '@aca/ui';

import {
  useRemoveFromWatchlist,
  useSetWatched,
  useWatchlist,
  useWatchlistRealtime
} from './hooks/useWatchlist';
import { posterUrl } from './lib/tmdb';
import { type WatchlistItem } from './lib/watchlist';

/**
 * The shared watchlist. Split into "to watch" (the working list a couple picks from) and
 * "watched" (history), with per-item attribution so each partner sees who suggested what.
 */
export function Watchlist() {
  const { t } = useLocale();
  const router = useRouter();
  const { session } = useSession();
  useWatchlistRealtime();
  const { data, isLoading, isError } = useWatchlist();
  const setWatched = useSetWatched();
  const remove = useRemoveFromWatchlist();

  if (isLoading) return <Text color="$colorMuted">{t('loading')}</Text>;
  if (isError) return <Text color="$colorMuted">{t('searchError')}</Text>;
  if (!data || data.length === 0) {
    return (
      <YStack gap="$3">
        <Text color="$colorMuted">{t('watchlistEmpty')}</Text>
        <Button onPress={() => router.push('/search')}>
          <Text color="$onPrimary">{t('addFirstMovie')}</Text>
        </Button>
      </YStack>
    );
  }

  const currentUserId = session?.user?.id;
  const toWatch = data.filter((item) => !item.watched);
  const watched = data.filter((item) => item.watched);

  const renderRow = (item: WatchlistItem) => (
    <WatchlistRow
      key={item.id}
      item={item}
      addedByYou={currentUserId != null && item.added_by === currentUserId}
      onToggleWatched={() => setWatched.mutate({ id: item.id, watched: !item.watched })}
      onRemove={() => remove.mutate(item.id)}
    />
  );

  return (
    <YStack gap="$3">
      {toWatch.length > 0 ? (
        <YStack gap="$2">
          <Text fontWeight="700" color="$colorMuted">
            {t('toWatch')}
          </Text>
          {toWatch.map(renderRow)}
        </YStack>
      ) : null}
      {watched.length > 0 ? (
        <YStack gap="$2">
          <Text fontWeight="700" color="$colorMuted">
            {t('watched')}
          </Text>
          {watched.map(renderRow)}
        </YStack>
      ) : null}
    </YStack>
  );
}

function WatchlistRow({
  item,
  addedByYou,
  onToggleWatched,
  onRemove
}: {
  item: WatchlistItem;
  addedByYou: boolean;
  onToggleWatched: () => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const year = item.release_date ? item.release_date.slice(0, 4) : null;
  const poster = posterUrl(item.poster_path);
  return (
    <Card>
      <XStack gap="$3">
        {poster ? (
          <Image
            source={{ uri: poster }}
            width={46}
            height={69}
            accessibilityLabel={t('poster', { title: item.title })}
          />
        ) : null}
        <YStack flex={1} gap="$2">
          <Text fontWeight="600">{year ? `${item.title} (${year})` : item.title}</Text>
          <Text color="$colorMuted" fontSize="$2">
            {addedByYou ? t('addedByYou') : t('addedByPartner')}
          </Text>
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
