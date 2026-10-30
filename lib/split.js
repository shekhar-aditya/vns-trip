// ============================================================
// SPLIT MATH — all amounts are allocated in whole paise so the
// shares always add up exactly to the bill.
// ============================================================

export const SPLIT_MODES = [
  { id: 'equal', label: '= EQUAL' },
  { id: 'exact', label: '₹ EXACT' },
  { id: 'percent', label: '% PERCENT' },
  { id: 'shares', label: '× SHARES' },
];

const toPaise = n => Math.round((parseFloat(n) || 0) * 100);
const fromPaise = p => p / 100;

/**
 * Split `total` across ids proportionally to weights using the
 * largest-remainder method. Returns { id: rupees }.
 */
export function distribute(total, weights) {
  const ids = Object.keys(weights).filter(id => weights[id] > 0);
  const weightSum = ids.reduce((s, id) => s + weights[id], 0);
  if (!ids.length || weightSum <= 0) return {};

  const totalPaise = toPaise(total);
  const raw = ids.map(id => ({ id, exact: (totalPaise * weights[id]) / weightSum }));
  raw.forEach(r => { r.floor = Math.floor(r.exact); });
  let leftover = totalPaise - raw.reduce((s, r) => s + r.floor, 0);
  [...raw]
    .sort((a, b) => (b.exact - b.floor) - (a.exact - a.floor))
    .forEach(r => { if (leftover > 0) { r.floor += 1; leftover -= 1; } });

  return Object.fromEntries(raw.map(r => [r.id, fromPaise(r.floor)]));
}

/**
 * Compute per-member shares for a split mode.
 * `inputs` holds raw values per member (exact ₹, percent, or share weight).
 * Returns { splits, remaining, error } — `remaining` is unassigned ₹ / %.
 */
export function computeSplits(mode, amount, selectedIds, inputs = {}) {
  const total = parseFloat(amount) || 0;
  if (total <= 0) return { splits: {}, remaining: 0, error: 'Enter an amount' };
  if (!selectedIds.length) return { splits: {}, remaining: total, error: 'Pick at least one person' };

  if (mode === 'exact') {
    const splits = {};
    selectedIds.forEach(id => { splits[id] = fromPaise(toPaise(inputs[id])); });
    const remaining = fromPaise(toPaise(total) - selectedIds.reduce((s, id) => s + toPaise(inputs[id]), 0));
    const clean = Object.fromEntries(Object.entries(splits).filter(([, v]) => v > 0));
    return {
      splits: clean,
      remaining,
      error: Math.abs(remaining) >= 0.01
        ? (remaining > 0 ? `₹${remaining.toFixed(2)} left to assign` : `₹${Math.abs(remaining).toFixed(2)} over the bill`)
        : (Object.keys(clean).length ? null : 'Assign some amounts'),
    };
  }

  if (mode === 'percent') {
    const weights = {};
    selectedIds.forEach(id => { weights[id] = parseFloat(inputs[id]) || 0; });
    const pctSum = Object.values(weights).reduce((s, v) => s + v, 0);
    const remaining = Math.round((100 - pctSum) * 100) / 100;
    return {
      splits: distribute(total, weights),
      remaining,
      error: Math.abs(remaining) >= 0.01
        ? (remaining > 0 ? `${remaining}% left to assign` : `${Math.abs(remaining)}% over 100`)
        : null,
    };
  }

  if (mode === 'shares') {
    const weights = {};
    selectedIds.forEach(id => {
      const w = inputs[id] === undefined || inputs[id] === '' ? 1 : parseFloat(inputs[id]);
      weights[id] = w > 0 ? w : 0;
    });
    const splits = distribute(total, weights);
    return { splits, remaining: 0, error: Object.keys(splits).length ? null : 'Give someone a share' };
  }

  const weights = Object.fromEntries(selectedIds.map(id => [id, 1]));
  return { splits: distribute(total, weights), remaining: 0, error: null };
}

/** Validate multi-payer amounts. Returns { payers, remaining, error }. */
export function computePayers(amount, payerInputs) {
  const total = parseFloat(amount) || 0;
  const payers = {};
  Object.entries(payerInputs).forEach(([id, v]) => {
    const p = toPaise(v);
    if (p > 0) payers[id] = fromPaise(p);
  });
  const remaining = fromPaise(toPaise(total) - Object.values(payers).reduce((s, v) => s + toPaise(v), 0));
  let error = null;
  if (Object.keys(payers).length < 1) error = 'Enter who paid how much';
  else if (Math.abs(remaining) >= 0.01) error = remaining > 0 ? `₹${remaining.toFixed(2)} of the bill not covered` : `Payers exceed bill by ₹${Math.abs(remaining).toFixed(2)}`;
  return { payers, remaining, error };
}

const hasEntries = obj => obj && typeof obj === 'object' && Object.keys(obj).length > 0;

/** { memberId: rupeesPaid } for any expense (falls back to single payer). */
export function getExpensePayers(expense) {
  if (hasEntries(expense.payers)) {
    return Object.fromEntries(Object.entries(expense.payers).map(([k, v]) => [k, parseFloat(v)]));
  }
  return { [expense.paid_by]: parseFloat(expense.amount) };
}

/** { memberId: rupeesOwed } for any expense (falls back to equal split). */
export function getExpenseSplits(expense) {
  if (hasEntries(expense.splits)) {
    return Object.fromEntries(Object.entries(expense.splits).map(([k, v]) => [k, parseFloat(v)]));
  }
  const ids = expense.split_among || [];
  return distribute(expense.amount, Object.fromEntries(ids.map(id => [id, 1])));
}

export function isInvolved(expense, memberId) {
  return memberId in getExpensePayers(expense) || memberId in getExpenseSplits(expense);
}
