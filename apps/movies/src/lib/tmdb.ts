import { type Language } from '@aca/config';
import { resolveExternalLang } from '@aca/i18n';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/** A TMDB movie mapped to the fields the app uses. */
export interface MovieResult {
  id: number;
  title: string;
  overview: string;
  /** `YYYY-MM-DD`, or '' when TMDB has no date. */
  releaseDate: string;
  /** TMDB poster path (e.g. `/x.jpg`), or null when none. */
  posterPath: string | null;
  /** Average rating, 0-10. */
  voteAverage: number;
}

export interface SearchMoviesParams {
  query: string;
  /** App language, mapped to a TMDB locale (`en` to `en-US`, `es` to `es-ES`). */
  language: Language;
  /** Abort signal from the caller (e.g. TanStack Query cancellation). */
  signal?: AbortSignal;
}

// Raw TMDB response: only the fields we read; the API returns many more.
interface RawMovie {
  id: number;
  title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
}

interface RawSearchResponse {
  results?: RawMovie[];
}

function toMovieResult(raw: RawMovie): MovieResult {
  return {
    id: raw.id,
    title: raw.title ?? '',
    overview: raw.overview ?? '',
    releaseDate: raw.release_date ?? '',
    posterPath: raw.poster_path ?? null,
    voteAverage: raw.vote_average ?? 0
  };
}

// React Native's URL / URLSearchParams polyfill is incomplete, so we encode the query
// string by hand rather than rely on `searchParams`; portable across web and native.
function toQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Search TMDB movies in the configured app language. The API key is read from
 * `EXPO_PUBLIC_TMDB_API_KEY`, which Expo inlines into the client bundle at build time.
 */
export async function searchMovies({
  query,
  language,
  signal
}: SearchMoviesParams): Promise<MovieResult[]> {
  const apiKey = process.env['EXPO_PUBLIC_TMDB_API_KEY'];
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_TMDB_API_KEY');

  const queryString = toQueryString({
    api_key: apiKey,
    language: resolveExternalLang(language),
    query,
    include_adult: 'false',
    page: '1'
  });
  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?${queryString}`,
    signal ? { signal } : undefined
  );
  if (!response.ok) {
    throw new Error(`TMDB search failed (${response.status})`);
  }
  const body = (await response.json()) as RawSearchResponse;
  return (body.results ?? []).map(toMovieResult);
}
