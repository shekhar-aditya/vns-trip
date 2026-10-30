-- ============================================================
-- VARKALA TRIP '26 — Supabase Database Setup
-- Run this whole file in your Supabase SQL Editor.
--
-- All tables are prefixed `vk_` so they live safely alongside the
-- old Varanasi `expenses` / `settlements` tables (nothing is dropped).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- 1. MEMBERS (profiles + password hashes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vk_members (
  id TEXT PRIMARY KEY,                 -- 'VK-01' … 'VK-07'
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  password_hash TEXT NOT NULL,         -- bcrypt, never readable by clients
  is_silent_admin BOOLEAN NOT NULL DEFAULT FALSE,  -- never readable by clients
  avatar_url TEXT,
  upi_id TEXT,
  qr_code_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO vk_members (id, name, handle, initials, color, sort_order, password_hash, is_silent_admin) VALUES
  ('VK-01', 'Aditya Shekhar',   'aditya',     'AS', '#FFD600', 1, extensions.crypt('aditya123',     extensions.gen_salt('bf')), TRUE),
  ('VK-02', 'Divyanshu Singh',  'divyanshu',  'DS', '#00E5FF', 2, extensions.crypt('divyanshu123',  extensions.gen_salt('bf')), FALSE),
  ('VK-03', 'Bibek Sundray',    'bibek',      'BS', '#FF5252', 3, extensions.crypt('bibek123',      extensions.gen_salt('bf')), FALSE),
  ('VK-04', 'Ritu Singh',       'ritu',       'RS', '#00E676', 4, extensions.crypt('ritu123',       extensions.gen_salt('bf')), FALSE),
  ('VK-05', 'Vidhi Agrawal',    'vidhi',      'VA', '#FF80AB', 5, extensions.crypt('vidhi123',      extensions.gen_salt('bf')), FALSE),
  ('VK-06', 'Dibyashree Panda', 'dibyashree', 'DP', '#B388FF', 6, extensions.crypt('dibyashree123', extensions.gen_salt('bf')), FALSE),
  ('VK-07', 'Kritika Parida',   'kritika',    'KP', '#FFAB40', 7, extensions.crypt('kritika123',    extensions.gen_salt('bf')), FALSE)
ON CONFLICT (id) DO NOTHING;

-- Clients may only read the public profile columns.
ALTER TABLE vk_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read member profiles" ON vk_members;
CREATE POLICY "Read member profiles" ON vk_members FOR SELECT USING (true);
REVOKE ALL ON vk_members FROM anon, authenticated;
GRANT SELECT (id, name, handle, initials, color, sort_order, avatar_url, upi_id, qr_code_url, updated_at)
  ON vk_members TO anon, authenticated;

-- ------------------------------------------------------------
-- 2. SESSIONS (one row per logged-in device)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vk_sessions (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL REFERENCES vk_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vk_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vk_sessions FROM anon, authenticated;  -- only reachable via RPCs below

-- ------------------------------------------------------------
-- 3. EXPENSES, SETTLEMENTS & SPOT CHECKLIST
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vk_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  paid_by TEXT NOT NULL,                     -- primary payer (first of payers)
  payers JSONB NOT NULL DEFAULT '{}',        -- { "VK-01": 500, "VK-02": 300 }
  split_among TEXT[] NOT NULL DEFAULT '{}',  -- members with a non-zero share
  splits JSONB NOT NULL DEFAULT '{}',        -- { "VK-01": 266.67, ... } exact rupee shares
  split_mode TEXT NOT NULL DEFAULT 'equal',  -- equal | exact | percent | shares
  split_inputs JSONB NOT NULL DEFAULT '{}',  -- raw per-member inputs, for re-editing
  note TEXT DEFAULT '',
  spent_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vk_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by TEXT NOT NULL,
  paid_to TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vk_spot_checks (
  spot_id TEXT PRIMARY KEY,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trusted group: expenses/settlements/spots are open to the anon key.
-- Edit/delete permissions for these are enforced in the app UI.
ALTER TABLE vk_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vk_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vk_spot_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on vk_expenses" ON vk_expenses;
DROP POLICY IF EXISTS "Allow all on vk_settlements" ON vk_settlements;
DROP POLICY IF EXISTS "Allow all on vk_spot_checks" ON vk_spot_checks;
CREATE POLICY "Allow all on vk_expenses" ON vk_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vk_settlements" ON vk_settlements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vk_spot_checks" ON vk_spot_checks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vk_expenses_spent_at ON vk_expenses(spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_vk_settlements_created_at ON vk_settlements(created_at DESC);

-- ------------------------------------------------------------
-- 4. AUTH RPCs (SECURITY DEFINER — the only way to touch passwords)
-- ------------------------------------------------------------

-- Internal: resolve a session token to its member row.
CREATE OR REPLACE FUNCTION vk_session_member(p_token UUID)
RETURNS vk_members LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT m.* FROM vk_sessions s JOIN vk_members m ON m.id = s.member_id WHERE s.token = p_token;
$$;

-- Returns { token, member_id, is_admin } or NULL on bad credentials.
CREATE OR REPLACE FUNCTION vk_login(p_member_id TEXT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE m vk_members; t UUID;
BEGIN
  SELECT * INTO m FROM vk_members WHERE id = upper(trim(p_member_id));
  IF NOT FOUND OR m.password_hash <> crypt(p_password, m.password_hash) THEN
    RETURN NULL;
  END IF;
  INSERT INTO vk_sessions (member_id) VALUES (m.id) RETURNING token INTO t;
  RETURN jsonb_build_object('token', t, 'member_id', m.id, 'is_admin', m.is_silent_admin);
END $$;

-- Validates a stored device session. Returns same shape as vk_login, or NULL.
CREATE OR REPLACE FUNCTION vk_check_session(p_token UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT jsonb_build_object('token', s.token, 'member_id', m.id, 'is_admin', m.is_silent_admin)
  FROM vk_sessions s JOIN vk_members m ON m.id = s.member_id
  WHERE s.token = p_token;
$$;

CREATE OR REPLACE FUNCTION vk_logout(p_token UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  DELETE FROM vk_sessions WHERE token = p_token;
$$;

-- Members change their own password (current password required).
-- The silent admin may reset anyone else's password without p_current.
-- Other devices logged in as the target are signed out.
CREATE OR REPLACE FUNCTION vk_change_password(p_token UUID, p_target TEXT, p_current TEXT, p_new TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE caller vk_members; target vk_members;
BEGIN
  caller := vk_session_member(p_token);
  IF caller.id IS NULL THEN RETURN 'not_logged_in'; END IF;
  SELECT * INTO target FROM vk_members WHERE id = p_target;
  IF NOT FOUND THEN RETURN 'unknown_member'; END IF;
  IF length(coalesce(p_new, '')) < 4 THEN RETURN 'too_short'; END IF;

  IF caller.id = target.id THEN
    IF target.password_hash <> crypt(coalesce(p_current, ''), target.password_hash) THEN
      RETURN 'wrong_current';
    END IF;
  ELSIF NOT caller.is_silent_admin THEN
    RETURN 'forbidden';
  END IF;

  UPDATE vk_members SET password_hash = crypt(p_new, gen_salt('bf')), updated_at = NOW() WHERE id = target.id;
  DELETE FROM vk_sessions WHERE member_id = target.id AND token <> p_token;
  RETURN 'ok';
END $$;

-- Update avatar / UPI / QR. p_patch keys: avatar_url, upi_id, qr_code_url (null clears).
CREATE OR REPLACE FUNCTION vk_update_profile(p_token UUID, p_target TEXT, p_patch JSONB)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE caller vk_members;
BEGIN
  caller := vk_session_member(p_token);
  IF caller.id IS NULL THEN RETURN 'not_logged_in'; END IF;
  IF caller.id <> p_target AND NOT caller.is_silent_admin THEN RETURN 'forbidden'; END IF;

  UPDATE vk_members SET
    avatar_url  = CASE WHEN p_patch ? 'avatar_url'  THEN p_patch->>'avatar_url'  ELSE avatar_url  END,
    upi_id      = CASE WHEN p_patch ? 'upi_id'      THEN p_patch->>'upi_id'      ELSE upi_id      END,
    qr_code_url = CASE WHEN p_patch ? 'qr_code_url' THEN p_patch->>'qr_code_url' ELSE qr_code_url END,
    updated_at  = NOW()
  WHERE id = p_target;
  RETURN 'ok';
END $$;

REVOKE ALL ON FUNCTION vk_session_member(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION vk_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION vk_check_session(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION vk_logout(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION vk_change_password(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION vk_update_profile(UUID, TEXT, JSONB) TO anon, authenticated;

-- ------------------------------------------------------------
-- 5. REALTIME (live sync across phones)
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vk_expenses;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vk_settlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE vk_spot_checks; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
