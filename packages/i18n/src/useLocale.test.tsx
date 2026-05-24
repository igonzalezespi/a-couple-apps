import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createI18n } from './i18n';
import { I18nProvider } from './provider';
import { useLocale } from './useLocale';

function Sample() {
  const { t, setLanguage, language } = useLocale();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="label">{t('movies')}</span>
      <button type="button" onClick={() => void setLanguage('es')}>
        switch
      </button>
    </div>
  );
}

describe('useLocale runtime switching', () => {
  it('renders the current language and updates strings on switch without reload', async () => {
    render(
      <I18nProvider i18n={createI18n('en')}>
        <Sample />
      </I18nProvider>
    );

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('label').textContent).toBe('Movies');

    await act(async () => {
      screen.getByRole('button', { name: 'switch' }).click();
    });

    expect(screen.getByTestId('lang').textContent).toBe('es');
    expect(screen.getByTestId('label').textContent).toBe('Películas');
  });
});
