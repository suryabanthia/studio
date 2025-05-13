import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient<Database> | null = null;

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
  console.error(
    "Supabase URL is a placeholder or not set. " +
    "Please set NEXT_PUBLIC_SUPABASE_URL in your .env file. " +
    "Supabase functionality will be disabled."
  );
} else if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  console.error(
    "Supabase Anon Key is a placeholder or not set. " +
    "Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file. " +
    "Supabase functionality will be disabled."
  );
} else {
  try {
    // Validate if the URL is a proper URL string before passing to createClient
    new URL(supabaseUrl);
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error(
      `The Supabase URL provided ("${supabaseUrl}") is not a valid URL. ` +
      "Please check the format in your .env file. Supabase functionality will be disabled."
    );
    // supabaseInstance remains null
  }
}

export const supabase = supabaseInstance;
