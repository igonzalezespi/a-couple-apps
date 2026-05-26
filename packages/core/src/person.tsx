import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** A member of the couple (from couple.config). */
export interface Person {
  id: string;
  displayName: string;
  /** Optional favorite accent color (couple.config); re-skins the app when this person is active. */
  color?: 'red' | 'purple' | undefined;
}

/**
 * Minimal async key/value storage. Matches `@react-native-async-storage/async-storage`, which
 * works on native and on React Native Web, so the app injects that; tests inject a fake.
 */
export interface PersonStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const STORAGE_KEY = 'aca.currentPersonId';

export interface CurrentPersonState {
  /** The selected person, or null until one is chosen (or while loading). */
  person: Person | null;
  /** Everyone from couple.config, to offer in the selector. */
  people: readonly Person[];
  /** True until the stored selection has been read. */
  loading: boolean;
  /** Choose who you are on this device (persisted). */
  setPerson: (id: string) => void;
  /** Forget the selection (returns to the selector). */
  clearPerson: () => void;
}

const CurrentPersonContext = createContext<CurrentPersonState | null>(null);

export interface PersonProviderProps {
  people: readonly Person[];
  storage: PersonStorage;
  children: ReactNode;
}

/**
 * "Which member of the couple is using this device." There is no login: each couple builds the
 * app for their own private backend, so identity is a local, switchable choice from the
 * configured people rather than an authenticated account. Persisted via the injected storage.
 */
export function PersonProvider({ people, storage, children }: PersonProviderProps) {
  const [personId, setPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void storage.getItem(STORAGE_KEY).then((id) => {
      if (!active) return;
      setPersonId(id);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const value = useMemo<CurrentPersonState>(
    () => ({
      // A stored id no longer in `people` (e.g. config changed) falls back to null -> selector.
      person: people.find((p) => p.id === personId) ?? null,
      people,
      loading,
      setPerson: (id: string) => {
        setPersonId(id);
        void storage.setItem(STORAGE_KEY, id);
      },
      clearPerson: () => {
        setPersonId(null);
        void storage.removeItem(STORAGE_KEY);
      }
    }),
    [people, personId, loading, storage]
  );

  return <CurrentPersonContext.Provider value={value}>{children}</CurrentPersonContext.Provider>;
}

/** Access the current-person state (must be inside `<PersonProvider>`). */
export function useCurrentPerson(): CurrentPersonState {
  const ctx = useContext(CurrentPersonContext);
  if (!ctx) throw new Error('useCurrentPerson must be used within <PersonProvider>');
  return ctx;
}
