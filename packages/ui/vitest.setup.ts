import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no matchMedia; react-native-web / Tamagui query it for media features.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  // @ts-expect-error minimal stub sufficient for the test environment
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  });
}

afterEach(() => {
  cleanup();
});
