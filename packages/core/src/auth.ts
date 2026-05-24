import { type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { type AppSupabaseClient } from './client';
import { useSupabase } from './provider';

export interface SessionState {
  session: Session | null;
  loading: boolean;
}

/** Track the auth session: hydrated from `getSession`, kept live via `onAuthStateChange`. */
export function useSession(): SessionState {
  const client = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  return { session, loading };
}

/** Sign the current user out. */
export async function signOut(client: AppSupabaseClient): Promise<void> {
  await client.auth.signOut();
}
