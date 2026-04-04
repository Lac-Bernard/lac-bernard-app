# How to use membership administration (English)

*Lac Bernard Association — for volunteers with **admin** access*

This guide describes the **membership admin console** on the website: reviewing members, pending payments, recording payments, exports, and daily automated jobs. It is **not** the same as **TinaCMS** (`/admin` on the site), which is used to edit news and general pages.

---

## Who this is for

You need an **administrator role** on your sign-in account. If you open the admin URL but are not an admin, the site sends you back to the **member account** page. Another admin can grant you access (see **Grant admin role** under member detail).

**English admin URL:** `/en/membership/admin`  
**French admin URL:** `/fr/membership/admin`

Sign in the **same way as members** (Google or email magic link), then go to the admin address or bookmark it.

[Screenshot: Administration page header and tab bar]

---

## 1. Admin console layout

Across the top you will see **tabs**:

| Tab | Purpose |
|-----|---------|
| **Overview** | Summary counts and recent activity |
| **Pending payments** | Memberships waiting for payment |
| **New members** | Profiles that may need review |
| **Members** | Searchable directory and exports |
| **Audit log** | Record of admin actions |

An **Add member** button is available for walk-ins or people not yet in the system (`/en/membership/admin/members/new`).

---

## 2. Overview

Use **Overview** for a quick snapshot:

- Counts such as **pending memberships**, **active memberships** for the current year, and **new members**  
- Recent lists (e.g. recently verified profiles, recent active memberships)  

Click through to the relevant tab when you need to act.

[Screenshot: Overview tab with KPI-style counts]

---

## 3. Pending payments

The **Pending payments** table shows people who started a membership but have **not** finished paying (or payment is not yet recorded).

**Columns** typically include name, email, year, membership **type** (General / Associate), **status**, and **expected fee**.

**Actions:**

- **Record manual payment** — use when someone paid by Interac, cheque, cash, etc.  
- **Remove pending membership** — deletes the pending record. The member will need to **choose their membership type again** the next time they sign in. Confirm before removing.

[Screenshot: Pending payments table with actions]

---

## 4. New members

**New members** lists profiles whose **record status** is **New** (self-serve, not yet reviewed). Use pagination at the bottom to move through the list.

Open a row to go to the **member detail** page, verify information, and set **Member status** to **Verified** when appropriate.

[Screenshot: New members tab]

---

## 5. Members (directory)

Use **Members** to search and filter the roster.

**Filters and options:**

- **Search** — find by name or email (as implemented in the search field)  
- **Sort** — e.g. **Newest first** or **Last name A–Z**  
- **Show** — **Everyone**, **With membership history**, **Active for [year]**, or **Did not renew for [year]**  
- **Membership year** — year the filters apply to (for active / not renewed views)  
- **Membership type** — **All**, **General only**, **Associate only**  
- **Record status** — **Verified** (default), **New**, **Disabled**, or **All**  

Click **Apply** after changing filters.

**Exports (same filters as the table):**

- **Copy email list** — copies a comma-separated list. The in-app hint applies: only rows with a non-empty primary email; secondary emails may be included with names. **Get consent before bulk mail.**  
- **Export CSV** — downloads a UTF-8 spreadsheet of the same filtered view.

Click **Open** on a row to see **full profile, memberships, and payments**.

[Screenshot: Members tab — filters and export buttons]

[Screenshot: Members table with Open links]

---

## 6. Audit log

The **Audit log** lists **who did what** and **when** (admin actions). Use it for accountability and troubleshooting. If the log is empty, no recorded actions have occurred yet.

[Screenshot: Audit log tab]

---

## 7. Member detail page

**URL pattern:** `/en/membership/admin/members/[id]` (the id is internal).

**Profile**

- Edit name, phones, emails, **lake address**, mailing fields, **email opt-in**, **internal notes**, and **linked auth user id** when needed.  
- **Member status:**  
  - **New — not yet reviewed** — self-serve profile awaiting your check  
  - **Verified — OK for directory and comms** — ready for normal directory and communications  
  - **Disabled — excluded from default directory and exports** — inactive / do not contact for default lists  
