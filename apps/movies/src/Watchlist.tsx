import { useRouter } from 'expo-router';

import { useCurrentPerson } from '@aca/core';
import { Button, Card, Image, Text, XStack, YStack } from '@aca/ui';

import {
  useRemoveFromWatchlist,
  useSetTonightPick,
  useSetWatched,
  useWatchlist,
  useWatchlistRealtime
} from './hooks/useWatchlist';
import { useMoviesLocale } from './i18n';
import { posterUrl } from './lib/tmdb';
import { type WatchlistItem } from './lib/watchlist';

/**
 * The shared watchlist. Split into "to watch" (the working list a couple picks from) and
 * "watched" (history), with per-item attribution. The shared "tonight's pick" floats to the top
 * (query order) with a distinct treatment; either partner can set or clear it.
 */
export function Watchlist() {
  const { t } = useMoviesLocale();
  const router = useRouter();
  const { person, people } = useCurrentPerson();
  useWatchlistRealtime();
  const { data, isLoading, isError } = useWatchlist();
  const setWatched = useSetWatched();
  const remove = useRemoveFromWatchlist();
  const setPick = useSetTonightPick();

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

  const nameById = new Map(people.map((p) => [p.id, p.displayName]));
  const toWatch = data.filter((item) => !item.watched);
  const watched = data.filter((item) => item.watched);

  const attributionFor = (item: WatchlistItem): string => {
    if (person != null && item.added_by === person.id) return t('addedByYou');
    const name = item.added_by != null ? nameById.get(item.added_by) : undefined;
    return name != null ? t('addedByName', { name }) : t('addedByPartner');
  };

  // Who set the pick, for the picked item's badge ("" if the id is unknown; picked_by is always
  // set for a picked row per the DB check, and is one of the couple.config people).
  const pickedByFor = (item: WatchlistItem): string => {
    if (person != null && item.picked_by === person.id) return t('pickedByYou');
    const name = item.picked_by != null ? nameById.get(item.picked_by) : undefined;
    return name != null ? t('pickedByName', { name }) : '';
  };

  const renderRow = (item: WatchlistItem) => (
    <WatchlistRow
      key={item.id}
      item={item}
      attribution={attributionFor(item)}
      isPick={item.picked_at != null}
      pickedBy={pickedByFor(item)}
      onToggleWatched={() => setWatched.mutate({ id: item.id, watched: !item.watched })}
      onRemove={() => remove.mutate(item.id)}
      onTogglePick={() => setPick.mutate({ id: item.id, pick: item.picked_at == null })}
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
  attribution,
  isPick,
  pickedBy,
  onToggleWatched,
  onRemove,
  onTogglePick
}: {
  item: WatchlistItem;
  attribution: string;
  isPick: boolean;
  pickedBy: string;
  onToggleWatched: () => void;
  onRemove: () => void;
  onTogglePick: () => void;
}) {
  const { t } = useMoviesLocale();
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
          {isPick ? (
            <Text fontWeight="700" color="$primary">
              {pickedBy ? `${t('tonightsPick')} - ${pickedBy}` : t('tonightsPick')}
            </Text>
          ) : null}
          <Text fontWeight="600">{year ? `${item.title} (${year})` : item.title}</Text>
          <Text color="$colorMuted" fontSize="$2">
            {attribution}
          </Text>
          <XStack gap="$2">
            <Button tone={item.watched ? 'primary' : 'neutral'} onPress={onToggleWatched}>
              <Text color={item.watched ? '$onPrimary' : '$color'}>
                {item.watched ? t('watched') : t('markWatched')}
              </Text>
            </Button>
            {!item.watched ? (
              <Button tone={isPick ? 'primary' : 'neutral'} onPress={onTogglePick}>
                <Text color={isPick ? '$onPrimary' : '$color'}>
                  {isPick ? t('clearPick') : t('pickForTonight')}
                </Text>
              </Button>
            ) : null}
            <Button tone="neutral" onPress={onRemove}>
              <Text>{t('remove')}</Text>
            </Button>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
