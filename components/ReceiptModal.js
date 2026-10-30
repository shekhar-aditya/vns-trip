'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from './Modal';
import MemberAvatar from './MemberAvatar';
import IdTag from './IdTag';
import { useTrip } from './TripProvider';
import { deleteExpense } from '@/lib/store';
import { getCategoryById } from '@/lib/categories';
import { getExpensePayers, getExpenseSplits, SPLIT_MODES } from '@/lib/split';
import { canDeleteExpense, canEditExpense } from '@/lib/permissions';
import { expenseDate, inr, longDateTime, dateTime } from '@/lib/format';

export default function ReceiptModal({ expense, onClose }) {
  const { membersById, session, refresh, toast } = useTrip();
  const [deleting, setDeleting] = useState(false);

  const category = getCategoryById(expense.category);
  const payers = getExpensePayers(expense);
  const splits = getExpenseSplits(expense);
  const mode = SPLIT_MODES.find(m => m.id === (expense.split_mode || 'equal'));
  const creator = membersById[expense.created_by];
  const editable = canEditExpense(session, expense);
  const deletable = canDeleteExpense(session, expense);

  const handleDelete = async () => {
    if (!confirm(`Delete "${expense.description}" (${inr(expense.amount, 2)})? Everyone's split of it is reversed.`)) return;
    setDeleting(true);
    try {
      await deleteExpense(expense.id);
      await refresh();
      toast('🗑️ Expense deleted · balances updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast('Could not delete');
      setDeleting(false);
    }
  };

  return (
    <Modal title="🧾 Receipt" onClose={onClose} className="receipt-modal">
      <div className="receipt">
        <div className="receipt__top">
          <div className="receipt__brand">VARKALA TRIP &apos;26</div>
          <div className="receipt__cat" style={{ background: category.color }}>{category.icon} {category.label}</div>
          <div className="receipt__desc">{expense.description || category.label}</div>
          <div className="receipt__amount mono">{inr(expense.amount, 2)}</div>
          <div className="receipt__date mono">{longDateTime(expenseDate(expense))}</div>
        </div>

        <div className="receipt__perf" aria-hidden />

        <div className="receipt__section">
          <div className="receipt__label">PAID BY</div>
          {Object.entries(payers).map(([id, amt]) => {
            const m = membersById[id];
            return (
              <div key={id} className="receipt__line">
                <MemberAvatar member={m} size="xs" />
                <span className="receipt__name">{m?.name || id}</span>
                <IdTag id={id} />
                <span className="receipt__dots" />
                <span className="mono">{inr(amt, 2)}</span>
              </div>
            );
          })}
        </div>

        <div className="receipt__section">
          <div className="receipt__label">SPLIT {mode?.label} · {Object.keys(splits).length} PEOPLE</div>
          {Object.entries(splits).map(([id, share]) => {
            const m = membersById[id];
            const raw = expense.split_inputs?.[id];
            const suffix = expense.split_mode === 'percent' ? ` (${raw}%)` : expense.split_mode === 'shares' ? ` (${raw || 1}×)` : '';
            return (
              <div key={id} className={`receipt__line ${id === session?.memberId ? 'receipt__line--me' : ''}`}>
                <MemberAvatar member={m} size="xs" />
                <span className="receipt__name">{m?.name || id}{suffix}</span>
                <span className="receipt__dots" />
                <span className="mono">{inr(share, 2)}</span>
              </div>
            );
          })}
        </div>

        {expense.note && (
          <div className="receipt__section">
            <div className="receipt__label">NOTES</div>
            <div className="receipt__note">{expense.note}</div>
          </div>
        )}

        <div className="receipt__foot mono">
          {creator ? `LOGGED BY ${creator.id}` : ''}
          {expense.updated_at ? ` · EDITED ${dateTime(expense.updated_at)}` : ''}
        </div>
      </div>

      {(editable || deletable) && (
        <div className="btn-row">
          {editable && <Link className="btn btn--cyan" href={`/add?edit=${expense.id}`} onClick={onClose}>✏️ Edit</Link>}
          {deletable && (
            <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : '🗑️ Delete'}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
