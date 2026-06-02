# After Sales Dashboard — Ownership Handover

**Prepared for:** Asis
**Handover from:** UBOARD (current owner)
**Date:** June 2026
**Live dashboard:** https://after-sales-dashboard.vercel.app

This document contains **everything** needed to fully own, run, change, and deploy the
After Sales Dashboard. Read it top to bottom once, then keep it as reference.

---

## 0. TL;DR — what you are receiving

| Thing | What it is | Action needed |
|---|---|---|
| **GitHub repo** | All the source code + history | Get added as owner/admin (Section 2) |
| **Vercel project** | Hosting + auto-deploy | Get added as member, or transfer (Section 3) |
| **2 Google Sheets** | The live data sources | Get "Anyone with link → Viewer" stays on (Section 4) |
| **Login credentials** | To open the dashboard | In Section 5 (change after handover) |
| **Environment variables** | Secrets the app needs | In Section 5 |
| **This zip** | A full copy of the project folder | Unzip locally (Section 6) |
| **Claude Code context** | `CLAUDE.md` in the repo | Already included — Claude Code reads it automatically |

---

## 1. What this dashboard is

A web dashboard for the UBOARD / TYGATEC after-sales (complaints) operation. It reads
complaint data **live** from two Google Sheets and shows:

- **% Closed** headline, open/closed/total, days-pending KPIs
- **Accountability Board** — every open complaint bucketed by who owns the next move
  (Altab = pickup/dispatch, Adil = repair, Prachi = customer)
- **Why complaints are still open** (issue-type breakdown of open tickets)
- Monthly trend, complaint source, issue types, product breakdown, issue×product heatmap
- **Team performance** table (by "Request By")
- **Open Tickets** table with search + filters (by person, product, status, issue, brand)
- **Year filter** — FY 2025-26 and FY 2026-27

It is **read-only** against the Google Sheets — the dashboard never writes to them.

---

## 2. GitHub — source code

- **Repo:** https://github.com/UboardIndia/after-sales-dashboard
- **Current owner account:** `UboardIndia`

**To transfer access to Asis — choose ONE:**

**Option A (recommended — keep same URL): add Asis as admin collaborator**
1. Go to the repo → **Settings → Collaborators** (or **Settings → Access**).
2. Click **Add people**, enter Asis's GitHub username/email.
3. Set role to **Admin**.
4. Asis accepts the email invite.

**Option B (full transfer — URL changes to Asis's account)**
1. Repo → **Settings → General → Danger Zone → Transfer ownership**.
2. Enter Asis's GitHub username and confirm.
   *(Note: the Vercel link may need reconnecting after a transfer — see Section 3.)*

> Asis needs a GitHub account. The repo is currently **public**; you can keep it public
> or switch to private in Settings (private repos still deploy to Vercel fine).

---

## 3. Vercel — hosting & auto-deploy

- **Project:** `after-sales-dashboard`
- **Current account:** `hello-81823896`
- **Production URL:** https://after-sales-dashboard.vercel.app
- **How deploys work:** every `git push` to the `master` branch **auto-deploys** to production.

**To transfer to Asis — choose ONE:**

**Option A (recommended): add Asis to the Vercel project**
1. Vercel → the project → **Settings → Members** (or Team settings) → **Invite**.
2. Enter Asis's email; give **Admin/Owner** role.

**Option B (full transfer): move the project to Asis's Vercel account/team**
1. Vercel → project → **Settings → General → Transfer Project**.
2. Pick Asis's account/team.
3. After transfer, confirm the GitHub repo is still connected
   (**Settings → Git**). If not, click **Connect Git Repository** and pick the repo.

**If Asis ever needs a brand-new Vercel project instead:**
1. Asis logs into Vercel → **Add New → Project** → import `after-sales-dashboard` from GitHub.
2. Framework auto-detects **Next.js** — no build config needed.
3. **Add the environment variables** from Section 5 (Production scope).
4. Deploy.

---

## 4. Google Sheets — the data sources

The dashboard merges **two** sheets live (5-minute cache). **Do not rename their tabs or
columns**, and keep them shared as **"Anyone with the link → Viewer"** (the dashboard's
server reads them via that link).

| Fiscal Year | Sheet ID | Tab | Notes |
|---|---|---|---|
| **FY 2025-26** | `1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc` | `Form responses 1` | Dates DD/MM/YYYY |
| **FY 2026-27** (live) | `1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU` | `Helpdesk FY 26-27` | Dates M/D/YYYY, kept updating |

- Full URLs:
  - FY25-26: `https://docs.google.com/spreadsheets/d/1p_PMOK2xpT7aKMhUCFmz9Yv195amaqY34IKz82JNktc/edit`
  - FY26-27: `https://docs.google.com/spreadsheets/d/1sWaG-NnJ0eGltaeBTqXgCY9Ox6Dg661jSxLEEieNGhU/edit`
- **Action needed:** make sure Asis's Google account can **view** both sheets (the link-share
  already allows this; optionally add Asis as an explicit Viewer for safety).
- The sheet IDs are hard-coded in `src/app/api/data/route.ts` (the `SHEETS` array). To add a
  future year's sheet, add another entry there.

---

## 5. Credentials & environment variables

