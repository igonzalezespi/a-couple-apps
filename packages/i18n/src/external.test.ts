import { describe, expect, it } from 'vitest';

import { resolveExternalLang } from './external';

describe('resolveExternalLang', () => {
  it('maps the app language to a provider locale (e.g. TMDB)', () => {
    expect(resolveExternalLang('es')).toBe('es-ES');
    expect(resolveExternalLang('en')).toBe('en-US');
  });
});
