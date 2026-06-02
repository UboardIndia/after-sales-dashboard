import type { ComplaintRow, Bucket, TrackingRecord } from "./types";

/** Parse a DD/MM/YYYY (or DD-MM-YYYY) date string into a Date, or null. */
export function parseDMY(s: string): Date | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  let [, dd, mm, yy] = m;
  const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
  const d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
  return isNaN(d.getTime()) ? null : d;
}

/** Whole days between a date string and now (>= 0), or null if unparseable. */
export function daysSince(s: string): number | null {
  const d = parseDMY(s);
  if (!d) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/**
 * Auto-derive an accountability bucket from the main-sheet status.
 * The companion-sheet override (if present) always wins.
 */
export function deriveBucket(r: ComplaintRow): Bucket {
  const a = r.actionTaken.trim();

  if (
    a === "Payment due from Customer" ||
    a === "Repair Done But payment issue"
  )
    return "Pending Customer";

  if (a === "Dispatch But Not Delivered") return "Pending Dispatch";

  if (a === "Received in Okhla" || a === "Pending For Repair")
    return "Pending Repair";

  if (
    a === "Complaint Register" ||
    a === "Pickup Arranged" ||
    a === "Pickup successful" ||
    a === "Pickup Delay From Cust." ||
    a === ""
  ) {
    // If the unit has physically reached the factory, it's a repair job now.
    return r.productReceivedDate ? "Pending Repair" : "Pending Pickup";
  }

  return r.productReceivedDate ? "Pending Repair" : "Other";
}

/** True when the unit is physically in the factory. */
export function isInFactory(bucket: Bucket): boolean {
  return bucket === "Pending Repair" || bucket === "Pending Dispatch";
}

export interface EnrichedRow extends ComplaintRow {
  bucket: Bucket;
  daysInFactory: number | null;
  daysSinceAssigned: number | null;
  assignedTo: string;
  assignedDate: string;
  note: string;
  isManualBucket: boolean;
}

/** Merge a complaint row with its companion-sheet tracking record. */
export function enrich(
  r: ComplaintRow,
  track: TrackingRecord | undefined
): EnrichedRow {
  const manualBucket = track?.bucket ? (track.bucket as Bucket) : null;
  const bucket = manualBucket ?? deriveBucket(r);
  return {
    ...r,
    bucket,
    daysInFactory: daysSince(r.productReceivedDate),
    daysSinceAssigned: track?.assignedDate ? daysSince(track.assignedDate) : null,
    assignedTo: track?.assignedTo ?? "",
    assignedDate: track?.assignedDate ?? "",
    note: track?.note ?? "",
    isManualBucket: !!manualBucket,
  };
}
