/**
 * MOCK bot-sheet data — preview only, until Alok's bot sheet is connected.
 * Used by /verify (queue UI) and the header badge count.
 * When the real sheet goes live, replace this with an API fetch.
 */

export interface BotEntry {
  botId: string;
  timestamp: string;
  customerName: string;
  mobile: string;
  brand: string;
  product: string;
  issue: string;
  /** suggested helpdesk matches (auto-found by mobile / name) */
  matches: { id: string; seq: string; date: string; product: string; status: string; matchedOn: string }[];
}

export const MOCK_BOT_ENTRIES: BotEntry[] = [
  {
    botId: "BOT-0041",
    timestamp: "02/06/2026 14:32",
    customerName: "Ramesh Verma",
    mobile: "9811045672",
    brand: "UBOARD",
    product: "360 Drifter",
    issue: "Scooter not charging, red light blinking continuously",
    matches: [
      { id: "FY 2026-27::204", seq: "204", date: "28/05/2026", product: "360 Drifter", status: "Pickup Arranged", matchedOn: "Same mobile number" },
    ],
  },
  {
    botId: "BOT-0042",
    timestamp: "02/06/2026 15:10",
    customerName: "Sunita Devi",
    mobile: "9990812345",
    brand: "TYGATEC",
    product: "Rc Car",
    issue: "Remote not pairing after battery change",
    matches: [],
  },
  {
    botId: "BOT-0043",
    timestamp: "02/06/2026 16:05",
    customerName: "Vikram S",
    mobile: "8800943210",
    brand: "UBOARD",
    product: "X7",
    issue: "Handle loose, making noise while riding",
    matches: [
      { id: "FY 2026-27::217", seq: "217", date: "01/06/2026", product: "Infinity", status: "Complaint Register", matchedOn: "Similar name + recent date" },
      { id: "FY 2026-27::198", seq: "198", date: "25/05/2026", product: "X7", status: "Close Ticket", matchedOn: "Same mobile number" },
    ],
  },
  {
    botId: "BOT-0044",
    timestamp: "02/06/2026 16:48",
    customerName: ".",
    mobile: "7012398765",
    brand: "",
    product: "test",
    issue: "asdfgh",
    matches: [],
  },
];

/** Pending = entries with no decision yet. Mock: all entries are pending. */
export const PENDING_BOT_COUNT = MOCK_BOT_ENTRIES.length;

/** Real bot sheet entry count — fetched server-side and passed as a prop if needed. */
export const REAL_BOT_SHEET_ID = "1UXYV_aiQnwm7llAbNSu4x0noS2vztj3My3aNrJmi9lU";
