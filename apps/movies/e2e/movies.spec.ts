import { expect, test, type Page, type Route } from '@playwright/test';

import { getSharedConfig } from '@aca/config';

import e2eCoupleConfig from './fixtures/couple.config.e2e';

/**
 * Web smoke test: pick who you are -> search -> add -> mark watched, against the exported RN-Web
 * build. There is no auth; Supabase REST and TMDB are intercepted, so the run is hermetic (no
 * secrets, no network, no backend). The REST endpoint is backed by an in-memory list so
 * add/list/mark-watched behave like the real table.
 *
 * Person names come from the SAME fixture the webServer build is aliased to (see metro.config.js +
 * playwright.config.ts), so the spec is decoupled from any local couple.config.ts — it passes for
 * any developer (with or without a private config) and in CI.
 */
const [personA] = getSharedConfig(e2eCoupleConfig).people;

// The build is served from localhost but talks to https://stub.supabase.test and TMDB, so the
// browser issues CORS preflights; every stubbed response must echo these headers.
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
  added_by: string | null;
  picked_at: string | null;
  picked_by: string | null;
  created_at: string;
}

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
        // The client now sends the selected person id; echo it back.
        added_by: it.added_by ?? null,
        picked_at: null,
        picked_by: null,
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
      if (row) {
        if (typeof patch.watched === 'boolean') row.watched = patch.watched;
        // The pick columns are sent together (set) or as nulls (clear).
        if ('picked_at' in patch) {
          row.picked_at = patch.picked_at ?? null;
          row.picked_by = patch.picked_by ?? null;
        }
        // Emulate the DB triggers: at most one pick, and marking watched clears the pick.
        if (row.picked_at != null) {
          for (const other of items) {
            if (other.id !== row.id) {
              other.picked_at = null;
              other.picked_by = null;
            }
          }
        }
        if (row.watched) {
          row.picked_at = null;
          row.picked_by = null;
        }
      }
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
  test('pick a person, search, add, set tonight pick, then mark watched', async ({ page }) => {
    const items: Row[] = [];
    await installStubs(page, items);

    await page.goto('/');

    // No auth: pick which person you are. The name comes from the e2e fixture the build is aliased
    // to, so this is not coupled to any local couple.config.ts.
    await page.getByRole('button', { name: personA.displayName }).click();

    // Home with an empty watchlist + its call to action.
    await expect(page.getByRole('button', { name: 'Switch person' })).toBeVisible();
    await expect(
      page.getByText("Nothing here yet. Add a movie you'd like to watch together.")
    ).toBeVisible();

    // The empty-state CTA navigates to search (unambiguous vs. the home "Search" nav button).
    await page.getByRole('button', { name: 'Search for a movie' }).click();
    await page.getByLabel('Search').fill('matrix');
    // Submit via Enter to avoid the duplicate "Search" label (heading + submit button).
    await page.getByLabel('Search').press('Enter');
    await expect(page.getByText('The Matrix (1999)')).toBeVisible();

    // Add it; the result flips to a disabled "Added" once the list refetches, which confirms
    // the insert + cache invalidation round-tripped.
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByRole('button', { name: 'Added' })).toBeVisible();

    // Back on the watchlist the movie shows.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('The Matrix (1999)')).toBeVisible();

    // Nominate it as tonight's pick: the "Tonight's pick" treatment appears and the action flips
    // to "Clear pick".
    await page.getByRole('button', { name: 'Pick for tonight' }).click();
    await expect(page.getByText(/Tonight's pick/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear pick' })).toBeVisible();

    // Marking it watched moves it to history and clears the pick (DB trigger, emulated in the stub).
    await page.getByRole('button', { name: 'Mark watched' }).click();
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible();
    await expect(page.getByText(/Tonight's pick/)).toHaveCount(0);
  });
});
