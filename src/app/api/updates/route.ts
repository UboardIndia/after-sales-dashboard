import { NextResponse } from "next/server";
import { supabaseAdmin, UPDATABLE_FIELDS, type UpdatableField } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface PostBody {
  complaintId: string;
  updates: { field: UpdatableField; value: string }[];
  note?: string;
  updatedBy: string;
}

/** POST — record one or more field updates for a complaint. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const updatedBy = (body.updatedBy || "").trim();
    const complaintId = (body.complaintId || "").trim();

    if (!complaintId) return NextResponse.json({ error: "complaintId required" }, { status: 400 });
    if (!updatedBy) return NextResponse.json({ error: "updatedBy required" }, { status: 400 });
    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json({ error: "updates required" }, { status: 400 });
    }
    for (const u of body.updates) {
      if (!UPDATABLE_FIELDS.includes(u.field)) {
        return NextResponse.json({ error: `invalid field: ${u.field}` }, { status: 400 });
      }
    }

    const rows = body.updates.map((u) => ({
      complaint_id: complaintId,
      field: u.field,
      value: (u.value || "").trim(),
      note: (body.note || "").trim() || null,
      updated_by: updatedBy,
    }));

    const { error } = await supabaseAdmin().from("complaint_updates").insert(rows);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update insert error:", err);
    return NextResponse.json({ error: "Failed to save update" }, { status: 500 });
  }
}

/** GET ?complaintId=... — full update history for one complaint (newest first). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get("complaintId");
    if (!complaintId) return NextResponse.json({ error: "complaintId required" }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from("complaint_updates")
      .select("field, value, note, updated_by, created_at")
      .eq("complaint_id", complaintId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ history: data ?? [] });
  } catch (err) {
    console.error("Update history error:", err);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
