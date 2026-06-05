export interface ComplaintRow {
  id: string;
  fiscalYear: string;
  sequenceNo: string;
  complaintDate: string;
  monthYear: string;
  requestBy: string;
  customerName: string;
  customerMobile: string;
  brand: string;
  productName: string;
  platform: string;
  complaintType: string;
  warrantyStatus: string;
  issueType: string;
  actionTaken: string;
  serviceCenter: string;
  headRemarks: string;
  uboardRemarks: string;
  paymentType: string;
  closeDate: string;
  returnPickupDate: string;
  productReceivedDate: string;
  dispatchTrackingDate: string;
  daysPending: number | null;
  daysInFactory: number | null;
  ageingDays: string;
  isOpen: boolean;
  /** Overlay fields — written from the dashboard, stored in Supabase (never in the sheets). */
  assignedTo?: string;
  dashboardRemark?: string;
  overlayUpdatedBy?: string;
  overlayUpdatedAt?: string;
}

export interface ApiResponse {
  rows: ComplaintRow[];
  lastUpdated: string;
  error?: string;
}

/** Accountability buckets — who owns an open unit right now. */
export type Bucket =
  | "Pending Pickup"      // not yet in factory — Altab
  | "Pending Repair"      // in factory, awaiting repair — Adil
  | "Pending Dispatch"    // repaired, not shipped out — Altab
  | "Pending Customer"    // payment / reply / closure blocked — Prachi
  | "Other";

export const BUCKET_OWNER: Record<Bucket, string> = {
  "Pending Pickup":   "Altab",
  "Pending Repair":   "Adil",
  "Pending Dispatch": "Altab",
  "Pending Customer": "Prachi",
  "Other":            "—",
};

/** A row from the companion "Tracking" sheet (manual overrides + assignments). */
export interface TrackingRecord {
  sequenceNo: string;
  bucket?: Bucket | "";
  assignedTo?: string;
  assignedDate?: string;
  note?: string;
  lastUpdated?: string;
}
