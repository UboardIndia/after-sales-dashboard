/**
 * Standardize messy product names from the sheets into one canonical
 * display name per product ("CLASSIC 6.5", "classic6.5", "CLASSSIC 6.5"
 * → "Classic 6.5"). Matching ignores case, spaces and punctuation
 * (but keeps "+" so "Evo +" stays distinct from "Evo").
 *
 * Built from the actual 89 unique values across FY25-26 + FY26-27
 * (12 Jun 2026). Unknown values pass through unchanged (trimmed).
 */

const PRODUCT_MAP: Record<string, string> = {
  // Scooters
  "2wheelscooter": "2 Wheel Scooter",
  "tygatec2wheelscooterblue": "2 Wheel Scooter",
  "tygatec2wheelscooterred": "2 Wheel Scooter",
  "3wheelscooter": "3 Wheel Scooter",
  "tygatec3wheelscooter": "3 Wheel Scooter",
  "tygatec3wheelscooteryellow": "3 Wheel Scooter",
  "kidselectricscooter": "Kids Electric Scooter",

  // Drifters / karts
  "360drifter": "360 Drifter",
  "drifter": "Drifter",
  "drifterbox": "Drifter Box",
  "bigecartdrifter": "Big E Cart Drifter",
  "bumpercar": "Bumper Car",
  "tygatecswingcaryellow": "Swing Car",

  // Hoverboards
  "classic65": "Classic 6.5",
  "classsic65": "Classic 6.5",
  "classic65storepic": "Classic 6.5",
  "classic65demo": "Classic 6.5",
  "classic65hb": "Classic 6.5",
  "classic65lite": "Classic 6.5 Lite",
  "classiclite": "Classic 6.5 Lite",
  "chinese65": "Chinese 6.5",
  "hybird65": "Hybrid 6.5",
  "hybrid65": "Hybrid 6.5",
  "hybird85": "Hybrid 8.5",
  "hybrid85": "Hybrid 8.5",
  "hybird10": "Hybrid 10",
  "hybrid10": "Hybrid 10",
  "cxmhb": "CXM HB",
  "suv": "SUV",
  "suvoffroader": "SUV",
  "infinity": "Infinity",
  "infinitystorepic": "Infinity",
  "evo": "Evo",
  "evo+": "Evo +",
  "bolt": "Bolt",
  "x7": "X7",
  "xpro": "X-Pro",
  "xl": "XL",
  "a1": "A1",
  "mini8": "Mini 8",
  "mini10": "Mini 10",
  "mini10explorer": "Mini 10",

  // Tygatec T-series
  "t1": "T1",
  "t2": "T2",
  "t4": "T4",
  "t6": "T6",
  "g281t6": "T6",
  "t6+withapp": "T6 + With App",
  "t9": "T9",

  // Bikes
  "spacebike": "Space Bike",
  "discoverybike": "Discovery Bike",
  "discoverymini": "Discovery Mini",
  "pathfinder": "Pathfinder",
  "pathfinderbike": "Pathfinder",

  // E-kick
  "ekick": "E Kick",
  "ekickjr": "E Kick Jr.",
  "kkick": "K Kick",

  // RC / toys
  "rccar": "RC Car",
  "turborccar": "RC Car",
  "tygatecbatteryrccar": "RC Car",
  "supersonic": "Supersonic",
  "suuperlooper": "Super Looper",
  "airhockey": "Air Hockey",

  // Explorer
  "explorera111": "Explorer A1 11",
  "explorersuvcar": "Explorer SUV Car",
  "explorerxl19": "Explorer XL 19",

  // Misc / accessories
  "charger": "Charger",
  "chargingslot": "Charging Slot",
  "sparepart": "Spare Part",
  "flashingwheel": "Flashing Wheel",
  "demo": "Demo",
  "box": "Box",
};

/** lowercase, keep only letters/digits/+ ("Classic 6.5 Lite" → "classic65lite") */
function productKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9+]/g, "");
}

export function normalizeProduct(raw: string): string {
  const trimmed = (raw || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return PRODUCT_MAP[productKey(trimmed)] ?? trimmed;
}
