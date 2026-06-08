import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** GET ?recipient=Prachi — unread notifications for a team member */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const recipient = searchParams.get("recipient");
    if (!recipient) return NextResponse.json({ notifications: [] });

    const { data, error } = await supabaseAdmin()
      .from("notifications")
      .select("id, type, complaint_id, message, read, created_at")
      .eq("recipient", recipient)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    return NextResponse.json({ notifications: data ?? [] });
  } catch (err) {
    console.error("Notifications fetch error:", err);
    return NextResponse.json({ notifications: [] });
  }
}

/** POST { ids: number[] } — mark notifications as read */
export async function POST(req: Request) {
  try {
    const { ids } = await req.json() as { ids: number[] };
    if (!ids?.length) return NextResponse.json({ ok: true });

    const { error } = await supabaseAdmin()
      .from("notifications")
      .update({ read: true })
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notifications mark-read error:", err);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
