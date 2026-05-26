import { act, cleanup, render, screen } from '@testing-library/react';
import { type i18n as I18nInstance } from 'i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { createI18n, registerAppNamespace } from './i18n';
import { I18nProvider } from './provider';
import { useAppLocale, useLocale } from './useLocale';

// A stand-in app namespace registered the same way a real app (e.g. movies) does, so the
// fallback + namespace-resolution behaviour is exercised without depending on app code.
const TEST_NS = 'sample-app';
const testBundles = {
  en: { greeting: 'Hello' },
  es: { greeting: 'Hola' }
};

function withNamespace(language: 'en' | 'es' = 'en'): I18nInstance {
  const instance = createI18n(language);
  registerAppNamespace(instance, TEST_NS, testBundles);
  return instance;
}

// No shared setup file in this package; unmount between tests so duplicate testIds don't collide.
afterEach(() => {
  cleanup();
});

function CommonSample() {
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

function NamespaceSample() {
  // One namespace-bound accessor reads an app-namespace key AND a common-only key.
  const { t, language, setLanguage } = useAppLocale(TEST_NS);
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="own">{t('greeting')}</span>
      <span data-testid="fallback">{t('switchPerson')}</span>
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
        <CommonSample />
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

describe('useAppLocale namespace resolution', () => {
  it('resolves a key from the bound namespace', () => {
    render(
      <I18nProvider i18n={withNamespace('en')}>
        <NamespaceSample />
      </I18nProvider>
    );

    expect(screen.getByTestId('own').textContent).toBe('Hello');
  });

  it('falls back to common for a key absent from the bound namespace', () => {
    render(
      <I18nProvider i18n={withNamespace('en')}>
        <NamespaceSample />
      </I18nProvider>
    );

    // 'switchPerson' lives only in common; the namespace-bound accessor resolves it via fallbackNS.
    expect(screen.getByTestId('fallback').textContent).toBe('Switch person');
  });

  it('exposes namespace-independent language + setLanguage that switch both bundles', async () => {
    render(
      <I18nProvider i18n={withNamespace('en')}>
        <NamespaceSample />
      </I18nProvider>
    );

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('own').textContent).toBe('Hello');
    expect(screen.getByTestId('fallback').textContent).toBe('Switch person');

    await act(async () => {
      screen.getByRole('button', { name: 'switch' }).click();
    });

    expect(screen.getByTestId('lang').textContent).toBe('es');
    // Both the app-namespace key and the common fallback reflect the new language.
    expect(screen.getByTestId('own').textContent).toBe('Hola');
    expect(screen.getByTestId('fallback').textContent).toBe('Cambiar de persona');
  });
});
