/**
 * Supabase Client Configuration
 *
 * Singleton instance of Supabase client for the entire app.
 * Configures authentication persistence using AsyncStorage.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';

// Get environment variables (Expo SDK 49+ uses EXPO_PUBLIC_ prefix)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Environment variables:', {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY ? '***' : 'missing'
  });
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and restart Metro bundler with: npm run start:clear'
  );
}

/**
 * Supabase client instance with async storage for auth persistence
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
