/**
 * Expo Environment Variables Type Definitions
 *
 * Expo SDK 49+ uses EXPO_PUBLIC_ prefix for environment variables
 * that need to be available in the app bundle.
 *
 * These are injected at build time and available via process.env
 */
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    EXPO_PUBLIC_APP_NAME: string;
    EXPO_PUBLIC_APP_VERSION: string;
    EXPO_PUBLIC_ENV: 'development' | 'staging' | 'production';
  }
}
