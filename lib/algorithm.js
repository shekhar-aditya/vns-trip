import { MEMBERS } from './supabase';

/**
 * Calculate net balances for each member.
 * Net = (total amount they paid) - (total amount they owe as splits)
 * Positive = they are owed money, Negative = they owe money
 */
export function calculateBalances(expenses, settlements = []) {
  const balances = {};
  MEMBERS.forEach(m => { balances[m.id] = 0; });

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    const paidBy = expense.paid_by;
    const splitAmong = expense.split_among || [];

    // The payer gets credit for the full amount
    balances[paidBy] = (balances[paidBy] || 0) + amount;

    // Each person in the split owes their share
    const shareAmount = amount / splitAmong.length;
    splitAmong.forEach(memberId => {
      balances[memberId] = (balances[memberId] || 0) - shareAmount;
    });
  });

  // Apply settlements
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
export function getMemberStats(expenses, settlements = []) {
  const stats = {};
  MEMBERS.forEach(m => {
    stats[m.id] = {
      member: m,
      totalPaid: 0,      // total they actually paid out
      totalShare: 0,      // total they owe as their share
      netBalance: 0,      // + owed to them, - they owe
      expenseCount: 0,
    };
  });

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    const paidBy = expense.paid_by;
    const splitAmong = expense.split_among || [];

    if (stats[paidBy]) {
      stats[paidBy].totalPaid += amount;
      stats[paidBy].expenseCount += 1;
    }

    const shareAmount = amount / splitAmong.length;
    splitAmong.forEach(memberId => {
      if (stats[memberId]) {
        stats[memberId].totalShare += shareAmount;
      }
    });
  });

  // Calculate net balance
  const balances = calculateBalances(expenses, settlements);
  MEMBERS.forEach(m => {
    stats[m.id].netBalance = balances[m.id] || 0;
  });

  return stats;
}

/**
 * Greedy debt simplification algorithm (Splitwise-inspired)
 * Returns minimum transactions needed to settle all debts
 */
export function simplifyDebts(expenses, settlements = []) {
  const balances = calculateBalances(expenses, settlements);

  const debtors = [];  // people who owe money (negative balance)
  const creditors = []; // people who are owed money (positive balance)

  MEMBERS.forEach(m => {
    const balance = Math.round((balances[m.id] || 0) * 100) / 100; // round to 2 decimal
    if (balance < -0.01) {
      debtors.push({ member: m, amount: Math.abs(balance) });
    } else if (balance > 0.01) {
      creditors.push({ member: m, amount: balance });
    }
  });

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const settleAmount = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(settleAmount * 100) / 100;

    if (rounded > 0) {
      transactions.push({
        from: debtors[i].member,
        to: creditors[j].member,
        amount: rounded,
      });
    }

    debtors[i].amount -= settleAmount;
    creditors[j].amount -= settleAmount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return transactions;
}

/**
 * Get total trip spending
 */
export function getTotalSpent(expenses) {
  return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
}
