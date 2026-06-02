import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (service key — bypasses RLS).
 * NEVER import this from a client component; API routes only.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing in env");
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** Fields the dashboard is allowed to overlay on a complaint. */
export const UPDATABLE_FIELDS = ["status", "assigned_to", "remark"] as const;
export type UpdatableField = (typeof UPDATABLE_FIELDS)[number];
