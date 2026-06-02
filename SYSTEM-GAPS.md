# System Gaps & Backlog

Analysis date: 02/06/2026. Work through these top-down. Tick when done.

## 🔴 Critical — fix first

- [ ] **1. Credentials are public.** `HANDOVER.md` (admin password + `AUTH_SECRET`) is committed
  to a PUBLIC GitHub repo. Anyone can log into the live dashboard (customer PII exposed).
  **Fix:** make repo private (GitHub → Settings → Danger Zone → Change visibility),
  scrub credentials from HANDOVER.md, rotate `ADMIN_PASSWORD` + `AUTH_SECRET` in
  Vercel env vars and `.env.local`.

## 🟠 High — design flaws

- [ ] **2. Dual-edit conflict.** Dashboard updates (Supabase) silently override sheet edits,
  even older ones. **Fix:** team rule — once dashboard updates go live, ALL status changes
  happen in the dashboard only; sheets are intake-only. Announce to team.
- [ ] **3. Dashboard-closed tickets keep counting days.** No close date in sheet when closed
  via dashboard → daysPending keeps growing. **Fix (code):** use the Supabase `created_at`
  of the closing status update as the effective close date.
- [ ] **4. Complaint ID fragility.** Overlay keyed to `FY::complaint-no`. Renumbering the
  `Complaint No` column orphans all dashboard updates. **Fix:** team rule — never renumber;
  column is permanent once assigned.

## 🟡 Medium — workflow gaps

- [ ] **5. No notifications.** Assignments are invisible unless the person opens the dashboard.
  Future: WhatsApp/email ping or daily digest per owner.
- [ ] **6. Update button only in Live Feed.** Add to Open Tickets table + Accountability Board.
- [ ] **7. No history UI.** Audit trail is stored (`GET /api/updates?complaintId=`) but there is
  no "who changed what when" view per ticket.
- [ ] **8. Shared password + honour-system name picker.** Move to per-person logins once team
  uses dashboard daily. Rotate shared password when anyone leaves the team.
- [ ] **9. No Supabase backup.** Free tier = no automated backups. Add a weekly export script
  (CSV to a backup folder or a Google Sheet tab).

## ⚪ Noted — later

- [ ] **10. Data quality panel.** 84 rows with blank status; future-dated typos (2027/2028) in
  close/dispatch dates. Surface bad rows so the team fixes them at source.
- [ ] **11. Mobile usability.** Tables are desktop-wide; team on phones needs a card view.
- [ ] **12. CSV export** for management reporting.
- [ ] **13. Bot sheet format compliance.** Verify Alok's test entry (auto-picked 10-digit mobile,
  unique Bot ID, append-only) before trusting the verification queue. See BOT-INSTRUCTIONS-ALOK.md.

## Suggested order

| When | Items |
|---|---|
| Today | 1, 3 |
| This week | 2 (announce), 6, 7 |
| Next week | Bot queue real data, 9, 5 |
