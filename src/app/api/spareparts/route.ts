import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import productMaster from "@/data/product-master.json";
import priceListBase from "@/data/price-list.json";
import repairLog from "@/data/repair-log.json";

// We reuse the existing `complaint_updates` table (already in Supabase) to store
// spare-parts edits — no new tables needed.
// complaint_id = "spare::{product}::{sparePart}"
// field        = "max_b2c" | "min_b2b" | "gst" | "new_part"
// value        = new value
// updated_by   = team member name

function makeId(product: string, sparePart: string) {
  return `spare::${product}::${sparePart}`;
}

type PriceRow = { Product: string; SparePart: string; MaxB2C: string; MinB2B: string; GST: string };

export async function GET() {
  let priceList: PriceRow[] = [...(priceListBase as PriceRow[])];

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");

    // Fetch all spare-parts overrides (latest value per complaint_id + field)
    const { data: updates } = await supabaseAdmin()
      .from("complaint_updates")
      .select("complaint_id, field, value, updated_by, created_at")
      .like("complaint_id", "spare::%")
      .order("created_at", { ascending: true }); // oldest first so latest overwrites

    if (updates && updates.length > 0) {
      // Build override map: key = "product::sparePart", value = { MaxB2C, MinB2B, GST }
      const overrides = new Map<string, Partial<PriceRow>>();

      updates.forEach((u: { complaint_id: string; field: string; value: string }) => {
        const parts = u.complaint_id.replace(/^spare::/, "").split("::");
        if (parts.length < 2) return;
        const product   = parts[0];
        const sparePart = parts.slice(1).join("::"); // spare part name may contain ::
        const key = `${product}::${sparePart}`;
        const existing = overrides.get(key) ?? { Product: product, SparePart: sparePart };
        if (u.field === "max_b2c") existing.MaxB2C = u.value;
        if (u.field === "min_b2b") existing.MinB2B = u.value;
        if (u.field === "gst")     existing.GST     = u.value;
        overrides.set(key, existing);
      });

      overrides.forEach((override, key) => {
        const [product, ...spParts] = key.split("::");
        const sparePart = spParts.join("::");
        const idx = priceList.findIndex(r => r.Product === product && r.SparePart === sparePart);
        if (idx >= 0) {
          priceList[idx] = { ...priceList[idx], ...override } as PriceRow;
        } else {
          priceList.push({
            Product:  override.Product  ?? product,
            SparePart: override.SparePart ?? sparePart,
            MaxB2C:   override.MaxB2C   ?? "",
            MinB2B:   override.MinB2B   ?? "",
            GST:      override.GST      ?? "",
          });
        }
      });
    }
  } catch {
    // Supabase not available — serve static data only
  }

  return NextResponse.json({ productMaster, priceList, repairLog });
}

export async function POST(request: Request) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const body = await request.json();
    const { product, sparePart, maxB2C, minB2B, gst, changedBy, isNew } = body;

    if (!product || !sparePart || !changedBy) {
      return NextResponse.json({ error: "product, sparePart and changedBy are required" }, { status: 400 });
    }

    const complaintId = makeId(product, sparePart);
    const now = new Date().toISOString();

    // Get existing values for history comparison
    const priceList = priceListBase as PriceRow[];
    const existing  = priceList.find(r => r.Product === product && r.SparePart === sparePart);

    const rows: { complaint_id: string; field: string; value: string; updated_by: string; created_at: string }[] = [];

    if (isNew) {
      // For new parts, write all 3 fields unconditionally
      rows.push({ complaint_id: complaintId, field: "max_b2c", value: maxB2C || "", updated_by: changedBy, created_at: now });
      rows.push({ complaint_id: complaintId, field: "min_b2b", value: minB2B || "", updated_by: changedBy, created_at: now });
      rows.push({ complaint_id: complaintId, field: "gst",     value: gst     || "", updated_by: changedBy, created_at: now });
      rows.push({ complaint_id: complaintId, field: "new_part",value: `${product} | ${sparePart}`, updated_by: changedBy, created_at: now });
    } else {
      if ((maxB2C ?? "") !== (existing?.MaxB2C ?? "")) rows.push({ complaint_id: complaintId, field: "max_b2c", value: maxB2C || "", updated_by: changedBy, created_at: now });
      if ((minB2B ?? "") !== (existing?.MinB2B ?? "")) rows.push({ complaint_id: complaintId, field: "min_b2b", value: minB2B || "", updated_by: changedBy, created_at: now });
      if ((gst    ?? "") !== (existing?.GST    ?? "")) rows.push({ complaint_id: complaintId, field: "gst",     value: gst     || "", updated_by: changedBy, created_at: now });
    }

    if (rows.length > 0) {
      const { error } = await supabaseAdmin().from("complaint_updates").insert(rows);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
