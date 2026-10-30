# 🌊 VARKALA TRIP '26

Group trip companion & expense splitter for the Varkala Cliff & Surf trip, in a Coastal Neo-Brutalist style.

**Squad:** Aditya Shekhar `VK-01` · Divyanshu Singh `VK-02` · Bibek Sundray `VK-03` · Ritu Singh `VK-04` · Vidhi Agrawal `VK-05` · Dibyashree Panda `VK-06` · Kritika Parida `VK-07`

## Features

- 🔐 **Password login per member.** Pick your name or type your Member ID. The device stays unlocked until you log out.
- 🪪 **Profile & payment setup.** Upload or paste a profile photo, set a UPI ID, and upload or paste a QR screenshot. If you have a UPI ID but no screenshot, a QR is generated automatically. You can change your password here.
- 🏠 **Dashboard.** Group total or "my share" billboard, everyone's balance, quick settle, and recent bills.
- 🧾 **Spends.** Search (description, notes, Member ID), sort, category/member filters, and a perforated receipt view.
- ➕ **Add/Edit.** Equal, Exact ₹, Percent, and Shares splits, multiple payers, quick-amount chips, and date/time.
- 💸 **Settle.** Minimum-transfer debt simplification, UPI QR with the amount pre-filled, deep link to UPI apps, mark as settled / undo, and a WhatsApp summary.
- 📊 **Insights.** Category and daily charts, squad badges, CSV export.
- 🗺️ **Spots.** Shared Varkala checklist with "Log Expense" shortcuts.
- 🔄 **Live sync** across phones via Supabase Realtime.

## Default passwords

`<handle>123`, e.g. `aditya123`, `divyanshu123`, `bibek123`, `ritu123`, `vidhi123`, `dibyashree123`, `kritika123`. Everyone should change theirs in **My Profile → Change Password**.

## Setup

1. Create a Supabase project (free tier is fine).
2. In **SQL Editor**, run all of [`supabase-setup.sql`](supabase-setup.sql). It creates `vk_*` tables next to any old Varanasi tables and leaves those untouched. It is safe to re-run.
3. Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. `npm install && npm run dev`
5. Deploy on Vercel with the same two env vars.

> Without Supabase keys the app runs in **demo mode** on `localStorage`: a single device, the same rules, and the same default passwords.

## Security model

- Passwords are bcrypt-hashed (`pgcrypto`) in `vk_members.password_hash`. The anon key **cannot read** that column (column-level grants). All password and profile writes go through `SECURITY DEFINER` RPCs (`vk_login`, `vk_change_password`, `vk_update_profile`) that check a per-device session token.
- Changing or resetting a password signs that member out on their other devices.
- Expenses, settlements, and the checklist stay open to the anon key, as in the original app (a trusted group). Their edit and delete rules are enforced in the UI.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (Next.js core-web-vitals) |
