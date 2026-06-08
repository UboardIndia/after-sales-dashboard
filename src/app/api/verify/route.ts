import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface PostBody {
  botId: string;
  decision: "new" | "linked" | "rejected";
  linkedTo?: string;        // sequence number of existing complaint
  verifiedBy: string;
  draft?: Record<string, string>; // edited fields from the verify form
}

/** POST — save a bot verification decision to Supabase. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const { botId, decision, linkedTo, verifiedBy, draft } = body;

    if (!botId)       return NextResponse.json({ error: "botId required" }, { status: 400 });
    if (!decision)    return NextResponse.json({ error: "decision required" }, { status: 400 });
    if (!verifiedBy)  return NextResponse.json({ error: "verifiedBy required" }, { status: 400 });
    if (!["new", "linked", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "invalid decision" }, { status: 400 });
    }

    // Upsert so re-decisions overwrite the old one (unique constraint on bot_id)
    const { error } = await supabaseAdmin()
      .from("bot_verifications")
      .upsert(
        {
          bot_id: botId,
          decision,
          linked_complaint_id: linkedTo ?? null,
          note: draft ? JSON.stringify(draft) : null,
          verified_by: verifiedBy,
        },
        { onConflict: "bot_id" }
      );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Verify save error:", err);
    return NextResponse.json({ error: "Failed to save decision" }, { status: 500 });
  }
}

/** GET — return all saved decisions (so the UI can filter out already-decided entries). */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("bot_verifications")
      .select("bot_id, decision, linked_complaint_id, verified_by, created_at");

    if (error) throw error;
    return NextResponse.json({ decisions: data ?? [] });
  } catch (err) {
    console.error("Verify fetch error:", err);
    return NextResponse.json({ error: "Failed to load decisions" }, { status: 500 });
  }
}
