/**
 * Shared vocabulary for ticket updates — used by BOTH the UI dropdowns and
 * server-side validation in /api/updates. Keep in sync with the sheet's
 * "Action Taken" values so bucket logic keeps working.
 */
export const STATUS_OPTIONS = [
  "Complaint Register",
  "Pickup Arranged",
  "Pickup Delay From Cust.",
  "Pickup successful",
  "Received in Okhla",
  "Pending For Repair",
  "Repair Done But payment issue",
  "Dispatch Schduled",
  "Dispatch But Not Delivered",
  "Payment due from Customer",
  "Re-Open Ticket",
  "Close Ticket",
] as const;

export const TEAM = ["Prachi", "Adil", "Altab", "Asis"] as const;
