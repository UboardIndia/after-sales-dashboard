import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Diagnostic: which Supabase project does THIS deployment use, and does the
 * sheet_backups table exist there? Reveals only the project URL (not keys).
 * Behind auth middleware like every other route.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL || "";
  const ref = url.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown";

  const sb = supabaseAdmin();
  const checks: Record<string, string> = {};

  // 1. Table reachable at all?
  const t = await sb.from("sheet_backups").select("id", { count: "exact", head: true });
  checks.tableReachable = t.error ? `NO — ${t.error.code ?? ""} ${t.error.message}` : "yes ✓";

  // 2. All columns the backup list/download needs?
  const c = await sb
    .from("sheet_backups")
    .select("id, fiscal_year, csv, row_count, created_at")
    .limit(1);
  checks.allColumns = c.error ? `NO — ${c.error.code ?? ""} ${c.error.message}` : "yes ✓";

  // 3. Can we actually insert (same op as a real backup)? Cleans up after itself.
  const ins = await sb
    .from("sheet_backups")
    .insert({ fiscal_year: "DIAGNOSTIC-TEST", csv: "test", row_count: 0 })
    .select("id")
    .single();
  if (ins.error) {
    checks.insertWorks = `NO — ${ins.error.code ?? ""} ${ins.error.message}`;
  } else {
    checks.insertWorks = "yes ✓";
    await sb.from("sheet_backups").delete().eq("id", ins.data.id);
  }

  return NextResponse.json({
    supabaseProjectRef: ref,
    supabaseUrl: url ? url.replace(/^https?:\/\//, "") : "NOT SET",
    checks,
    verdict:
      checks.tableReachable.startsWith("yes") &&
      checks.allColumns.startsWith("yes") &&
      checks.insertWorks.startsWith("yes")
        ? "Everything works — Backup Now should succeed. Hard-refresh the Backups page (Ctrl+Shift+R)."
        : `Something is off — see the failing check above. SQL editor for this project: supabase.com/dashboard/project/${ref}`,
  });
}
