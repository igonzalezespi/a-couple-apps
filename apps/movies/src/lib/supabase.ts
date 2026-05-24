import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { parseSupabaseEnv } from '@aca/config';
import { createSupabaseClient } from '@aca/core';

// Expo inlines only EXPO_PUBLIC_* vars into the client bundle, so the app reads
// its Supabase config from those (mirrors of SUPABASE_URL / SUPABASE_ANON_KEY).
// Bracket access satisfies `noPropertyAccessFromIndexSignature`; Expo's env plugin
// inlines both bracket and dot forms (babel-preset-expo inline-env-vars).
const env = parseSupabaseEnv({
  SUPABASE_URL: process.env['EXPO_PUBLIC_SUPABASE_URL'],
  SUPABASE_ANON_KEY: process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']
});

/**
 * The app's single Supabase client (created once). Native persists the session in
 * AsyncStorage; web uses localStorage (Supabase's default), so it needs no override.
 */
export const supabase = createSupabaseClient(
  env,
  Platform.OS === 'web' ? undefined : { auth: { storage: AsyncStorage } }
);
