import { NextResponse } from "next/server";
import productMaster from "@/data/product-master.json";
import priceListBase from "@/data/price-list.json";
import repairLog from "@/data/repair-log.json";

export async function GET() {
  let priceList = [...(priceListBase as { Product: string; SparePart: string; MaxB2C: string; MinB2B: string; GST: string }[])];

  // Merge Supabase custom rows (overrides + additions)
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { data: custom } = await supabaseAdmin()
      .from("spare_parts_custom")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (custom && custom.length > 0) {
      custom.forEach((row: { product: string; spare_part: string; max_b2c: string; min_b2b: string; gst: string }) => {
        const idx = priceList.findIndex(
          (r) => r.Product === row.product && r.SparePart === row.spare_part
        );
        const mapped = { Product: row.product, SparePart: row.spare_part, MaxB2C: row.max_b2c || "", MinB2B: row.min_b2b || "", GST: row.gst || "" };
        if (idx >= 0) {
          priceList[idx] = mapped; // override
        } else {
          priceList.push(mapped); // new entry
        }
      });
    }
  } catch {
    // Supabase not configured or tables don't exist — use static data only
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

    // Get old values for history
    const priceList = priceListBase as { Product: string; SparePart: string; MaxB2C: string; MinB2B: string; GST: string }[];
    const existing = priceList.find((r) => r.Product === product && r.SparePart === sparePart);

    // Upsert into spare_parts_custom
    const { error: upsertError } = await supabaseAdmin()
      .from("spare_parts_custom")
      .upsert(
        {
          product,
          spare_part: sparePart,
          max_b2c: maxB2C || "",
          min_b2b: minB2B || "",
          gst: gst || "",
          is_deleted: false,
          created_by: changedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product,spare_part" }
      );

    if (upsertError) throw new Error(upsertError.message);

    // Log history entries for changed fields
    const historyRows = [];
    if (isNew) {
      historyRows.push({ product, spare_part: sparePart, field_changed: "new_part", old_value: "", new_value: `Max:${maxB2C} Min:${minB2B} GST:${gst}`, changed_by: changedBy });
    } else {
      if (existing?.MaxB2C !== maxB2C) historyRows.push({ product, spare_part: sparePart, field_changed: "Max B2C", old_value: existing?.MaxB2C || "", new_value: maxB2C || "", changed_by: changedBy });
      if (existing?.MinB2B !== minB2B) historyRows.push({ product, spare_part: sparePart, field_changed: "Min B2B", old_value: existing?.MinB2B || "", new_value: minB2B || "", changed_by: changedBy });
      if (existing?.GST !== gst) historyRows.push({ product, spare_part: sparePart, field_changed: "GST", old_value: existing?.GST || "", new_value: gst || "", changed_by: changedBy });
    }

    if (historyRows.length > 0) {
      await supabaseAdmin().from("spare_parts_history").insert(historyRows);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("relation") || msg.includes("42P01")) {
      return NextResponse.json({ error: "TABLES_NOT_SETUP", message: "Run the setup SQL in your Supabase dashboard first." }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
