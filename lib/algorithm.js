import { getExpensePayers, getExpenseSplits } from './split';

/**
 * Calculate net balances for each member.
 * Net = (total amount they paid) - (total of their shares)
 * Positive = they are owed money, Negative = they owe money
 */
export function calculateBalances(members, expenses, settlements = []) {
  const balances = {};
  members.forEach(m => { balances[m.id] = 0; });

  expenses.forEach(expense => {
    Object.entries(getExpensePayers(expense)).forEach(([id, paid]) => {
      balances[id] = (balances[id] || 0) + paid;
    });
    Object.entries(getExpenseSplits(expense)).forEach(([id, share]) => {
      balances[id] = (balances[id] || 0) - share;
    });
  });

  // A settlement moves money from paid_by to paid_to
  settlements.forEach(s => {
    const amount = parseFloat(s.amount);
    balances[s.paid_by] = (balances[s.paid_by] || 0) + amount;
    balances[s.paid_to] = (balances[s.paid_to] || 0) - amount;
  });

  return balances;
}

/**
 * Get per-member spending statistics
 */
export function getMemberStats(members, expenses, settlements = []) {
  const stats = {};
  members.forEach(m => {
    stats[m.id] = {
      member: m,
      totalPaid: 0,      // total they actually paid out for bills
      totalShare: 0,     // total of their shares
      netBalance: 0,     // + owed to them, - they owe
      expenseCount: 0,   // bills they paid (fully or partly)
      loggedCount: 0,    // bills they added to the app
    };
  });

  expenses.forEach(expense => {
    Object.entries(getExpensePayers(expense)).forEach(([id, paid]) => {
      if (!stats[id]) return;
      stats[id].totalPaid += paid;
      stats[id].expenseCount += 1;
    });
    Object.entries(getExpenseSplits(expense)).forEach(([id, share]) => {
      if (stats[id]) stats[id].totalShare += share;
    });
    if (stats[expense.created_by]) stats[expense.created_by].loggedCount += 1;
  });

  const balances = calculateBalances(members, expenses, settlements);
  members.forEach(m => {
    stats[m.id].netBalance = balances[m.id] || 0;
  });

  return stats;
}

const round2 = n => Math.round(n * 100) / 100;

/**
 * Direct pairwise ledger: `ledger[a][b]` is what a owes b (negative means
 * b owes a). Each participant owes each payer of a bill directly; debts are
 * never routed through a third person. A payment from a to b reduces what
 * a owes b, and overpaying flips the balance.
 */
export function pairwiseLedger(expenses, settlements = []) {
  const ledger = {};
  const add = (a, b, amount) => {
    if (a === b || !amount) return;
    (ledger[a] ||= {})[b] = (ledger[a][b] || 0) + amount;
    (ledger[b] ||= {})[a] = (ledger[b][a] || 0) - amount;
  };

  expenses.forEach(expense => {
    const payers = getExpensePayers(expense);
    const totalPaid = Object.values(payers).reduce((s, v) => s + v, 0);
    if (totalPaid <= 0) return;
    Object.entries(getExpenseSplits(expense)).forEach(([debtor, share]) => {
      Object.entries(payers).forEach(([payer, paid]) => add(debtor, payer, share * paid / totalPaid));
    });
  });

  settlements.forEach(s => add(s.paid_by, s.paid_to, -parseFloat(s.amount)));

  return ledger;
}

/** What `a` owes `b` (rounded). Negative means `b` owes `a`. */
export function pairBalance(ledger, a, b) {
  return round2(ledger[a]?.[b] || 0);
}

/** Outstanding direct debts, one per pair of members: [{ from, to, amount }]. */
export function pairwiseDebts(members, expenses, settlements = []) {
  const ledger = pairwiseLedger(expenses, settlements);
  const debts = [];
  members.forEach((a, i) => {
    members.slice(i + 1).forEach(b => {
      const owed = pairBalance(ledger, a.id, b.id);
      if (owed >= 0.01) debts.push({ from: a, to: b, amount: owed });
      else if (owed <= -0.01) debts.push({ from: b, to: a, amount: -owed });
    });
  });
  return debts.sort((x, y) => y.amount - x.amount);
}

/**
 * Settlements involving `memberId`, newest first, each with the pairwise
 * balance between the two people right after that payment was recorded.
 */
export function paymentHistory(memberId, expenses, settlements) {
  const time = r => new Date(r.created_at).getTime();
  return settlements
    .filter(s => s.paid_by === memberId || s.paid_to === memberId)
    .map(s => {
      const at = time(s);
      const ledger = pairwiseLedger(
        expenses.filter(e => time(e) <= at),
        settlements.filter(o => time(o) < at || o.id === s.id),
      );
      return { ...s, balanceAfter: pairBalance(ledger, s.paid_by, s.paid_to) };
    })
    .sort((x, y) => time(y) - time(x));
}

export function getTotalSpent(expenses) {
  return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
}
