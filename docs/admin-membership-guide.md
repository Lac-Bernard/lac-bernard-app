# Membership admin guide

This guide is for **association volunteers and staff** who help run membership: the **admin dashboard** on the website, the **daily summary email**, and the **Google Sheet** that lists members. You do not need a technical background to use these tools.

A separate **member** guide (for people renewing or managing their own account) may be added later. This document is only about **administration**.

---

## Not the same as editing the website

**Website pages and news** are edited with **TinaCMS** at `/admin` when you are working on the public site. That is a different role from **membership admin**.

This guide covers **members and payments** only: the console at **Membership → Administration** after you sign in.

---

## Signing in and who can access admin

1. Open the membership area in **English** or **French** (same tools, different language):
   - English admin: [https://lacbernard.ca/en/membership/admin](https://lacbernard.ca/en/membership/admin) (replace the domain if you use a staging site)
   - French admin: same path with `/fr/membership/admin`
2. Sign in the same way members do: **magic link** (email link, no password).
3. If you are not an admin, you will be sent back to the regular **account** page. **Admin access is not something you turn on yourself** — whoever maintains the database (for example your web or IT contact) must grant it on your account in **Supabase**. After that, the admin pages work for you.

**Direct links to a specific tab** (optional bookmark):

- Overview: `?tab=overview`
- Pending payments: `?tab=pending`
- New members: `?tab=newMembers`
- Members: `?tab=members`
- Audit log: `?tab=auditLog`

Example: `/en/membership/admin?tab=pending`

---

## What the dashboard is for

In short: **review activity**, **pending payments**, and the **member directory**; **open a member** to see full history, **record manual payments**, and **grant admin access** to someone else who should help.

---

## Overview tab

The **Overview** tab gives you a quick picture:

- **Counts** (you can click them to jump to the right place):
  - **Pending memberships** — all years, anything still waiting on payment or completion.
  - **Active memberships** — for the **current membership calendar year** (the year the association uses for dues).
  - **New members** — profiles that still need your review (see **New members** tab).
- **Recent members** — recently **verified** profiles.
- **Recent active memberships** — memberships that recently became **active**.

Use this tab when you want a morning snapshot before drilling into lists.

---

## Pending payments tab

This list is everyone with a membership still in **pending** status for a given year (you see name, email, year, membership type, status, expected fee, and actions).

### Record a manual payment

When someone pays **outside the online card checkout** (for example **e-Transfer**, **cheque**, or **cash**):

1. Click **Record payment** for that row.
2. Enter the **amount**, **method**, **payment date**, and optional **reference** (e-transfer details, cheque number, etc.) and **notes**.
3. Save.

If the amount is **more than the standard dues**, the form can show how much counts toward **membership** versus a **donation** — follow the on-screen preview.

Online **card (Stripe)** payments are usually created automatically when checkout completes; you mainly use this dialog for offline payments.

### Remove a pending membership

**Cancel pending** clears that pending membership. The person may need to **choose their membership type again** the next time they sign in. Confirm only if you mean to remove that pending row.

---

## New members tab

Here you see people whose profile is still **New** (awaiting verification). Use **Previous page** / **Next page** if the list is long.

**Typical workflow:** open the person (**Open**), check their details, and when everything is correct set their **member status** to **Verified** on the member page (see below). Until then, they stay in this list.

---

## Members tab (directory)

This is your searchable directory.

### Filters and search

- **Search** — find people by name or email.
- **Sort** — for example newest first or last name A–Z.
- **Show** — limit to everyone, only people with membership history, **active for [year]**, or **did not renew for [year]**.
- **Membership year** — the year those filters apply to.
- **Type** — General, Associate, or all.
- **Member status** — Verified, New, Disabled, or all.

Click **Apply** to refresh the table.

### Copy email list

**Copy email list** uses the **same filters as the table**. It includes **non-empty primary emails**; if a **secondary email** is on file, it is included too, with each person’s name on their address. **Get consent before bulk mail.**

If automatic copy is blocked, the site may show text you can copy by hand.

### Export CSV

**Export CSV** downloads a spreadsheet (**UTF-8**) using the **same filters as the table** — useful for records or mail merge outside the site.

### Open a member

**Open** goes to that person’s **member detail** page (see next section).

---

## Add member

Use **Add member** (from the top of the admin page) when someone joins **outside** the normal online flow (for example walk-in or phone).

Path:

- English: `/en/membership/admin/members/new`
- French: `/fr/membership/admin/members/new`

You can enter **profile** information, **lake address**, optional **secondary contact**, and optionally create a **membership for the current calendar year** either as:

- **Pending payment** — they still owe; appears on **Pending payments**, or  
- **Record payment now** — if you are entering cash, e-Transfer, etc. immediately.

Submit to create the member.

---

## Member detail page

From the directory, **Open** a row to see one person’s full record.

### Profile and status

- Edit **name**, **emails**, **phones**, **lake address**, **email opt-in**, and **internal notes** (for admins only — members do not see these notes).
- **Member status**:
  - **New** — still being verified (shows on **New members**).
  - **Verified** — normal active profile.
  - **Disabled** — block access where your policies require it.

Save changes with **Save member**.

### Grant admin role

**Grant admin role** gives this person access to the same admin dashboard. It only works if they already have a **linked sign-in account** (they have signed up with magic link). If it succeeds, they may need to **sign out and sign back in** before admin pages appear.

### Memberships and payments

- Choose the **membership year** to inspect.
- You see **memberships** for that person and **payments** for the selected year.
- **Record payment** — same idea as on **Pending payments** (manual / offline payments).
- **Remove** on a payment deletes it after you confirm; **membership status is recalculated** from what remains. This cannot be undone.
- Payments made by **card (Stripe)** appear for reference; routine card charges are created by the website, not typed in here.
- **Add membership** — add another year or situation when needed (for example a new season).

---

## Audit log tab

The **Audit log** is a read-only history table: **when** something happened, **which admin** (by email), **what action**, **what record**, and extra **details**.

Typical entries include:

- Creating a member  
- Updating a member profile  
- Adding a membership from admin  
- Recording a **manual** payment  
- Cancelling a **pending** membership  
- Deleting a payment  
- Granting **admin** role  

Use it to answer “who changed this?” without guessing.

---

## Google Sheet sync

The association can keep a **Google Spreadsheet** that is **filled automatically** from the same data as the website.

### What you get

- Three tabs: **Members**, **Memberships**, and **Payments**.
- The sheet is **refreshed on a schedule** (once per day on the server). It is **not** a live second-by-second mirror.

### How to use it

- Treat the **website database as the source of truth**. **Changes you make only in the sheet do not flow back** into membership records.
- Use the sheet for **reports**, **board packets**, **mail merge**, or sharing a familiar spreadsheet view.
- Someone with access to **Google sharing** must share the spreadsheet with the association’s **service account** email (listed in the project **README** under *Google service account*):  
  `lac-bernard-website-access@lac-bernard-app.iam.gserviceaccount.com`  
  so automated updates can run.

If rows look out of date, wait for the next daily refresh or ask your technical contact whether sync is enabled.

---

## Daily summary email

Some admins receive an automatic **email each day** with headline counts. The **exact send time** depends on the hosting schedule (usually **morning in Eastern time**); the **dates inside the email** use **Toronto (Eastern)** for the “day” boundaries.

**Who receives it** is configured on the server (your technical contact sets the distribution list).

### What the numbers mean

- **Pending memberships (all years)** — how many memberships are still **pending** (waiting on payment or completion), counting every year.
- **New members awaiting verification** — how many **member profiles** are still in **New** status.
- **Memberships activated previous calendar day (Toronto)** — how many memberships **became active** on **yesterday’s date in Toronto time** (based on when activation happened).

The email also includes **links** to open the admin console in **English** and **French**.

Use the email as a **nudge** to open the dashboard; the **Overview** and tabs always have the live detail.

---

## Quick flow: from email to recorded payment

1. Read the daily email (or open **Overview**).  
2. If **Pending memberships** is not zero, go to **Pending payments**.  
3. **Open** a row or work from the list.  
4. **Record payment** when money is received, or **Cancel pending** only if you intend to clear that checkout.  
5. For new people, use **New members**, open the profile, and set **Verified** when appropriate.

---

## Need help?

- **Access problems** (cannot see admin at all) — contact whoever manages **Supabase** / website accounts.  
- **Sheet not updating** or **email not arriving** — contact your **web hosting** or technical contact (sync and mail use server settings you do not need to change yourself).
