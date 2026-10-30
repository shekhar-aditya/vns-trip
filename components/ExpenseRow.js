'use client';

import MemberAvatar from './MemberAvatar';
import { useTrip } from './TripProvider';
import { getCategoryById } from '@/lib/categories';
import { getExpensePayers, getExpenseSplits } from '@/lib/split';
import { expenseDate, dateTime, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

export default function ExpenseRow({ expense, onClick, highlightId }) {
  const { membersById } = useTrip();
  const category = getCategoryById(expense.category);
  const payerIds = Object.keys(getExpensePayers(expense));
  const splits = getExpenseSplits(expense);
  const payer = membersById[payerIds[0]];
  const myShare = highlightId ? splits[highlightId] : undefined;

  return (
    <button className="card expense-row" onClick={onClick}>
      <div className="expense-row__icon" style={{ background: category.color }}>{category.icon}</div>
      <div className="expense-row__info">
        <div className="expense-row__desc">{expense.description || category.label}</div>
        <div className="expense-row__meta">
          {payer && <MemberAvatar member={payer} size="xs" />}
          <span>
            {firstName(payer)}{payerIds.length > 1 ? ` +${payerIds.length - 1}` : ''} paid
          </span>
          <span>·</span>
          <span className="mono">{dateTime(expenseDate(expense))}</span>
        </div>
      </div>
      <div className="expense-row__right">
        <div className="expense-row__amount mono">{inr(expense.amount, 2)}</div>
        <div className="expense-row__split mono">
          {myShare !== undefined ? `you ${inr(myShare, 2)}` : `÷ ${Object.keys(splits).length}`}
        </div>
      </div>
    </button>
  );
}
