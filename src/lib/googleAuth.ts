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
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
