import { NextResponse } from "next/server";
import { supabaseAdmin, UPDATABLE_FIELDS, type UpdatableField } from "@/lib/supabase";
import { safeWriteSheetField, type SafeWriteResult } from "@/lib/googleAuth";
import { STATUS_OPTIONS } from "@/lib/ticketOptions";

// FY 2026-27 sheet config — only sheet with Editor access
const LIVE_SHEET_ID  = "1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU";
const LIVE_SHEET_TAB = "Helpdesk FY 26-27";
const LIVE_SEQ_COL   = "Complaint No";
const LIVE_FY_PREFIX = "FY 2026-27::";

// Which dashboard fields land in which sheet column.
// assigned_to is dashboard-only (no sheet column for it).
const SHEET_COLS: Partial<Record<UpdatableField, string>> = {
  status: "Action Taken",
  remark: "Uboard Remarks",
};

export const dynamic = "force-dynamic";

interface UpdateItem { field: UpdatableField; value: string }
interface PostBody {
  complaintId: string;
  updates?: UpdateItem[];
  // Flat shape (used by bulk update on /update page + Open Tickets table)
  field?: UpdatableField;
  value?: string;
  note?: string;
  updatedBy: string;
  /** Customer mobile as shown in the dashboard — verifies sheet row identity. */
  customerMobile?: string;
}

/** POST — record one or more field updates for a complaint. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const updatedBy = (body.updatedBy || "").trim();
    const complaintId = (body.complaintId || "").trim();

    // Accept both { updates: [...] } and flat { field, value }.
    const updates: UpdateItem[] =
      Array.isArray(body.updates) && body.updates.length > 0
        ? body.updates
        : body.field
        ? [{ field: body.field, value: body.value ?? "" }]
        : [];

    if (!complaintId) return NextResponse.json({ error: "complaintId required" }, { status: 400 });
    if (!updatedBy) return NextResponse.json({ error: "updatedBy required" }, { status: 400 });
    if (updates.length === 0) {
      return NextResponse.json({ error: "updates required" }, { status: 400 });
    }
    for (const u of updates) {
      if (!UPDATABLE_FIELDS.includes(u.field)) {
        return NextResponse.json({ error: `invalid field: ${u.field}` }, { status: 400 });
      }
      // Status must be from the official vocabulary — free-typed values can't reach the sheet.
      if (u.field === "status" && !(STATUS_OPTIONS as readonly string[]).includes(u.value)) {
        return NextResponse.json({ error: `invalid status: ${u.value}` }, { status: 400 });
      }
      if (u.field === "remark" && u.value.length > 500) {
        return NextResponse.json({ error: "remark too long (max 500 chars)" }, { status: 400 });
      }
    }

    // Write back to the live FY 2026-27 sheet first so we can capture the old
    // value for the audit log. FY 2025-26 is historical — never touched.
    const sheetWrites: { field: string; result: SafeWriteResult }[] = [];
    const oldValues = new Map<string, string>();
    if (complaintId.startsWith(LIVE_FY_PREFIX) ) {
      const seqNo = complaintId.slice(LIVE_FY_PREFIX.length);
      for (const u of updates) {
        const col = SHEET_COLS[u.field];
        if (!col || !u.value) continue;
        const result = await safeWriteSheetField({
          sheetId: LIVE_SHEET_ID,
          tabName: LIVE_SHEET_TAB,
          seqColName: LIVE_SEQ_COL,
          seqValue: seqNo,
          targetColName: col,
          value: u.value,
          expectedMobile: body.customerMobile,
          allowedValues: u.field === "status" ? STATUS_OPTIONS : undefined,
        });
        sheetWrites.push({ field: u.field, result });
        if (result.status === "ok" && result.oldValue !== undefined) {
          oldValues.set(u.field, result.oldValue);
        }
        if (result.status !== "ok") {
          console.warn(`Sheet write ${result.status} for ${complaintId}.${u.field}: ${result.reason}`);
        }
      }
    }

    const userNote = (body.note || "").trim();
    const rows = updates.map((u) => {
      const was = oldValues.get(u.field);
      const wasNote = was !== undefined && was !== u.value ? `(was: ${was || "—"})` : "";
      return {
        complaint_id: complaintId,
        field: u.field,
        value: (u.value || "").trim(),
        note: [userNote, wasNote].filter(Boolean).join(" ") || null,
        updated_by: updatedBy,
      };
    });

    const { error } = await supabaseAdmin().from("complaint_updates").insert(rows);
    if (error) throw error;

    const failed = sheetWrites.filter((w) => w.result.status !== "ok");
    return NextResponse.json({
      ok: true,
      sheetWrites: sheetWrites.map((w) => ({
        field: w.field,
        status: w.result.status,
        reason: w.result.reason,
      })),
      ...(failed.length
        ? { warning: `Saved to dashboard, but sheet not updated for: ${failed.map((f) => `${f.field} (${f.result.reason})`).join(", ")}` }
        : {}),
    });
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
