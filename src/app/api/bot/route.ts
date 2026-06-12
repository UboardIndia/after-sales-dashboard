import { NextResponse } from "next/server";
import Papa from "papaparse";
import { fetchSheetRows, rowsToCSV } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

const BOT_SHEET_ID = "1UXYV_aiQnwm7llAbNSu4x0noS2vztj3My3aNrJmi9lU";

function cleanMobile(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[\s\-().+]/g, "");
  // Strip leading 91 if 12 digits
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) return cleaned;
  // Not a valid number (SKIP, Ok, etc.)
  return "";
}

// Which WhatsApp bot line a complaint was registered on → reviewer bucket.
// Keys are the last 10 digits of the bot's number.
const BOT_NUMBER_MAP: Record<string, string> = {
  "8800910120": "Prachi Bot", // 918800910120
  "9599913081": "Adil Bot",   // 919599913081
  "9599913082": "Neha Bot",   // 919599913082
};
const DEFAULT_BOT = "Prachi Bot"; // blank / unknown registered number

/**
 * Map the registered-on number (or legacy category text) to a bot bucket.
 * - phone number → name from BOT_NUMBER_MAP (unknown numbers → default)
 * - blank → default (Prachi Bot)
 * - already a name (e.g. "Adil Bot") → kept as-is
 */
function mapCategory(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return DEFAULT_BOT;
  const digits = v.replace(/\D/g, "");
  // Looks like a phone number → translate it
  if (digits.length >= 10 && digits.length === v.replace(/[\s\-().+]/g, "").length) {
    return BOT_NUMBER_MAP[digits.slice(-10)] ?? DEFAULT_BOT;
  }
  return v;
}

export async function GET() {
  try {
    const rows = await fetchSheetRows(BOT_SHEET_ID);
    const csv = rowsToCSV(rows);

    const { data } = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
    });

    const entries = data
      .filter((r) => (r["Complaint Number"] || "").trim().startsWith("SUP-"))
      .map((r) => {
        // "Complaint Registered To" = which bot line received the complaint.
        // Fuzzy header match (case/spacing tolerant); CATEGORY as fallback.
        const regKey =
          Object.keys(r).find((k) => /complaint\s*registered\s*to/i.test(k)) ||
          Object.keys(r).find((k) => /regist/i.test(k));
        const rawCategory = (regKey && r[regKey]?.trim()) || r["CATEGORY"]?.trim() || "";
        return {
        botId:     r["Complaint Number"].trim(),
        timestamp: r["Timestamp"]?.trim() || "",
        month:     r["Month"]?.trim() || "",
        brand:     r["BRAND"]?.trim() || "",
        category:  mapCategory(rawCategory),
        product:   r["PRODUCT"]?.trim() || "",
        issue:     r["ISSUE"]?.trim() || "",
        warranty:  r["WARRENTY STATUS"]?.trim() || "",
        platform:  r["PURCHASE PLATFORM"]?.trim() || "",
        invoice:   r["INVOICE NUMBER"]?.trim() || "",
        mobile:    cleanMobile(r["CALL BACK NUMBER"] || ""),
        mobileRaw: (r["CALL BACK NUMBER"] || "").trim(),
        customerName: r["Customer name"]?.trim() || "",
        hasMobile: cleanMobile(r["CALL BACK NUMBER"] || "") !== "",
        };
      });

    return NextResponse.json({ entries, total: entries.length });
  } catch (err) {
    console.error("Bot sheet error:", err);
    return NextResponse.json({ entries: [], total: 0, error: "Failed to load bot sheet" }, { status: 500 });
  }
}