### Dashboard login (what you type to open the site)
| Field | Value |
|---|---|
| Username | `admin` |
| Password | `uboard@2025` |

### Environment variables (set in Vercel → Settings → Environment Variables, Production)
```
ADMIN_USERNAME = admin
ADMIN_PASSWORD = uboard@2025
AUTH_SECRET    = ca7894fee9e95bba3b8bfe54db351074037c6e6ae6255e1cf20a53a26e423555
```
These are also in the local file **`.env.local`** (included in the zip) for running on your
own machine.

> **Security tip:** after the handover, change `ADMIN_PASSWORD` and generate a new
> `AUTH_SECRET` (any long random string) in Vercel, then redeploy. Update `.env.local` to match.
> Changing `AUTH_SECRET` logs everyone out (expected).

---

## 6. Running it on your own computer

**Prerequisites:** [Node.js](https://nodejs.org) v20+ (built on v24), and [Git](https://git-scm.com).

```bash
# 1. Get the code (either unzip this package, or clone from GitHub)
git clone https://github.com/UboardIndia/after-sales-dashboard.git
cd after-sales-dashboard

# 2. Install dependencies
npm install

# 3. Make sure .env.local exists in the root (see Section 5). If missing, create it.

# 4. Run locally
npm run dev
# open http://localhost:3000
```

**Build / deploy:**
```bash
npm run build        # production build check
git add -A
git commit -m "your change"
git push             # → Vercel auto-deploys to production
```

> **Windows + OneDrive note:** this folder lives under OneDrive, which occasionally breaks
> Next.js's `.next` cache (a `readlink EINVAL` error). If a build/dev fails with that, delete
> the `.next` folder and rerun. Keeping the project **outside** OneDrive avoids this entirely.

---

## 7. Project structure (where things live)

```
src/
  app/
    page.tsx                 # home → renders <Dashboard/>
    layout.tsx               # app shell
    login/page.tsx           # login screen
    middleware.ts (src/)     # auth gate — redirects to /login if not signed in
    api/
      data/route.ts          # ★ fetches + merges BOTH Google Sheets
      auth/login/route.ts    # sets the auth cookie
      auth/logout/route.ts   # clears the cookie
  components/
    Dashboard.tsx            # ★ main page — filters, KPIs, lays out everything
    HeroStats.tsx            # big % Closed + headline numbers
    AccountabilityBoard.tsx  # open units bucketed by owner (Adil/Altab/Prachi)
    OpenIssueBreakdown.tsx   # why open complaints are stuck
    OpenTicketsTable.tsx     # searchable/filterable open-tickets table
    RequestByTable.tsx       # team performance
    MonthlyTrendChart.tsx / IssueTypeChart.tsx / ProductChart.tsx /
    ComplaintTypePie.tsx / IssueByProductTable.tsx / KPICard.tsx
  lib/
    types.ts                 # data shapes (ComplaintRow, Bucket, etc.)
    buckets.ts               # bucket logic + date/day-count helpers
CLAUDE.md                    # project memory for Claude Code (read automatically)
HANDOVER.md                  # this file
```

**Most common changes start in:** `src/app/api/data/route.ts` (data/columns) or
`src/components/Dashboard.tsx` (layout/sections).

---

## 8. Using Claude Code to make changes

This project was built with **Claude Code**. Asis can continue the same way:

1. Install Claude Code (see https://claude.com/claude-code) and sign in.
2. Open a terminal **in the project folder** and run `claude`.
3. The file **`CLAUDE.md`** in the repo root is read automatically — it gives Claude full
   context about the stack, data sources, quirks, and conventions, so you can just ask for
   changes in plain English (e.g. *"add a spare-parts view"* or *"add FY 2027-28 sheet"*).

There is nothing else to copy over — the project context travels inside the repo via `CLAUDE.md`.

---

## 9. Known pending / next steps (not yet built)

1. **Companion "Tracking" sheet (Assign button + manual buckets).** The Accountability Board
   currently auto-derives each unit's owner from the sheet's status column. To let Prachi
   click **Assign** and have a "days-since-assigned" counter, a small separate Google Sheet
   with an Apps Script Web App is needed. Setup steps are saved in the chat history; the plan:
   create a sheet with a `Tracking` tab, deploy an Apps Script web app, and put its `/exec`
   URL into a `TRACKING_URL` env var. **Not yet wired.**
2. **Unused new columns.** The FY26-27 sheet has `Spare Part` and `Multiple Issues` columns
   that aren't shown yet — candidates for a future spare-parts view / multi-issue analysis.

---

## 10. Handover checklist (tick these off)

- [ ] Asis added to **GitHub** repo as Admin (or repo transferred)
- [ ] Asis added to **Vercel** project (or project transferred)
- [ ] Both **Google Sheets** viewable by Asis; link-sharing left ON
- [ ] Asis has this **HANDOVER.md** + the **project zip**
- [ ] Asis can run `npm run dev` locally and open the dashboard
- [ ] Asis can push a small change and see it auto-deploy
- [ ] (Recommended) Password + `AUTH_SECRET` rotated after transfer
- [ ] Asis has **Claude Code** installed and confirms `CLAUDE.md` loads

---

*Questions during transfer? The full build history and decisions are in the GitHub commit
log and in this project's Claude Code session.*
