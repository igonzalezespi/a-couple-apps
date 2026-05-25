import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Web smoke test: sign in (email OTP) -> search -> add -> mark watched, against the
 * exported RN-Web build. Every Supabase and TMDB call is intercepted, so the run is
 * hermetic: no secrets, no network, no running backend. The Supabase REST endpoint is
 * backed by an in-memory list so add/list/mark-watched behave like the real table.
 */

// The build is served from localhost but talks to https://stub.supabase.test and TMDB,
// so the browser issues CORS preflights; every stubbed response must echo these headers
// or chromium blocks the request.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': '*'
};

interface Row {
  id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  watched: boolean;
  added_by: string;
  created_at: string;
}

const STUB_USER_ID = '11111111-1111-4111-8111-111111111111';

// Valid v4-shaped UUID for a stubbed row id; the row contract validates `id` with z.uuid().
function fakeUuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

function jsonResponse(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS,
    body: JSON.stringify(body)
  });
}

function preflight(route: Route): Promise<void> {
  return route.fulfill({ status: 204, headers: CORS, body: '' });
}

// A well-formed GoTrue session so supabase-js persists it and emits SIGNED_IN.
function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const ts = new Date().toISOString();
  return {
    access_token: 'stub-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'stub-refresh-token',
    user: {
      id: STUB_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'tester@example.com',
      email_confirmed_at: ts,
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: ts,
      updated_at: ts
    }
  };
}

const TMDB_RESULTS = {
  results: [
    {
      id: 603,
      title: 'The Matrix',
      overview: 'A hacker discovers reality is a simulation.',
      release_date: '1999-03-31',
      poster_path: '/matrix.jpg',
      vote_average: 8.2
    }
  ]
};

function idFromUrl(url: string): string | undefined {
  return /id=eq\.([^&]+)/.exec(url)?.[1];
}

async function installStubs(page: Page, items: Row[]): Promise<void> {
  let seq = 0;

  await page.route('**/api.themoviedb.org/**', (route) => jsonResponse(route, TMDB_RESULTS));
  // Posters are not asserted; abort to keep the run fully offline.
  await page.route('**/image.tmdb.org/**', (route) => route.abort());

  await page.route('**/auth/v1/**', (route) => {
    if (route.request().method() === 'OPTIONS') return preflight(route);
    const url = route.request().url();
    if (url.includes('/verify') || url.includes('/token'))
      return jsonResponse(route, fakeSession());
    return jsonResponse(route, {});
  });

  await page.route('**/rest/v1/watchlist_items**', (route) => {
    const req = route.request();
    const method = req.method();
    if (method === 'OPTIONS') return preflight(route);
    if (method === 'GET') return jsonResponse(route, items);
    if (method === 'POST') {
      const payload = req.postDataJSON() as Partial<Row> | Partial<Row>[];
      const incoming = Array.isArray(payload) ? payload : [payload];
      const inserted: Row[] = incoming.map((it) => ({
        id: fakeUuid(++seq),
        tmdb_id: it.tmdb_id ?? 0,
        title: it.title ?? '',
        poster_path: it.poster_path ?? null,
        release_date: it.release_date ?? null,
        watched: it.watched ?? false,
        added_by: STUB_USER_ID,
        created_at: new Date().toISOString()
      }));
      // Newest first, matching `.order('created_at', { ascending: false })`.
      items.unshift(...inserted);
      return jsonResponse(route, inserted, 201);
    }
    if (method === 'PATCH') {
      const id = idFromUrl(req.url());
      const patch = req.postDataJSON() as Partial<Row>;
      const row = items.find((r) => r.id === id);
      if (row && typeof patch.watched === 'boolean') row.watched = patch.watched;
      return jsonResponse(route, row ? [row] : []);
    }
    if (method === 'DELETE') {
      const id = idFromUrl(req.url());
      const idx = items.findIndex((r) => r.id === id);
      if (idx >= 0) items.splice(idx, 1);
      return jsonResponse(route, []);
    }
    return route.fallback();
  });
}

test.describe('movies watchlist (web smoke)', () => {
  test('sign in, search, add a movie, mark it watched', async ({ page }) => {
    const items: Row[] = [];
    await installStubs(page, items);

    await page.goto('/');

    // Auth gate: passwordless email OTP (intercepted).
    await page.getByLabel('Email').fill('tester@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    await page.getByLabel('Code').fill('123456');
    await page.getByRole('button', { name: 'Verify' }).click();

    // Authenticated home with an empty watchlist.
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByText('Your watchlist is empty.')).toBeVisible();

    // Search TMDB (intercepted). Submit via Enter to avoid the duplicate "Search" label
    // (the nav button on home vs. the submit button here).
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByLabel('Search').fill('matrix');
    await page.getByLabel('Search').press('Enter');
    await expect(page.getByText('The Matrix (1999)')).toBeVisible();

    // Add it; the result flips to a disabled "Added" once the list refetches, which
    // confirms the insert + cache invalidation round-tripped.
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByRole('button', { name: 'Added' })).toBeVisible();

    // Back on the watchlist the movie shows and can be marked watched.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('The Matrix (1999)')).toBeVisible();
    await page.getByRole('button', { name: 'Mark watched' }).click();
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible();
  });
});
