# How to use the member area (English)

*Lac Bernard Association — for members and households*

This guide explains the **member area** on the association website: signing in, your profile, membership status, and how to pay. You do not need technical knowledge.

---

## What the member area is for

Use it to:

- See whether your **membership is active** for the current calendar year  
- **Start or renew** a membership and get **payment instructions**  
- **Pay online** by card (when available) or use **Interac e-Transfer**, cheque, or cash  
- **Update your contact information** on file with the association  

**Where to start on the website:** open the **Membership** section, then use the link to **sign in** or open your **member account** (English: `/en/membership/account`).

[Screenshot: Membership section of the public site showing the path to the member area]

---

## Your past membership is already in the system

The association **imported historical membership records** from its previous lists into this system.

- When you sign in, the website connects your login to the member record that matches your **primary email on file**.  
- **Use the same email address** the association already has for you (the one on your renewal notices or in their records).  
- If you use **Continue with Google**, use a Google account whose **email matches** what the association has. If it does not match, you may be asked to create a new profile until the office updates your record or you sign in with the correct email.  
- Once your account is linked, you should see your **current membership** (if any) and your **membership history** on your account page. You do not need to re-enter past years.

---

## 1. Sign in

**English sign-in page:** `/en/membership/account/sign-in`

You can sign in in two ways:

1. **Continue with Google** — one click if you use Google and your email matches the association’s records.  
2. **Email and magic link** — enter your email and click **Send magic link**. The site emails you a **one-time link**. You do not create or remember a password.

**Steps (magic link):** enter email → open your inbox → click the link in the message → you land in the member area.

**Tips:**

- Check **spam** or **junk** if the message does not arrive.  
- The link is for **one-time** use.  
- If you sent a link to the wrong address, use **Use a different email** (or start again) and enter the correct one.

[Screenshot: Sign-in page with Google button and email field]

[Screenshot: Message area after sending magic link — “Check your email…”]

---

## 2. First-time setup — create your profile

If the website **does not find a member profile** for your sign-in email, you will be prompted to **Create member profile** (`/en/membership/account/new`).

Complete the form so the association has your household on file. Typical sections include:

- **Member info** — name, phone, sign-in email  
- **Optional secondary contact** — another person’s name and contact details, if you want them on the record  
- **Lake address** — civic number and street name **at Lac Bernard** (needed for **General** / voting membership)  
- **Mailing address** — where you receive mail off-lake  
- **Email opt-in** — whether the association may email you updates (you can change this later)  

**Membership types (important):**

- **General** — voting membership. **One per lake property per calendar year.** You must enter **both** lake civic number **and** street on your profile.  
- **Associate** — non-voting. Lake address is optional.

After saving, you return to the member area to start or complete membership steps.

[Screenshot: Create profile form — top of page]

[Screenshot: Lake address and mailing sections]

---

## 3. Your account home

**English account page:** `/en/membership/account`

You will see a **summary** of your profile and an **Edit profile** link. Below that, the page shows your **membership status** for the **current calendar year**.

### If your membership is **active**

You will see a message like **Your [year] membership is active**.

- Membership **covers the full calendar year** (January 1 through December 31).  
- You will see your **membership type** (General or Associate) and the **fee** on file.  
- For **General**, you will see which **lake address** your voting membership is tied to.  
- If you have **future or prepaid years**, a separate section lists those years so you can confirm coverage without calling the office.

[Screenshot: Account home — active membership card]

### If your membership is **pending payment**

You will see **Your [year] membership is pending payment**.

- **Pay with credit card** opens a secure flow. You can add an **optional donation** and a short **note** with your donation.  
- **Other ways to pay:**  
  - **INTERAC e-Transfer** — send from your bank to **interac@lacbernard.ca**. The association does not collect your banking details.  
  - **Cheque** — mail to:  
    *The Owners' and Residents' Association of Lac Bernard*  
    *C.P 1262 Succursale C*  
    *Gatineau, Quebec J8X 3X7*  
  - **Cash** — contact **membership@lacbernard.ca** to arrange payment in person.  

Your membership becomes **active** when payment is confirmed online **or** when an administrator records your payment.

**Cancel request** removes the pending membership. If you cancel, you will need to **start a new request** the next time you want to join or renew.

[Screenshot: Pending payment — Pay with card and other payment methods]

[Screenshot: Pay with card modal — optional donation]

### If you have **no active membership** for this year

You will see **No active membership for [year]** with short steps:

1. Pick **General** (voting) or **Associate** (non-voting).  
2. Click **Start membership request** — payment instructions follow.  
3. Membership becomes active when payment is received or recorded.

If **General** is greyed out or blocked, add your **lake civic number and street** under **Edit profile**, then try again. Only **one General membership per lake property per year** is allowed; if someone else at your address already has General for this year, contact the association.

[Screenshot: Inactive year — tier choice and Start membership request]

---

## 4. After paying online

- If you complete checkout successfully, a banner thanks you and explains that your membership will show as **active** here **shortly** after the payment succeeds.  
- If you **cancel** checkout, you can try again when ready.

[Screenshot: Success banner after returning from Stripe]

---

## 5. Sign out

Use **Sign out** at the bottom of the member area when you are finished, especially on a shared computer.

---

## 6. Troubleshooting

| Situation | What to do |
|-----------|------------|
| Message that **no member profile** is linked to this email | Sign in with the **email the association has on file**, or contact the office to align your email. |
| **General** membership not available | Add **lake civic + street** on your profile, or choose **Associate**, or ask the office if another household member already holds General for your property this year. |
| **Online payment is not configured** (or checkout fails repeatedly) | Use **Interac**, **cheque**, or **cash** as shown on the page, or contact **membership@lacbernard.ca**. |
| Magic link expired or invalid | Request a **new link** from the sign-in page. |

---

## Screenshot checklist (for your Google Doc)

Use this list when capturing images. Replace `[Screenshot: …]` placeholders above with the same titles if you like.

1. Public site — Membership menu / link to member area  
2. Sign-in page (Google + email)  
3. After sending magic link — confirmation text  
4. Create profile — overview  
5. Create / edit profile — lake address  
6. Account home — **active** membership  
7. Account home — **pending** payment (card + other methods)  
8. Pay with card modal  
9. Account home — **no active** membership (tier selection)  
10. Checkout success banner (optional)  
11. Membership history or prepaid years (if applicable)  
12. Sign out area  

---

*Technical reference: member UI copy lives in `src/lib/members/i18n.ts` (locale `en`).*
