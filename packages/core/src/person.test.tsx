import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { PersonProvider, useCurrentPerson, type PersonStorage } from './person';

// Core's vitest config has no global afterEach, so unmount between tests explicitly.
afterEach(cleanup);

const PEOPLE = [
  { id: 'personA', displayName: 'Alex' },
  { id: 'personB', displayName: 'Sam' }
] as const;

function makeStorage(initial: string | null) {
  let value = initial;
  const storage: PersonStorage = {
    getItem: () => Promise.resolve(value),
    setItem: (_key, v) => {
      value = v;
      return Promise.resolve();
    },
    removeItem: () => {
      value = null;
      return Promise.resolve();
    }
  };
  return { storage, read: () => value };
}

function Probe() {
  const { person, people, setPerson, clearPerson } = useCurrentPerson();
  return (
    <>
      <span>person:{person ? person.displayName : 'none'}</span>
      <span>count:{people.length}</span>
      <button onClick={() => setPerson('personB')}>pickB</button>
      <button onClick={() => clearPerson()}>clear</button>
    </>
  );
}

const renderWith = (initial: string | null, children: ReactNode = <Probe />) => {
  const { storage, read } = makeStorage(initial);
  render(
    <PersonProvider people={PEOPLE} storage={storage}>
      {children}
    </PersonProvider>
  );
  return { read };
};

describe('PersonProvider / useCurrentPerson', () => {
  it('starts with no selection and offers the configured people', async () => {
    renderWith(null);
    await waitFor(() => expect(screen.getByText('person:none')).toBeTruthy());
    expect(screen.getByText('count:2')).toBeTruthy();
  });

  it('resolves a stored selection to the matching person', async () => {
    renderWith('personA');
    await waitFor(() => expect(screen.getByText('person:Alex')).toBeTruthy());
  });

  it('setPerson selects and persists', async () => {
    const { read } = renderWith(null);
    await waitFor(() => expect(screen.getByText('person:none')).toBeTruthy());
    fireEvent.click(screen.getByText('pickB'));
    await waitFor(() => expect(screen.getByText('person:Sam')).toBeTruthy());
    expect(read()).toBe('personB');
  });

  it('clearPerson forgets the selection', async () => {
    const { read } = renderWith('personA');
    await waitFor(() => expect(screen.getByText('person:Alex')).toBeTruthy());
    fireEvent.click(screen.getByText('clear'));
    await waitFor(() => expect(screen.getByText('person:none')).toBeTruthy());
    expect(read()).toBeNull();
  });

  it('falls back to no selection when the stored id is unknown', async () => {
    renderWith('ghost');
    await waitFor(() => expect(screen.getByText('person:none')).toBeTruthy());
  });
});
