import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button, Card, Screen, Text } from './components';
import { UIProvider } from './Provider';

describe('UI primitives', () => {
  it('renders composed primitives and their labels under the shared provider', () => {
    render(
      <UIProvider>
        <Screen>
          <Card>
            <Text>Watchlist</Text>
            <Button>
              <Text>Add movie</Text>
            </Button>
          </Card>
        </Screen>
      </UIProvider>
    );

    expect(screen.getByText('Watchlist')).toBeTruthy();
    expect(screen.getByText('Add movie')).toBeTruthy();
  });
});
