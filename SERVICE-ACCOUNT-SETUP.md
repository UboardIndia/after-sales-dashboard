# Google Service Account Setup

Use this to replace "Anyone with link" sharing on any sheet the dashboard reads.
The service account already exists — no new GCP setup needed.

**Service account:** `dashboard-reader@b2b-dashboard-496806.iam.gserviceaccount.com`
**Credentials file:** `D:\MAIN CLAUDE FOLDER\final final cash flow 123\env-local-for-asis.txt`

---

## For each sheet you want to lock down

**Step 1 — Share the sheet with the service account**
1. Open the Google Sheet
2. Click **Share** (top right)
3. Add `dashboard-reader@b2b-dashboard-496806.iam.gserviceaccount.com` as **Viewer**
4. Uncheck "Notify people" → click **Share**
5. Remove "Anyone with the link" access

**Step 2 — Add credentials to the app**
1. Copy `GOOGLE_SERVICE_ACCOUNT_JSON` from the credentials file above
2. Add to `C:\Users\user\after sales dashboard\.env.local`:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON=<paste full JSON here, single line>
   ```
3. Also add to **Vercel → Settings → Environment Variables** (Production)

**Step 3 — Add to Vercel**
- Go to https://vercel.com → after-sales-dashboard project
- Settings → Environment Variables
- Add `GOOGLE_SERVICE_ACCOUNT_JSON` with the full JSON value

---

## Sheets to lock down (do in this order)

| Sheet | Status | Sheet ID |
|---|---|---|
| Bot complaints (Alok's sheet) | ⬜ Pending — currently public | `1UXYV_aiQnwm7llAbNSu4x0noS2vztj3My3aNrJmi9lU` |
| FY 2026-27 helpdesk (live) | ⬜ Pending | `1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU` |
| FY 2025-26 helpdesk (history) | ⬜ Pending | `1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc` |

---

## Code changes needed (when ready to switch)

When sheets are locked, the fetch in `src/app/api/data/route.ts` and
`src/app/api/bot/route.ts` must switch from anonymous CSV export URLs
to authenticated Google Sheets API calls using the service account JSON.

Tag this task in SYSTEM-GAPS.md when complete.
