import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product   = searchParams.get("product");
  const sparePart = searchParams.get("sparePart");

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");

    let query = supabaseAdmin()
      .from("complaint_updates")
      .select("complaint_id, field, value, updated_by, created_at")
      .like("complaint_id", "spare::%")
      .order("created_at", { ascending: false })
      .limit(100);

    if (product && sparePart) {
      query = query.eq("complaint_id", `spare::${product}::${sparePart}`);
    } else if (product) {
      query = query.like("complaint_id", `spare::${product}::%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const history = (data ?? []).map((u: { complaint_id: string; field: string; value: string; updated_by: string; created_at: string }) => {
      const parts    = u.complaint_id.replace(/^spare::/, "").split("::");
      const prod     = parts[0];
      const part     = parts.slice(1).join("::");
      return {
        id:            u.created_at + u.field,
        product:       prod,
        spare_part:    part,
        field_changed: u.field === "max_b2c" ? "Max B2C" : u.field === "min_b2b" ? "Min B2B" : u.field === "gst" ? "GST" : u.field,
        old_value:     "",
        new_value:     u.value,
        changed_by:    u.updated_by,
        changed_at:    u.created_at,
      };
    });

    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ history: [], error: (err as Error).message });
  }
}
