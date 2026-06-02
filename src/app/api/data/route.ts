import { NextResponse } from "next/server";
import Papa from "papaparse";
import type { ComplaintRow } from "@/lib/types";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc/export?format=csv&gid=785949897";

const VALID_MONTHS = [
  "Apr-2025", "May-2025", "Jun-2025", "Jul-2025", "Aug-2025",
  "Sep-2025", "Oct-2025", "Nov-2025", "Dec-2025",
  "Jan-2026", "Feb-2026", "Mar-2026", "Apr-2026",
];

function normalizeMonth(m: string) {
  const clean = m.trim();
  return VALID_MONTHS.includes(clean) ? clean : "";
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

export async function GET() {
  try {
    const res = await fetch(SHEET_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);

    const csv = await res.text();

    const { data, errors } = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      console.warn("CSV parse warnings:", errors.slice(0, 3));
    }

    const rows: ComplaintRow[] = data
      .map((row) => {
        const customerNameKey =
          Object.keys(row).find((k) => k.includes("Customer Name")) ||
          "Customer Name";

        const actionTaken = (row["Action Taken"] || "").trim();
        const isOpen = actionTaken !== "Close Ticket";

        const daysPendingRaw = row["Days Pending"] || "";
        const daysPending = daysPendingRaw
          ? parseInt(daysPendingRaw, 10) || null
          : null;

        return {
          sequenceNo: (row["Sequence No"] || "").trim(),
          complaintDate: (row["Complaint Date"] || "").trim(),
          monthYear: normalizeMonth(row["Month-Year"] || ""),
          requestBy: normalizeName(row["Request by"] || ""),
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
          closeDate: (row["Close Date"] || "").trim(),
          returnPickupDate: (row["Return Pickup Date"] || "").trim(),
          productReceivedDate: (row["Product Received Date"] || "").trim(),
          dispatchTrackingDate: (row["Dispatch Tracking Date"] || "").trim(),
          daysPending,
          ageingDays: (row["Ageing Days"] || "").trim(),
          isOpen,
        };
      })
      .filter((r) => r.sequenceNo !== "");

    return NextResponse.json({ rows, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error("Data fetch error:", err);
    return NextResponse.json(
      { rows: [], lastUpdated: new Date().toISOString(), error: "Failed to load data" },
      { status: 500 }
    );
  }
}
