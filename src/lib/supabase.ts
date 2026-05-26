import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const API_URL = `${supabaseUrl}/functions/v1`;
export const ANON_KEY = supabaseAnonKey;

export function apiHeaders(adminToken?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ANON_KEY}`,
  };
  if (adminToken) h['X-Admin-Token'] = adminToken;
  return h;
}
