# 🚂 Varanasi Trip Manager

A shared trip expense tracker for 5 travelers with Splitwise-inspired debt simplification.

**Travelers:** Aditya Shekhar · Aman Murari · Chotu (Varun) · Ananya Arohi · Ritu Singh

## Features

- 🏠 **Dashboard** — Total trip cost, per-person spending & net balances
- ➕ **Add Expense** — Amount, category, who paid, split among whom, notes
- 📋 **Expense History** — Filter by category or member, view details, delete
- 💰 **Settlements** — Splitwise-style debt simplification (minimum transactions)
- 👤 **Member Profiles** — Individual spending breakdown
- 🔄 **Real-time Sync** — All 5 people can edit from their phones

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL, free tier)
- **Vanilla CSS** (Glassmorphism dark theme)
- **Vercel** (Deployment)

---

## Setup & Deployment

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Create a new project
3. Go to **SQL Editor** and paste the contents of `supabase-setup.sql`
4. Click **Run** to create the tables

### 2. Get Your Supabase Keys

1. In Supabase, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**

### 3. Create `.env.local`

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

> **Note:** Without Supabase credentials, the app works in demo mode using localStorage (data won't sync across devices).

---

## How It Works

### Expense Splitting Algorithm

Uses a **greedy debt simplification** algorithm (same approach as Splitwise):

1. Calculate net balance for each person: `Net = Total Paid - Total Share`
2. Separate into debtors (negative) and creditors (positive)
3. Sort both by amount (descending)
4. Match largest debtor with largest creditor
5. Settlement amount = min(debt, credit)
6. Repeat until all settled

This minimizes the number of transactions needed!

### Categories

🍔 Food & Drinks · 🚗 Transport · 🏨 Hotel · 🎟️ Tickets · 🛍️ Shopping · 🎉 Activities · 💊 Medical · 🛒 Groceries · 📦 Other
