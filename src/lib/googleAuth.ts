import { GoogleAuth } from "google-auth-library";

/**
 * Returns an access token for Google Sheets API using the service account.
 * Credentials are stored as base64-encoded JSON in GOOGLE_SERVICE_ACCOUNT_JSON.
 */
export async function getGoogleAccessToken(): Promise<string> {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var missing");

  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));

  const auth = new GoogleAuth({
    credentials: json,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // read+write
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error("Failed to get Google access token");
  return tokenResponse.token;
}

/**
 * Fetch all rows from a Google Sheet tab using Sheets API v4.
 * Returns rows as string[][] (first row = headers).
 * tabName: the exact tab name (e.g. "Form responses 1"). Defaults to first sheet.
 */
export async function fetchSheetRows(sheetId: string, tabName?: string): Promise<string[][]> {
  const token = await getGoogleAccessToken();
  const range = tabName ? encodeURIComponent(tabName) : "A1:ZZ";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sheets API failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.values as string[][]) ?? [];
}

/**
 * Write a single value to a specific cell in a Google Sheet.
 * Finds the target row by matching seqValue in seqColName, then writes
 * value into the column named targetColName.
 *
 * Returns: "ok" | "row_not_found" | "col_not_found" | error message
 */
export async function writeSheetField(
  sheetId: string,
  tabName: string,
  seqColName: string,
  seqValue: string,
  targetColName: string,
  value: string
): Promise<"ok" | string> {
  try {
    // Fetch all data (no cache — need current state for row lookup)
    const token = await getGoogleAccessToken();
    const range = encodeURIComponent(tabName);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return `Sheets read failed: ${res.status} — ${body.slice(0, 100)}`;
    }
    const json = await res.json();
    const rows: string[][] = json.values ?? [];
    if (rows.length < 2) return "row_not_found";

    const headers = rows[0].map((h) => h.trim());
    const seqIdx    = headers.findIndex((h) => h === seqColName);
    const targetIdx = headers.findIndex((h) => h === targetColName);
    if (seqIdx    === -1) return `col_not_found:${seqColName}`;
    if (targetIdx === -1) return `col_not_found:${targetColName}`;

    // Find the data row (rows[0] = header, rows[1] = first data row = sheet row 2)
    const dataRowIdx = rows.slice(1).findIndex((r) => (r[seqIdx] ?? "").trim() === seqValue.trim());
    if (dataRowIdx === -1) return "row_not_found";

    const sheetRowNumber = dataRowIdx + 2; // +1 for header, +1 for 1-based index
    const colLetter = colIndexToLetter(targetIdx);
    const cellRange = encodeURIComponent(`${tabName}!${colLetter}${sheetRowNumber}`);
    const writeUrl  = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${cellRange}?valueInputOption=USER_ENTERED`;

    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [[value]] }),
    });

    if (!writeRes.ok) {
      const body = await writeRes.text().catch(() => "");
      return `Sheets write failed: ${writeRes.status} — ${body.slice(0, 100)}`;
    }

    return "ok";
  } catch (err) {
    return `Exception: ${(err as Error).message}`;
  }
}

export interface SafeWriteResult {
  status: "ok" | "blocked" | "error";
  /** machine-readable reason when blocked/error */
  reason?: string;
  /** value the cell held before the write (only on ok) */
  oldValue?: string;
}

/** Last-10-digits comparison so "+91 98765 43210" matches "9876543210". */
function sameMobile(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "").slice(-10);
  const db = b.replace(/\D/g, "").slice(-10);
  return da.length === 10 && da === db;
}

/**
 * Safety-hardened single-cell write. Layers, in order:
 *  1. Value whitelist  — rejects values outside `allowedValues` (if given).
 *  2. Unique row match — blocks if 0 or >1 rows share the seq number.
 *  3. Identity check   — blocks if the row's customer mobile doesn't match
 *                        `expectedMobile` (when both sides have a number).
 *  4. Old-value capture — returns the previous cell value for the audit log.
 *  5. Read-back verify — re-reads the cell after writing; errors on mismatch.
 * Never touches more than one cell; cannot delete rows or clear ranges.
 */
export async function safeWriteSheetField(opts: {
  sheetId: string;
  tabName: string;
  seqColName: string;
  seqValue: string;
  targetColName: string;
  value: string;
  expectedMobile?: string;
  allowedValues?: readonly string[];
}): Promise<SafeWriteResult> {
  const { sheetId, tabName, seqColName, seqValue, targetColName, value } = opts;
  try {
    if (opts.allowedValues && !opts.allowedValues.includes(value)) {
      return { status: "blocked", reason: `invalid_value:${value}` };
    }

    const token = await getGoogleAccessToken();
    const range = encodeURIComponent(tabName);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return { status: "error", reason: `read_failed:${res.status}` };
    const rows: string[][] = (await res.json()).values ?? [];
    if (rows.length < 2) return { status: "blocked", reason: "row_not_found" };

    const headers = rows[0].map((h) => h.trim());
    const seqIdx = headers.findIndex((h) => h === seqColName);
    const targetIdx = headers.findIndex((h) => h === targetColName);
    const mobileIdx = headers.findIndex((h) => /Customer Mobile/i.test(h));
    if (seqIdx === -1) return { status: "blocked", reason: `col_not_found:${seqColName}` };
    if (targetIdx === -1) return { status: "blocked", reason: `col_not_found:${targetColName}` };

    // Unique row match — a duplicated complaint number means we can't be sure
    // which row is right, so we refuse rather than guess.
    const matches: number[] = [];
    rows.slice(1).forEach((r, i) => {
      if ((r[seqIdx] ?? "").trim() === seqValue.trim()) matches.push(i);
    });
    if (matches.length === 0) return { status: "blocked", reason: "row_not_found" };
    if (matches.length > 1) return { status: "blocked", reason: "duplicate_complaint_no" };

    const dataRowIdx = matches[0];
    const row = rows[1 + dataRowIdx];

    // Identity check: if the caller told us which customer this is, the sheet
    // row must agree — protects against shuffled/re-sorted rows.
    if (opts.expectedMobile && mobileIdx !== -1) {
      const sheetMobile = (row[mobileIdx] ?? "").trim();
      if (sheetMobile && !sameMobile(sheetMobile, opts.expectedMobile)) {
        return { status: "blocked", reason: "customer_mismatch" };
      }
    }

    const oldValue = (row[targetIdx] ?? "").trim();
    const sheetRowNumber = dataRowIdx + 2;
    const colLetter = colIndexToLetter(targetIdx);
    const cellA1 = `${tabName}!${colLetter}${sheetRowNumber}`;
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(cellA1)}?valueInputOption=USER_ENTERED`;
    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[value]] }),
    });
    if (!writeRes.ok) return { status: "error", reason: `write_failed:${writeRes.status}` };

    // Read back the cell to confirm the write landed.
    const verifyRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(cellA1)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (verifyRes.ok) {
      const got = ((await verifyRes.json()).values?.[0]?.[0] ?? "").toString().trim();
      if (got !== value.trim()) return { status: "error", reason: "verify_mismatch" };
    }

    return { status: "ok", oldValue };
  } catch (err) {
    return { status: "error", reason: (err as Error).message };
  }
}

/** Convert 0-based column index to A1 letter(s). 0→A, 25→Z, 26→AA, etc. */
function colIndexToLetter(index: number): string {
  let result = "";
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/**
 * Convert rows[][] to CSV string (for compatibility with papaparse).
 */
export function rowsToCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row.map((cell) => (cell.includes(",") || cell.includes('"') || cell.includes("\n")
        ? `"${cell.replace(/"/g, '""')}"` : cell
      )).join(",")
    )
    .join("\n");
}
