import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Retrieve credentials from environment variables (supporting pure SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and VITE_SUPABASE_URL)
const supabaseUrl = 
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';

const supabaseAnonKey = 
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim().length > 0 && 
  supabaseAnonKey.trim().length > 0 &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Singleton Supabase Client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type { User, Session };
