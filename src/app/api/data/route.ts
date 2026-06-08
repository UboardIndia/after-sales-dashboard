import { NextResponse } from "next/server";
import Papa from "papaparse";
import type { ComplaintRow } from "@/lib/types";

// Run per-request so Supabase overlay updates appear instantly.
// (Sheet fetches below still cache for 5 min via `next.revalidate`.)
export const dynamic = "force-dynamic";

type DateOrder = "DMY" | "MDY";

interface SheetConfig {
  fiscalYear: string;
  url: string;
  /** Date format used in this sheet's date columns. */
  dateOrder: DateOrder;
  /** Column holding the unique complaint/sequence number. */
  seqCol: string;
}

const SHEETS: SheetConfig[] = [
  {
    fiscalYear: "FY 2025-26",
    url: "https://docs.google.com/spreadsheets/d/1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc/export?format=csv&gid=785949897",
    dateOrder: "DMY",
    seqCol: "Sequence No",
  },
  {
    fiscalYear: "FY 2026-27",
    url: "https://docs.google.com/spreadsheets/d/1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU/export?format=csv&gid=1166573888",
    dateOrder: "MDY",
    seqCol: "Complaint No",
  },
];

const MONTH_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-20\d\d$/;

function normalizeMonth(m: string) {
  const clean = m.trim();
  return MONTH_RE.test(clean) ? clean : "";
}

function normalizeBrand(b: string) {
  const u = b.trim().toUpperCase();
  if (u === "TYAGTEC") return "TYGATEC";
  return u || "Other";
}

function normalizePlatform(p: string) {
  const l = p.trim().toLowerCase();
  if (l === "delar" || l === "dealer") return "Dealer";
  if (l === "amazon" || l === "amazon ") return "Amazon";
  if (l === "hamleys") return "Hamleys";
  if (l === "uboard website") return "Uboard Website";
  if (l === "tygatec website") return "Tygatec Website";
  if (l === "flipkart") return "Flipkart";
  if (l === "firstcry") return "FirstCry";
  if (l === "babyshop") return "Babyshop";
  return p.trim() || "Other";
}

function normalizeName(n: string) {
  return n.trim().replace(/\s+$/, "");
}

