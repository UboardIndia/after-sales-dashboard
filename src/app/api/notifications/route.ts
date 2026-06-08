import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Notifications are derived from the existing complaint_updates table — no new table needed.
 * A notification = any row where field='assigned_to' and value=recipient.
 * "Read" state is tracked client-side via localStorage (lastSeenAt timestamp).
 */

/** GET ?recipient=Prachi — recent assignments for this person */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const recipient = searchParams.get("recipient");
    if (!recipient) return NextResponse.json({ notifications: [] });

    const { data, error } = await supabaseAdmin()
      .from("complaint_updates")
      .select("id, complaint_id, updated_by, created_at")
      .eq("field", "assigned_to")
      .eq("value", recipient)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const notifications = (data ?? []).map((row) => {
      const seq = (row.complaint_id as string).split("::")[1] ?? row.complaint_id;
      return {
        id: row.id,
        complaint_id: row.complaint_id,
        message: `Ticket #${seq} assigned to you by ${row.updated_by}`,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("Notifications fetch error:", err);
    return NextResponse.json({ notifications: [] });
  }
}

/** POST — no-op, read state is handled client-side */
export async function POST() {
  return NextResponse.json({ ok: true });
}
