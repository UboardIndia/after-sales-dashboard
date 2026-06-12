import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Daily snapshot of both source sheets into Supabase (table: sheet_backups).
 * Called by Vercel Cron (see vercel.json) or manually from the /backups page.
 *
 * Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` when the
 * CRON_SECRET env var is set; browser calls are allowed with the normal
 * auth cookie. This route is exempted from middleware so cron can reach it.
 */

const SHEETS = [
  {
    fiscalYear: "FY 2025-26",
    url: "https://docs.google.com/spreadsheets/d/1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc/export?format=csv&gid=785949897",
  },
  {
    fiscalYear: "FY 2026-27",
    url: "https://docs.google.com/spreadsheets/d/1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU/export?format=csv&gid=1166573888",
  },
];

/** Keep this many most-recent backup rows (60 = ~30 days × 2 sheets). */
const KEEP_ROWS = 60;

export const dynamic = "force-dynamic";

const SETUP_SQL = `create table if not exists sheet_backups (
  id bigint generated always as identity primary key,
  fiscal_year text not null,
  csv text not null,
  row_count integer,
  created_at timestamptz not null default now()
);`;

function isAuthorized(req: Request): boolean {
  // 1. Vercel cron with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  // 2. Vercel cron without CRON_SECRET configured (header set by Vercel)
  if (!cronSecret && (req.headers.get("user-agent") || "").includes("vercel-cron")) return true;
  // 3. Logged-in dashboard user
  const token = cookies().get("auth_token")?.value;
  const secret = process.env.AUTH_SECRET;
  return Boolean(token && secret && token === secret);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: { fiscalYear: string; rows?: number; error?: string }[] = [];

  for (const sheet of SHEETS) {
    try {
      const res = await fetch(sheet.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const csv = await res.text();
      const rowCount = Math.max(0, csv.split("\n").filter((l) => l.trim()).length - 1);
      if (rowCount === 0) throw new Error("sheet returned no data — backup skipped");

      const { error } = await supabaseAdmin()
        .from("sheet_backups")
        .insert({ fiscal_year: sheet.fiscalYear, csv, row_count: rowCount });
      if (error) {
        // Table genuinely absent → tell the caller exactly how to create it.
        // (42P01 = undefined_table. Match narrowly — other errors must surface raw.)
        if (error.code === "42P01" || /relation .* does not exist|find the table/i.test(error.message)) {
          return NextResponse.json(
            {
              error: "sheet_backups table missing — run this SQL in Supabase → SQL Editor",
              detail: `${error.code ?? ""} ${error.message}`.trim(),
              sql: SETUP_SQL,
            },
            { status: 500 }
          );
        }
        // Anything else (wrong column, permissions, size limit…) → show the real error.
        return NextResponse.json(
          { error: `Supabase insert failed: ${error.code ?? ""} ${error.message}`.trim() },
          { status: 500 }
        );
      }
      results.push({ fiscalYear: sheet.fiscalYear, rows: rowCount });
    } catch (err) {
      results.push({ fiscalYear: sheet.fiscalYear, error: (err as Error).message });
    }
  }

  // Prune old backups — keep the most recent KEEP_ROWS.
  try {
    const sb = supabaseAdmin();
    const { data: old } = await sb
      .from("sheet_backups")
      .select("id")
      .order("created_at", { ascending: false })
      .range(KEEP_ROWS, KEEP_ROWS + 200);
    if (old && old.length > 0) {
      await sb.from("sheet_backups").delete().in("id", old.map((r) => r.id));
    }
  } catch (pruneErr) {
    console.warn("Backup prune failed (non-fatal):", pruneErr);
  }

  const failed = results.filter((r) => r.error);
  return NextResponse.json(
    { ok: failed.length === 0, results, ranAt: new Date().toISOString() },
    { status: failed.length === results.length ? 500 : 200 }
  );
}
