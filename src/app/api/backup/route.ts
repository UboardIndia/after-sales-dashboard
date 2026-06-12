import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET            — list available backups (id, fiscal year, rows, date, size).
 * GET ?id=123    — download one backup as a CSV file.
 * Auth handled by middleware (auth cookie required).
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await supabaseAdmin()
        .from("sheet_backups")
        .select("fiscal_year, csv, created_at")
        .eq("id", id)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: "backup not found" }, { status: 404 });
      }
      const date = new Date(data.created_at).toISOString().slice(0, 10);
      const filename = `backup-${data.fiscal_year.replace(/\s+/g, "-")}-${date}.csv`;
      return new NextResponse(data.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const { data, error } = await supabaseAdmin()
      .from("sheet_backups")
      .select("id, fiscal_year, row_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      if (/schema cache|does not exist|42P01/i.test(error.message)) {
        return NextResponse.json({ backups: [], needsSetup: true });
      }
      throw error;
    }
    return NextResponse.json({ backups: data ?? [] });
  } catch (err) {
    console.error("Backup list error:", err);
    return NextResponse.json({ error: "Failed to load backups" }, { status: 500 });
  }
}