- **Save member** to apply changes.  
- **Grant admin role** — gives this person admin access in the app. They must have a **linked sign-in account** (user id). They may need to **sign out and sign in again** to see admin pages.

**Memberships & payments**

- Choose the **membership year** to inspect or edit that year’s record.  
- See **standard fee**, amounts toward **membership** vs **donation**, **balance due**, and payment history.  
- **Record manual payment** — amount, **method** (e-Transfer, cheque, cash, unknown, or card/Stripe if recorded manually), **date**, optional **reference** (e-transfer details, cheque number, etc.), optional **notes**.  
- **Remove** a payment only if you must correct a mistake: the system **recalculates** membership from remaining payments. **This cannot be undone.**  
- **Add membership** — add another calendar year: either **pending payment** or **record payment now** (cash, e-Transfer, etc.), subject to the same rules as on **Add member** (e.g. one General per lake address per year).

[Screenshot: Member detail — profile form and Save / Grant admin]

[Screenshot: Member detail — memberships and payments]

---

## 8. Add member

**URL:** `/en/membership/admin/members/new`

Use this for someone **not** already in the database.

1. Fill in **profile** fields (name, contact, lake address if they will be General, etc.).  
2. Optionally **add a membership** for the current calendar year:  
   - **Pending payment** — they pay later online or manually.  
   - **Record payment now** — enter payment details immediately.  

**Common errors (plain language):**

- General membership needs **lake civic number and street** on the profile first.  
- **Another member** at the same lake address may already have **General** for that year.  
- **Duplicate year** — that member already has a membership row for that year.

[Screenshot: Add member form]

---

## 9. Automated daily jobs (“cron”)

The website is hosted on **Vercel**, which runs **two automatic tasks** every day. **You do not click anything** to start them; they run on a schedule. Only the association’s servers (with a secret) can trigger these URLs—members of the public cannot.

**Times are in UTC**, so local time in Eastern Canada **changes with daylight saving**. For reference, the daily summary is configured around **10:00 UTC** (often roughly **5–6 a.m.** Toronto time depending on the season—see project `.env.example` for the note).

### Daily membership summary email

- **When:** Every day at **10:00 UTC** (see `vercel.json`).  
- **What:** Calls `/api/cron/membership-admin-daily-summary`.  
- **Result:** Sends **one plain-text email** to the address(es) configured in the deployment (see `MEMBERSHIP_ADMIN_SUMMARY_TO` in `.env.example`; often **membership@lacbernard.ca** or a list).  
- **Content includes:**  
  - Count of **pending memberships** (all years)  
  - Count of **new members awaiting verification**  
  - Count of **memberships activated** on the **previous calendar day** (using **America/Toronto** for “previous day” and the report date)  
  - Direct links to the **English** and **French** admin consoles  

### Google Sheets sync

- **When:** Every day at **12:00 UTC** (see `vercel.json`).  
- **What:** Calls `/api/cron/sync-google-sheets`.  
- **Result:** Refreshes the association’s **Google Sheets** workbook (configured in the deployment) with tabs named **Members**, **Memberships**, and **Payments**, reflecting the **live database**.  

The **website database remains the system of record**; the spreadsheet is a convenient mirror for people who work in Sheets and for backup-style visibility.

---

## Screenshot checklist (for your Google Doc)

1. Admin page — full width with all **tabs** visible  
2. **Overview** tab  
3. **Pending payments** — including action controls  
4. **New members** tab  
5. **Members** tab — filters + **Copy email list** / **Export CSV**  
6. **Audit log** tab  
7. **Member detail** — profile section  
8. **Member detail** — memberships & payments  
9. **Add member** page  
10. *(Optional)* Sample **daily summary** email (redact if needed)  
11. *(Optional)* Redacted **Google Sheet** tabs  

---

*Technical reference: `src/components/members/AdminMembershipView.astro`, `AdminMemberDetailView.astro`, `vercel.json`, `src/pages/api/cron/`.*
