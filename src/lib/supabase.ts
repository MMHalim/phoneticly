import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export function getSupabaseConfigError() {
  if (isSupabaseConfigured) {
    return null;
  }

  return 'Missing Supabase environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file.';
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || 'Supabase is not configured.');
  }

  return supabase;
}
