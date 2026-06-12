/**
 * Shared vocabulary for ticket updates — used by BOTH the UI dropdowns and
 * server-side validation in /api/updates. Keep in sync with the sheet's
 * "Action Taken" values so bucket logic keeps working.
 */
export const STATUS_OPTIONS = [
  "Complaint Register",
  "Pickup Arranged",
  "Pickup successful",
  "Pickup Delay From Cust.",
  "Required for Pickup",
  "Received in Okhla",
  "Received in RN",
  "Pending For Repair",
  "Repair Done But payment issue",
  "Repair done Pending For dispatch",
  "Dispatch Schduled",
  "Dispatch But Not Delivered",
  "Payment due from Customer",
  "Delay Due to Customer",
  "Product Video pending from the customer",
  "Cunsultant With Customer",
  "Telephonic Resolution",
  "Duplicate Ticket",
  "Bulk Complaint",
  "RTV",
  "Re-Open Ticket",
  "Close Ticket",
] as const;

export const TEAM = ["Prachi", "Adil", "Altab", "Asis", "Neha"] as const;
