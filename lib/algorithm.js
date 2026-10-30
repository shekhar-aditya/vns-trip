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

/**
 * Greedy debt simplification (Splitwise-style): repeatedly match the
 * largest debtor with the largest creditor. Settles n people in at
 * most n-1 transfers.
 */
export function simplifyDebts(members, expenses, settlements = []) {
  const balances = calculateBalances(members, expenses, settlements);

  const debtors = [];
  const creditors = [];

  members.forEach(m => {
    const balance = Math.round((balances[m.id] || 0) * 100) / 100;
    if (balance < -0.01) debtors.push({ member: m, amount: -balance });
    else if (balance > 0.01) creditors.push({ member: m, amount: balance });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const settleAmount = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(settleAmount * 100) / 100;

    if (rounded > 0) {
      transactions.push({ from: debtors[i].member, to: creditors[j].member, amount: rounded });
    }

    debtors[i].amount -= settleAmount;
    creditors[j].amount -= settleAmount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return transactions;
}

export function getTotalSpent(expenses) {
  return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
}
