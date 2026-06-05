import { NextResponse } from "next/server";
import productMaster from "@/data/product-master.json";
import priceList from "@/data/price-list.json";
import repairLog from "@/data/repair-log.json";

export async function GET() {
  return NextResponse.json({ productMaster, priceList, repairLog });
}
