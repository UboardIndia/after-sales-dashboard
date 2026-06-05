# Complaint Bot — Required Changes (for Alok)

**From:** Asis (After Sales Dashboard)
**Date:** 02/06/2026
**Priority:** Needed before the bot sheet is connected to the dashboard

The After Sales Dashboard will read the bot's Google Sheet directly. Prachi will verify
every bot entry in the dashboard before it counts as a real complaint. For that to work,
the bot sheet must follow the rules below.

---

## 1. AUTO-PICK the customer's phone number (most important)

**Current problem:** the number is not captured automatically.

**Required:** the bot must capture the customer's mobile number **from the sender's
WhatsApp/chat ID automatically** — NOT by asking the customer to type it.

- Save it as a **10-digit number** — no `+91`, no spaces, no dashes.
  Example: `9876543210`
- This must exactly match the format used in the Helpdesk sheet's
  `Customer Mobile No` column — the dashboard uses the number to detect
  duplicate complaints between the bot and the helpdesk.
- If the chat platform gives `919876543210`, strip the leading `91`.

## 2. AUTO-PICK the customer's name

- Capture the name from the chat profile (WhatsApp push name) automatically.
- If the profile name is missing or junk (emojis only, "."), the bot should ask the
  customer once: "Please share your name" and save the typed reply.

## 3. Sheet structure (do not change once live)

One row per complaint, appended at the bottom. Required columns:

| Column | Rule |
|---|---|
| `Bot ID` | Unique, never repeats. Use a number that always goes up. The dashboard uses this as the permanent key for each bot entry. |
| `Timestamp` | Date + time the complaint was received. Format `DD/MM/YYYY HH:MM`. |
| `Customer Name` | Auto-picked (see #2) |
| `Customer Mobile No` | Auto-picked, 10 digits (see #1) |
| `Brand` | UBOARD / TYGATEC if the bot can determine it, else blank |
| `Product Name` | What the customer says, free text is fine |
| `Issue Description` | The customer's complaint text |
| `Order/Invoice No` | If the bot collects it, else blank |

## 4. Bot sheet rules

- **Append only.** The bot only ADDS rows. It must never edit or delete existing rows.
- **Never rename the tab or the column headers** after go-live (the dashboard reads
  them by name).
- Keep sharing as **"Anyone with the link → Viewer"**.
- Verification status will live in the dashboard, NOT in this sheet — do not add a
  "Verified" column for Prachi to edit. She will work in the dashboard.

## 5. When done

Send Asis:
1. The bot sheet's **URL**
2. The **tab name** where rows are written
3. One **test entry** made by the bot with an auto-picked number + name so the
   format can be confirmed before connecting.

---

*Questions → Asis (cloud@uboardindia.com)*
