import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using demo mode (localStorage).');
}

// In the browser, go through the /sb rewrite (see next.config.mjs) so blocked ISPs still work.
const clientUrl = typeof window !== 'undefined' ? `${window.location.origin}/sb` : supabaseUrl;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(clientUrl, supabaseAnonKey)
  : null;