/** Parse a date string using the given field order; returns a Date or null. */
function parseDate(s: string, order: DateOrder): Date | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  let c = parseInt(m[3], 10);
  let day: number, mon: number;
  if (order === "MDY") {
    mon = a;
    day = b;
  } else {
    day = a;
    mon = b;
  }
  if (c < 100) c += 2000;
  const d = new Date(c, mon - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as DD/MM/YYYY for consistent display across sheets. */
function toDMY(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}

function ageingBucket(days: number): string {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function findKey(row: Record<string, string>, re: RegExp, fallback: string): string {
  return Object.keys(row).find((k) => re.test(k)) || fallback;
}

function parseSheet(csv: string, cfg: SheetConfig): ComplaintRow[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  const now = new Date();

  return data
    .map((row) => {
      const customerNameKey = findKey(row, /Customer Name/i, "Customer Name");
      const requestByKey = findKey(row, /^Request\s*by$/i, "Request By");

      const seq = (row[cfg.seqCol] || "").trim();
      const actionTaken = (row["Action Taken"] || "").trim();
      const isOpen = actionTaken !== "Close Ticket";

      const cDate = parseDate(row["Complaint Date"] || "", cfg.dateOrder);
      const clDate = parseDate(row["Close Date"] || "", cfg.dateOrder);
      const prDate = parseDate(row["Product Received Date"] || "", cfg.dateOrder);
      const rpDate = parseDate(row["Return Pickup Date"] || "", cfg.dateOrder);
      const dtDate = parseDate(row["Dispatch Tracking Date"] || "", cfg.dateOrder);

      // Days Pending: prefer the sheet's own value, else compute.
      const providedDays = (row["Days Pending"] || "").trim();
      let daysPending: number | null = providedDays
        ? parseInt(providedDays, 10) || null
        : null;
      if (daysPending == null && cDate) {
        daysPending = daysBetween(cDate, isOpen ? now : clDate ?? now);
      }

      // Ageing bucket: prefer sheet value, else derive from daysPending.
      let ageingDays = (row["Ageing Days"] || "").trim();
      if (!ageingDays && daysPending != null) ageingDays = ageingBucket(daysPending);

      // Days in factory: only meaningful while open and physically received.
      const daysInFactory = prDate && isOpen ? daysBetween(prDate, now) : null;

      return {
        id: `${cfg.fiscalYear}::${seq}`,
        fiscalYear: cfg.fiscalYear,
        sequenceNo: seq,
        complaintDate: toDMY(cDate) || (row["Complaint Date"] || "").trim(),
        monthYear: normalizeMonth(row["Month-Year"] || ""),
        requestBy: normalizeName(row[requestByKey] || ""),
        customerName: ((row[customerNameKey] || "") + "").trim(),
        customerMobile: (row["Customer Mobile No"] || "").trim(),
        brand: normalizeBrand(row["Brand"] || ""),
        productName: (row["Product Name"] || "").trim(),
        platform: normalizePlatform(row["Platform"] || ""),
        complaintType: (row["Complaint Type"] || "").trim(),
        warrantyStatus: (row["Warranty Status"] || "").trim(),
        issueType: (row["Issue Type"] || "").trim(),
        actionTaken,
        serviceCenter: (row["Service Center"] || "").trim(),
        headRemarks: (row["Head Remarks"] || "").trim(),
        uboardRemarks: (row["Uboard Remarks"] || "").trim(),
        paymentType: (row["Payment type"] || "").trim(),
        closeDate: toDMY(clDate),
        returnPickupDate: toDMY(rpDate),
        productReceivedDate: toDMY(prDate),
        dispatchTrackingDate: toDMY(dtDate),
        daysPending,
        daysInFactory,
        ageingDays,
        isOpen,
      } as ComplaintRow;
    })
    .filter((r) => r.sequenceNo !== "");
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SHEETS.map(async (cfg) => {
        const res = await fetch(cfg.url, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error(`${cfg.fiscalYear} fetch failed: ${res.status}`);
        return parseSheet(await res.text(), cfg);
      })
    );

    const rows: ComplaintRow[] = [];
    const failed: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") rows.push(...r.value);
      else failed.push(SHEETS[i].fiscalYear);
    });

    if (rows.length === 0) throw new Error("All sheets failed to load");

    // Overlay dashboard-made updates from Supabase (latest value per complaint+field).
    // Sheets stay read-only; this is the write layer. Failure here must not break the dashboard.
    try {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const { data: updates, error } = await supabaseAdmin()
        .from("complaint_updates")
        .select("complaint_id, field, value, updated_by, created_at")
        .order("created_at", { ascending: true }); // later rows win when reduced below
      if (error) throw error;

      if (updates && updates.length > 0) {
        const latest = new Map<string, { value: string; by: string; at: string }>();
        for (const u of updates) {
          latest.set(`${u.complaint_id}::${u.field}`, {
            value: u.value ?? "",
            by: u.updated_by,
            at: u.created_at,
          });
        }
        for (const row of rows) {
          const status = latest.get(`${row.id}::status`);
          const assigned = latest.get(`${row.id}::assigned_to`);
          const remark = latest.get(`${row.id}::remark`);
          if (status && status.value) {
            row.actionTaken = status.value;
            row.isOpen = status.value !== "Close Ticket";
          }
          if (assigned && assigned.value) row.assignedTo = assigned.value;
          if (remark && remark.value) row.dashboardRemark = remark.value;
          const newest = [status, assigned, remark]
            .filter(Boolean)
            .sort((a, b) => (a!.at < b!.at ? 1 : -1))[0];
          if (newest) {
            row.overlayUpdatedBy = newest.by;
            row.overlayUpdatedAt = newest.at;
          }
        }
      }
    } catch (overlayErr) {
      console.error("Supabase overlay failed (continuing with sheet data):", overlayErr);
    }

    // Merge approved bot entries as real complaint rows.
    // bot_verifications.decision='new' = Prachi approved it.
    // Draft data is stored in the note field as JSON.
    try {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const { data: verifs } = await supabaseAdmin()
        .from("bot_verifications")
        .select("bot_id, note, created_at")
        .eq("decision", "new");

      if (verifs && verifs.length > 0) {
        const now = new Date();
        for (const v of verifs) {
          let draft: Record<string, string> = {};
          try { draft = JSON.parse(v.note || "{}"); } catch { /* ignore */ }

          const cDate = draft.timestamp ? new Date(draft.timestamp) : new Date(v.created_at);
          const dp = Math.max(0, Math.floor((now.getTime() - cDate.getTime()) / 86_400_000));

          const botRow: ComplaintRow = {
            id: `BOT::${v.bot_id}`,
            fiscalYear: "FY 2026-27",
            sequenceNo: v.bot_id,
            complaintDate: toDMY(cDate),
            monthYear: normalizeMonth(
              cDate.toLocaleString("en-IN", { month: "short" }) + "-" + cDate.getFullYear()
            ),
            requestBy: "WhatsApp Bot",
            customerName: draft.customerName || "",
            customerMobile: draft.mobile || "",
            brand: normalizeBrand(draft.brand || ""),
            productName: draft.product || "",
            platform: normalizePlatform(draft.platform || ""),
            complaintType: "Customer Complaint",
            warrantyStatus: draft.warranty || "",
            issueType: draft.issue || "",
            actionTaken: "Complaint Register",
            serviceCenter: "",
            headRemarks: "",
            uboardRemarks: "",
            paymentType: "",
            closeDate: "",
            returnPickupDate: "",
            productReceivedDate: "",
            dispatchTrackingDate: "",
            daysPending: dp,
            daysInFactory: null,
            ageingDays: ageingBucket(dp),
            isOpen: true,
          };
          rows.push(botRow);
        }
      }
    } catch (botErr) {
      console.error("Bot merge failed (continuing):", botErr);
    }

    return NextResponse.json({
      rows,
      lastUpdated: new Date().toISOString(),
      ...(failed.length ? { error: `Could not load: ${failed.join(", ")}` } : {}),
    });
  } catch (err) {
    console.error("Data fetch error:", err);
    return NextResponse.json(
      { rows: [], lastUpdated: new Date().toISOString(), error: "Failed to load data" },
      { status: 500 }
    );
  }
}
