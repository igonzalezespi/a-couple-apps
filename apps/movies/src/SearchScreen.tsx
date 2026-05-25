import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useQuery } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Button, Card, Image, Input, Screen, Text, XStack, YStack } from '@aca/ui';

import { useAddToWatchlist, useWatchlist } from './hooks/useWatchlist';
import { posterUrl, searchMovies, type MovieResult } from './lib/tmdb';
import { type NewWatchlistItem } from './lib/watchlist';

// Postgres unique_violation: the movie is already on the shared list (see the
// watchlist_items_tmdb_id_key index). Surfaced to the user as a friendly message.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

/** Search TMDB in the configured language; add a result to the shared watchlist. */
export function SearchScreen() {
  const router = useRouter();
  const { t, language } = useLocale();
  const add = useAddToWatchlist();
  const { data: watchlist } = useWatchlist();
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tmdb', 'search', language, query],
    queryFn: ({ signal }) => searchMovies({ query, language, signal }),
    enabled: query.length > 0
  });

  const submit = () => setQuery(term.trim());

  // Movies already on the shared list: render them as added (disabled) rather than
  // letting a second add hit the unique index and fail.
  const onWatchlist = new Set((watchlist ?? []).map((item) => item.tmdb_id));
  const addError = add.isError
    ? isUniqueViolation(add.error)
      ? t('alreadyOnWatchlist')
      : t('searchError')
    : null;

  return (
    <Screen>
      <Button tone="neutral" onPress={() => router.back()}>
        <Text>{t('back')}</Text>
      </Button>
      <Text fontSize="$7" fontWeight="700">
        {t('search')}
      </Text>
      <Input
        value={term}
        onChangeText={setTerm}
        onSubmitEditing={submit}
        placeholder={t('searchPlaceholder')}
        autoCapitalize="none"
        returnKeyType="search"
        aria-label={t('search')}
      />
      <Button disabled={term.trim().length === 0} onPress={submit}>
        <Text color="$onPrimary">{t('search')}</Text>
      </Button>
      {addError ? <Text color="$colorMuted">{addError}</Text> : null}
      <Results
        query={query}
        isLoading={isLoading}
        isError={isError}
        results={data}
        onWatchlist={onWatchlist}
        onAdd={(movie) => add.mutate(toNewItem(movie))}
      />
    </Screen>
  );
}

function toNewItem(movie: MovieResult): NewWatchlistItem {
  return {
    tmdb_id: movie.id,
    title: movie.title,
    poster_path: movie.posterPath,
    release_date: movie.releaseDate || null
  };
}

function Results({
  query,
  isLoading,
  isError,
  results,
  onWatchlist,
  onAdd
}: {
  query: string;
  isLoading: boolean;
  isError: boolean;
  results: MovieResult[] | undefined;
  onWatchlist: Set<number>;
  onAdd: (movie: MovieResult) => void;
}) {
  const { t } = useLocale();
  if (query.length === 0) return <Text color="$colorMuted">{t('searchPrompt')}</Text>;
  if (isLoading) return <Text color="$colorMuted">{t('loading')}</Text>;
  if (isError) return <Text color="$colorMuted">{t('searchError')}</Text>;
  if (!results || results.length === 0) return <Text color="$colorMuted">{t('noResults')}</Text>;
  return (
    <YStack gap="$2">
      {results.map((movie) => (
        <MovieRow key={movie.id} movie={movie} added={onWatchlist.has(movie.id)} onAdd={onAdd} />
      ))}
    </YStack>
  );
}

function MovieRow({
  movie,
  added,
  onAdd
}: {
  movie: MovieResult;
  added: boolean;
  onAdd: (movie: MovieResult) => void;
}) {
  const { t } = useLocale();
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
  const poster = posterUrl(movie.posterPath);
  return (
    <Card>
      <XStack gap="$3">
        {poster ? (
          <Image
            source={{ uri: poster }}
            width={46}
            height={69}
            accessibilityLabel={t('poster', { title: movie.title })}
          />
        ) : null}
        <YStack flex={1} gap="$2">
          <Text fontWeight="600">{year ? `${movie.title} (${year})` : movie.title}</Text>
          {movie.voteAverage > 0 ? (
            <Text color="$colorMuted">{`${movie.voteAverage.toFixed(1)}/10`}</Text>
          ) : null}
          {movie.overview ? (
            <Text color="$colorMuted" numberOfLines={3}>
              {movie.overview}
            </Text>
          ) : null}
          <Button
            tone={added ? 'neutral' : 'primary'}
            disabled={added}
            onPress={added ? undefined : () => onAdd(movie)}
          >
            <Text color={added ? '$color' : '$onPrimary'}>{added ? t('added') : t('add')}</Text>
          </Button>
        </YStack>
      </XStack>
    </Card>
  );
}
