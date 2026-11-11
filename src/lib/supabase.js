import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key, { db: { schema: 'capitalo2' }, auth: { storageKey: 'capitalo2-auth', persistSession: true, autoRefreshToken: true } }) : null;

/** Turns database / auth errors into plain messages. */
export function friendly(e) {
  const m = e?.message || String(e || 'Something went wrong');
  if (/Invalid login credentials/i.test(m)) return 'Wrong phone/email or password.';
  if (/already registered|already been registered/i.test(m)) return 'An account with this phone/email already exists — sign in instead.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No internet connection. Please try again.';
  if (/JWT|token/i.test(m)) return 'Your session expired. Please sign in again.';
  if (/row-level security|permission denied/i.test(m)) return 'You are not allowed to do that.';
  return m.replace(/^.*?ERROR:\s*/, '');
}
export async function must(p) {
  const { data, error } = await p;
  if (error) throw new Error(friendly(error));
  return data;
}
