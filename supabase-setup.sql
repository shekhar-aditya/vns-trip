-- ============================================================
-- VARANASI TRIP MANAGER — Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  paid_by TEXT NOT NULL,
  split_among TEXT[] NOT NULL DEFAULT '{}',
  note TEXT DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by TEXT NOT NULL,
  paid_to TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (but allow all operations for simplicity)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- 4. Create policies to allow all operations (since this is a trusted group)
CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on settlements" ON settlements
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at DESC);
