import { afterEach, describe, expect, it, vi } from 'vitest';

import { posterUrl, searchMovies } from './tmdb';

const SAMPLE = {
  results: [
    {
      id: 603,
      title: 'The Matrix',
      overview: 'A hacker discovers reality is a simulation.',
      release_date: '1999-03-31',
      poster_path: '/abc.jpg',
      vote_average: 8.2
    },
    // Sparse row (only id + title): everything else must fall back to safe defaults.
    { id: 604, title: 'The Matrix Reloaded' }
  ]
};

/** Stub global `fetch`; returns the array of requested URLs, captured per call. */
function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}): string[] {
  const { ok = true, status = 200 } = init;
  const urls: string[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    urls.push(String(input));
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body)
    } as unknown as Response);
  });
  vi.stubGlobal('fetch', fetchMock);
  return urls;
}

describe('searchMovies', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('queries TMDB in the configured language and maps results', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    const urls = mockFetch(SAMPLE);

    const results = await searchMovies({ query: 'matrix', language: 'es' });

    const url = urls[0] ?? '';
    expect(url).toContain('/search/movie?');
    expect(url).toContain('language=es-ES');
    expect(url).toContain('query=matrix');
    expect(url).toContain('api_key=test-key');
    expect(url).toContain('include_adult=false');

    expect(results).toEqual([
      {
        id: 603,
        title: 'The Matrix',
        overview: 'A hacker discovers reality is a simulation.',
        releaseDate: '1999-03-31',
        posterPath: '/abc.jpg',
        voteAverage: 8.2
      },
      {
        id: 604,
        title: 'The Matrix Reloaded',
        overview: '',
        releaseDate: '',
        posterPath: null,
        voteAverage: 0
      }
    ]);
  });

  it('maps English to en-US', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    const urls = mockFetch({ results: [] });
    await searchMovies({ query: 'matrix', language: 'en' });
    expect(urls[0] ?? '').toContain('language=en-US');
  });

  it('URL-encodes the query', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    const urls = mockFetch({ results: [] });
    await searchMovies({ query: 'matrix & co', language: 'en' });
    expect(urls[0] ?? '').toContain('query=matrix%20%26%20co');
  });

  it('throws on a non-OK response', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', 'test-key');
    mockFetch({}, { ok: false, status: 401 });
    await expect(searchMovies({ query: 'x', language: 'en' })).rejects.toThrow('401');
  });

  it('throws when the API key is missing', async () => {
    vi.stubEnv('EXPO_PUBLIC_TMDB_API_KEY', '');
    await expect(searchMovies({ query: 'x', language: 'en' })).rejects.toThrow(
      'EXPO_PUBLIC_TMDB_API_KEY'
    );
  });
});

describe('posterUrl', () => {
  it('returns a w185 URL for a given poster path', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
  });

  it('returns null when poster_path is null', () => {
    expect(posterUrl(null)).toBeNull();
  });
});
