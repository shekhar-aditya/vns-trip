import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using demo mode.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================
// MEMBER DEFINITIONS
// ============================================================
export const MEMBERS = [
  { id: '1', name: 'Aditya Shekhar', username: 'aditya', color: '#6C63FF', initials: 'AS' },
  { id: '2', name: 'Aman Murari', username: 'aman', color: '#00D68F', initials: 'AM' },
  { id: '3', name: 'Chotu (Varun)', username: 'varun', color: '#FF9F43', initials: 'CV' },
  { id: '4', name: 'Ananya Arohi', username: 'ananya', color: '#E91E8C', initials: 'AA' },
  { id: '5', name: 'Ritu Singh', username: 'ritu', color: '#00B4D8', initials: 'RS' },
];

export function getMemberById(id) {
  return MEMBERS.find(m => m.id === id);
}

export function getMemberByUsername(username) {
  return MEMBERS.find(m => m.username === username);
}

// ============================================================
// LOCAL STORAGE HELPERS (works alongside Supabase)
// ============================================================
const STORAGE_KEY = 'varanasi_trip_data';
const USER_KEY = 'varanasi_current_user';

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(member) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(member));
}

// ============================================================
// DATA LAYER — Uses Supabase if available, falls back to localStorage
// ============================================================

function getLocalData() {
  if (typeof window === 'undefined') return { expenses: [], settlements: [] };
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : { expenses: [], settlements: [] };
}

function setLocalData(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- EXPENSES ----------

export async function getExpenses() {
  if (supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return getLocalData().expenses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function addExpense(expense) {
  const newExpense = {
    ...expense,
    id: expense.id || crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([newExpense])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const local = getLocalData();
  local.expenses.push(newExpense);
  setLocalData(local);
  return newExpense;
}

export async function deleteExpense(id) {
  if (supabase) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const local = getLocalData();
  local.expenses = local.expenses.filter(e => e.id !== id);
  setLocalData(local);
}

// ---------- SETTLEMENTS ----------

export async function getSettlements() {
  if (supabase) {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return getLocalData().settlements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function addSettlement(settlement) {
  const newSettlement = {
    ...settlement,
    id: settlement.id || crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('settlements')
      .insert([newSettlement])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const local = getLocalData();
  local.settlements.push(newSettlement);
  setLocalData(local);
  return newSettlement;
}
