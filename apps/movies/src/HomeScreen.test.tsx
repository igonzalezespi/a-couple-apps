import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createI18n, I18nProvider } from '@aca/i18n';
import { UIProvider } from '@aca/ui';

import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('renders localized strings from the shared packages', () => {
    render(
      <UIProvider>
        <I18nProvider i18n={createI18n('en')}>
          <HomeScreen />
        </I18nProvider>
      </UIProvider>
    );

    expect(screen.getByText('A Couple Apps')).toBeTruthy();
    expect(screen.getByText('Movies')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
