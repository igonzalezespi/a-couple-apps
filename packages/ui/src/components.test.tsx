import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { Button, Card, Image, Input, Screen, Text } from './components';
import { UIProvider } from './Provider';

const renderUI = (ui: ReactNode) => render(<UIProvider>{ui}</UIProvider>);

describe('UI primitives', () => {
  it('renders composed primitives and their text under the shared provider', () => {
    renderUI(
      <Screen>
        <Card>
          <Text>Watchlist</Text>
        </Card>
      </Screen>
    );

    expect(screen.getByText('Watchlist')).toBeTruthy();
  });

  it('Button exposes the button role with its label as the accessible name', () => {
    renderUI(
      <Button>
        <Text>Add movie</Text>
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Add movie' })).toBeTruthy();
  });

  it('renders the neutral tone variant, still as an accessible button', () => {
    renderUI(
      <Button tone="neutral">
        <Text>Cancel</Text>
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('Input renders an accessible text field exposing its placeholder', () => {
    renderUI(<Input placeholder="you@example.com" value="" onChangeText={() => {}} />);

    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('renders an Image addressable by testID', () => {
    renderUI(<Image testID="poster" source={{ uri: 'https://image.tmdb.org/t/p/w185/x.jpg' }} />);

    expect(screen.getByTestId('poster')).toBeTruthy();
  });
});
