// ============================================================
// DATA LAYER — Supabase when configured, localStorage otherwise.
// Both backends expose the same API and the same permission rules.
// ============================================================
import { supabase } from './supabase';
import { MEMBER_SEED, toPublicMember } from './members';

export const isCloud = Boolean(supabase);

const DATA_KEY = 'varkala_trip_data';
const SESSION_KEY = 'varkala_trip_session';
const MEMBER_COLUMNS = 'id, avatar_url, upi_id, qr_code_url, updated_at';

// ---------- device session ----------

export function getStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function storeSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

// ---------- local backend helpers ----------

async function hashPassword(memberId, password) {
  const input = `varkala:${memberId}:${password}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Non-secure context (e.g. LAN IP over http): weak fallback, demo mode only
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return `fnv${(h >>> 0).toString(16)}`;
}

async function getLocalData() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(DATA_KEY));
  } catch {
    data = null;
  }
  data = { expenses: [], settlements: [], spotChecks: {}, members: {}, sessions: {}, ...data };
  let seeded = false;
  for (const m of MEMBER_SEED) {
    if (!data.members[m.id]) {
      data.members[m.id] = { password_hash: await hashPassword(m.id, m.defaultPassword) };
      seeded = true;
    }
  }
  if (seeded) setLocalData(data);
  return data;
}

function setLocalData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const byNewest = key => (a, b) => new Date(b[key] || b.created_at) - new Date(a[key] || a.created_at);

// ---------- reads ----------

export async function fetchAll() {
  if (supabase) {
    const [m, e, s, c] = await Promise.all([
      supabase.from('vk_members').select(MEMBER_COLUMNS),
      supabase.from('vk_expenses').select('*').order('spent_at', { ascending: false }),
      supabase.from('vk_settlements').select('*').order('created_at', { ascending: false }),
      supabase.from('vk_spot_checks').select('*'),
    ]);
    const error = m.error || e.error || s.error || c.error;
    if (error) throw error;
    const profiles = Object.fromEntries((m.data || []).map(p => [p.id, p]));
    return {
      members: MEMBER_SEED.map(seed => toPublicMember(seed, profiles[seed.id])),
      expenses: e.data || [],
      settlements: s.data || [],
      spotChecks: Object.fromEntries((c.data || []).map(r => [r.spot_id, r])),
    };
  }

  const data = await getLocalData();
  return {
    members: MEMBER_SEED.map(seed => toPublicMember(seed, data.members[seed.id])),
    expenses: [...data.expenses].sort(byNewest('spent_at')),
    settlements: [...data.settlements].sort(byNewest('created_at')),
    spotChecks: data.spotChecks,
  };
}

// ---------- auth ----------

function normalizeSession(raw) {
  return raw ? { token: raw.token, memberId: raw.member_id, isAdmin: Boolean(raw.is_admin) } : null;
}

/** Returns the new session, or null for a wrong Member ID / password. */
export async function login(memberId, password) {
  let session;
  if (supabase) {
    const { data, error } = await supabase.rpc('vk_login', { p_member_id: memberId, p_password: password });
    if (error) throw error;
    session = normalizeSession(data);
  } else {
    const data = await getLocalData();
    const seed = MEMBER_SEED.find(m => m.id === memberId);
    if (!seed || data.members[seed.id].password_hash !== await hashPassword(seed.id, password)) return null;
    const token = newId();
    data.sessions[token] = seed.id;
    setLocalData(data);
    session = { token, memberId: seed.id, isAdmin: Boolean(seed.isSilentAdmin) };
  }
  storeSession(session);
  return session;
}

/** Re-validate the device session (it is revoked if the password was reset). */
export async function checkSession(session) {
  if (!session?.token) return null;
  let fresh;
  if (supabase) {
    const { data, error } = await supabase.rpc('vk_check_session', { p_token: session.token });
    if (error) return session; // offline / transient: keep the device unlocked
    fresh = normalizeSession(data);
  } else {
    const data = await getLocalData();
    const memberId = data.sessions[session.token];
    const seed = MEMBER_SEED.find(m => m.id === memberId);
    fresh = seed ? { token: session.token, memberId, isAdmin: Boolean(seed.isSilentAdmin) } : null;
  }
  storeSession(fresh);
  return fresh;
}

export async function logout(session) {
  storeSession(null);
  if (!session?.token) return;
  if (supabase) {
    await supabase.rpc('vk_logout', { p_token: session.token });
  } else {
    const data = await getLocalData();
    delete data.sessions[session.token];
    setLocalData(data);
  }
}

const PASSWORD_ERRORS = {
  not_logged_in: 'Your session expired. Log in again.',
  unknown_member: 'Unknown member.',
  too_short: 'New password must be at least 4 characters.',
  wrong_current: 'Current password is incorrect.',
  forbidden: 'You can only change your own password.',
};

/**
 * Change a password. `current` is required when changing your own;
 * the silent admin may pass null to reset someone else's.
 * Returns null on success or an error message.
 */
export async function changePassword(session, targetId, current, next) {
  let code;
  if (supabase) {
    const { data, error } = await supabase.rpc('vk_change_password', {
      p_token: session.token, p_target: targetId, p_current: current, p_new: next,
    });
    if (error) throw error;
    code = data;
  } else {
    const data = await getLocalData();
    const callerId = data.sessions[session.token];
    const caller = MEMBER_SEED.find(m => m.id === callerId);
    const target = data.members[targetId];
    if (!caller) code = 'not_logged_in';
    else if (!target) code = 'unknown_member';
    else if (String(next || '').length < 4) code = 'too_short';
    else if (callerId === targetId && target.password_hash !== await hashPassword(targetId, current || '')) code = 'wrong_current';
    else if (callerId !== targetId && !caller.isSilentAdmin) code = 'forbidden';
    else {
      target.password_hash = await hashPassword(targetId, next);
      for (const [token, memberId] of Object.entries(data.sessions)) {
        if (memberId === targetId && token !== session.token) delete data.sessions[token];
      }
      setLocalData(data);
      code = 'ok';
    }
  }
  return code === 'ok' ? null : (PASSWORD_ERRORS[code] || 'Could not change password.');
}

/** patch: { avatar_url?, upi_id?, qr_code_url? } — null clears a field. */
export async function updateProfile(session, targetId, patch) {
  if (supabase) {
    const { data, error } = await supabase.rpc('vk_update_profile', {
      p_token: session.token, p_target: targetId, p_patch: patch,
    });
    if (error) throw error;
    if (data !== 'ok') throw new Error(data === 'forbidden' ? 'Not allowed.' : 'Session expired. Log in again.');
    return;
  }
  const data = await getLocalData();
  const callerId = data.sessions[session.token];
  const caller = MEMBER_SEED.find(m => m.id === callerId);
  if (!caller) throw new Error('Session expired. Log in again.');
  if (callerId !== targetId && !caller.isSilentAdmin) throw new Error('Not allowed.');
  Object.assign(data.members[targetId], patch);
  setLocalData(data);
}

// ---------- expenses ----------

export async function addExpense(expense) {
  const now = new Date().toISOString();
  const row = { ...expense, id: newId(), created_at: now, spent_at: expense.spent_at || now };
  if (supabase) {
    const { data, error } = await supabase.from('vk_expenses').insert([row]).select().single();
    if (error) throw error;
    return data;
  }
  const data = await getLocalData();
  data.expenses.push(row);
  setLocalData(data);
  return row;
}

export async function updateExpense(id, changes) {
  const patch = { ...changes, updated_at: new Date().toISOString() };
  if (supabase) {
    const { data, error } = await supabase.from('vk_expenses').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const data = await getLocalData();
  const idx = data.expenses.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Expense not found');
  data.expenses[idx] = { ...data.expenses[idx], ...patch };
  setLocalData(data);
  return data.expenses[idx];
}

export async function deleteExpense(id) {
  if (supabase) {
    const { error } = await supabase.from('vk_expenses').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const data = await getLocalData();
  data.expenses = data.expenses.filter(e => e.id !== id);
  setLocalData(data);
}

// ---------- settlements ----------

export async function addSettlement(settlement) {
  const row = { ...settlement, id: newId(), created_at: new Date().toISOString() };
  if (supabase) {
    const { data, error } = await supabase.from('vk_settlements').insert([row]).select().single();
    if (error) throw error;
    return data;
  }
  const data = await getLocalData();
  data.settlements.push(row);
  setLocalData(data);
  return row;
}

export async function deleteSettlement(id) {
  if (supabase) {
    const { error } = await supabase.from('vk_settlements').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const data = await getLocalData();
  data.settlements = data.settlements.filter(s => s.id !== id);
  setLocalData(data);
}

// ---------- spot checklist ----------

export async function setSpotCheck(spotId, checked, memberId) {
  const row = { spot_id: spotId, checked, checked_by: memberId, updated_at: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.from('vk_spot_checks').upsert(row);
    if (error) throw error;
    return;
  }
  const data = await getLocalData();
  data.spotChecks[spotId] = row;
  setLocalData(data);
}

// ---------- snapshots (trip data backup / restore) ----------

export async function exportSnapshot() {
  const { members, expenses, settlements, spotChecks } = await fetchAll();
  return {
    app: 'varkala-trip-2026',
    version: 1,
    exported_at: new Date().toISOString(),
    profiles: members.map(m => ({ id: m.id, avatar_url: m.avatarUrl, upi_id: m.upiId, qr_code_url: m.qrCodeUrl })),
    expenses,
    settlements,
    spot_checks: Object.values(spotChecks),
  };
}

/**
 * Replace all expenses, settlements and checklist state with a snapshot.
 * Profiles are restored through the (admin) session. Passwords are untouched.
 */
export async function restoreSnapshot(session, snapshot) {
  if (snapshot?.app !== 'varkala-trip-2026' || !Array.isArray(snapshot.expenses) || !Array.isArray(snapshot.settlements)) {
    throw new Error('That file is not a Varkala Trip snapshot.');
  }
  const spotRows = snapshot.spot_checks || [];

  if (supabase) {
    const all = col => supabase.from(col);
    for (const [table, key] of [['vk_expenses', 'id'], ['vk_settlements', 'id'], ['vk_spot_checks', 'spot_id']]) {
      const { error } = await all(table).delete().not(key, 'is', null);
      if (error) throw error;
    }
    if (snapshot.expenses.length) {
      const { error } = await all('vk_expenses').insert(snapshot.expenses);
      if (error) throw error;
    }
    if (snapshot.settlements.length) {
      const { error } = await all('vk_settlements').insert(snapshot.settlements);
      if (error) throw error;
    }
    if (spotRows.length) {
      const { error } = await all('vk_spot_checks').insert(spotRows);
      if (error) throw error;
    }
  } else {
    const data = await getLocalData();
    data.expenses = snapshot.expenses;
    data.settlements = snapshot.settlements;
    data.spotChecks = Object.fromEntries(spotRows.map(r => [r.spot_id, r]));
    setLocalData(data);
  }

  for (const p of snapshot.profiles || []) {
    if (!MEMBER_SEED.some(m => m.id === p.id)) continue;
    await updateProfile(session, p.id, { avatar_url: p.avatar_url || null, upi_id: p.upi_id || null, qr_code_url: p.qr_code_url || null });
  }
}

// ---------- live sync ----------

/** Calls `onChange` whenever data changes on another device/tab. */
export function subscribe(onChange) {
  if (supabase) {
    const channel = supabase
      .channel('varkala-trip')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vk_expenses' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vk_settlements' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vk_spot_checks' }, onChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
  const handler = e => { if (e.key === DATA_KEY) onChange(); };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
