import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useQuery } from '@aca/core';
import { useLocale } from '@aca/i18n';
import { Button, Card, Input, Screen, Text, YStack } from '@aca/ui';

import { searchMovies, type MovieResult } from './lib/tmdb';

/**
 * Search TMDB and list results in the configured language. Adding a result to the
 * shared watchlist arrives in a later slice — this screen is search + display only.
 */
export function SearchScreen() {
  const router = useRouter();
  const { t, language } = useLocale();
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tmdb', 'search', language, query],
    queryFn: ({ signal }) => searchMovies({ query, language, signal }),
    enabled: query.length > 0
  });

  const submit = () => setQuery(term.trim());

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
      <Results query={query} isLoading={isLoading} isError={isError} results={data} />
    </Screen>
  );
}

function Results({
  query,
  isLoading,
  isError,
  results
}: {
  query: string;
  isLoading: boolean;
  isError: boolean;
  results: MovieResult[] | undefined;
}) {
  const { t } = useLocale();
  if (query.length === 0) return <Text color="$colorMuted">{t('searchPrompt')}</Text>;
  if (isLoading) return <Text color="$colorMuted">{t('loading')}</Text>;
  if (isError) return <Text color="$colorMuted">{t('searchError')}</Text>;
  if (!results || results.length === 0) return <Text color="$colorMuted">{t('noResults')}</Text>;
  return (
    <YStack gap="$2">
      {results.map((movie) => (
        <MovieRow key={movie.id} movie={movie} />
      ))}
    </YStack>
  );
}

function MovieRow({ movie }: { movie: MovieResult }) {
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
  return (
    <Card>
      <Text fontWeight="600">{year ? `${movie.title} (${year})` : movie.title}</Text>
      {movie.voteAverage > 0 ? (
        <Text color="$colorMuted">{`★ ${movie.voteAverage.toFixed(1)}`}</Text>
      ) : null}
      {movie.overview ? (
        <Text color="$colorMuted" numberOfLines={3}>
          {movie.overview}
        </Text>
      ) : null}
    </Card>
  );
}
