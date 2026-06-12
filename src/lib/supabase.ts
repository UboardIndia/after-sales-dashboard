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
  cached = createClient(url, key, {
    auth: { persistSession: false },
    // Next.js caches fetch() by default in the App Router, which made
    // dashboard reads serve a stale snapshot after a status write. Force
    // every Supabase request to bypass that cache so reads are always live.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}

/** Fields the dashboard is allowed to overlay on a complaint. */
export const UPDATABLE_FIELDS = ["status", "assigned_to", "remark"] as const;
export type UpdatableField = (typeof UPDATABLE_FIELDS)[number];
