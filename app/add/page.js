'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import MemberAvatar from '@/components/MemberAvatar';
import { useTrip } from '@/components/TripProvider';
import { addExpense, updateExpense } from '@/lib/store';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import { SPLIT_MODES, computePayers, computeSplits, getExpensePayers, getExpenseSplits } from '@/lib/split';
import { canEditExpense } from '@/lib/permissions';
import { expenseDate, inr, toLocalInputValue } from '@/lib/format';
import { firstName } from '@/lib/members';

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export default function AddExpensePage() {
  return (
    <Suspense fallback={<div className="loading-block">LOADING…</div>}>
      <AddExpenseLoader />
    </Suspense>
  );
}

function AddExpenseLoader() {
  const params = useSearchParams();
  const { expenses, loading, session } = useTrip();
  const editId = params.get('edit');

  if (editId) {
    if (loading) return <div className="loading-block">LOADING…</div>;
    const expense = expenses.find(e => e.id === editId);
    if (!expense || !canEditExpense(session, expense)) {
      return (
        <>
          <AppHeader title="EDIT EXPENSE" back />
          <div className="page-content">
            <div className="card empty-state">
              <div className="empty-state__icon">🔒</div>
              <div className="empty-state__title">{expense ? "You can't edit this one" : 'Expense not found'}</div>
              <div className="empty-state__desc">Only the person who logged or paid for it can change it.</div>
            </div>
          </div>
        </>
      );
    }
    return <ExpenseForm key={editId} expense={expense} />;
  }

  return (
    <ExpenseForm
      key="new"
      preset={{ category: params.get('category'), description: params.get('desc') }}
    />
  );
}

function initialState(expense, preset) {
  if (!expense) {
    return {
      amount: '',
      description: preset?.description || '',
      category: CATEGORIES.some(c => c.id === preset?.category) ? preset.category : 'food',
      spentAt: toLocalInputValue(new Date()),
      note: '',
      multiPayer: false,
      paidBy: '',
      payerInputs: {},
      splitMode: 'equal',
      selected: null, // null = everyone, resolved after members load
      splitInputs: {},
    };
  }
  const payers = getExpensePayers(expense);
  const splits = getExpenseSplits(expense);
  const mode = expense.split_mode || 'equal';
  const splitInputs = mode === 'exact'
    ? Object.fromEntries(Object.entries(splits).map(([k, v]) => [k, String(v)]))
    : Object.fromEntries(Object.entries(expense.split_inputs || {}).map(([k, v]) => [k, String(v)]));
  return {
    amount: String(parseFloat(expense.amount)),
    description: expense.description || '',
    category: expense.category,
    spentAt: toLocalInputValue(expenseDate(expense)),
    note: expense.note || '',
    multiPayer: Object.keys(payers).length > 1,
    paidBy: expense.paid_by,
    payerInputs: Object.fromEntries(Object.entries(payers).map(([k, v]) => [k, String(v)])),
    splitMode: mode,
    selected: Object.keys(splits),
    splitInputs,
  };
}

function ExpenseForm({ expense, preset }) {
  const router = useRouter();
  const { members, session, refresh, toast } = useTrip();
  const [form, setForm] = useState(() => initialState(expense, preset));
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const set = patch => setForm(f => ({ ...f, ...patch }));
  const allIds = members.map(m => m.id);
  const selected = form.selected ?? allIds;
  const paidBy = form.paidBy || session?.memberId || '';

  const splitResult = computeSplits(form.splitMode, form.amount, selected, form.splitInputs);
  const payerResult = form.multiPayer
    ? computePayers(form.amount, form.payerInputs)
    : { payers: paidBy ? { [paidBy]: parseFloat(form.amount) || 0 } : {}, error: paidBy ? null : 'Pick who paid' };

  const amountNum = parseFloat(form.amount) || 0;
  const errors = [
    amountNum <= 0 && 'Enter an amount',
    payerResult.error,
    splitResult.error,
  ].filter(Boolean);

  const toggleMember = id => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    set({ selected: allIds.filter(x => next.includes(x)) });
  };

  const toggleAll = () => set({ selected: selected.length === allIds.length ? [] : allIds });

  const setSplitInput = (id, value) => set({ splitInputs: { ...form.splitInputs, [id]: value } });
  const setPayerInput = (id, value) => set({ payerInputs: { ...form.payerInputs, [id]: value } });

  const evenPercents = () => {
    if (!selected.length) return;
    const base = Math.floor((100 / selected.length) * 100) / 100;
    const inputs = {};
    selected.forEach((id, i) => {
      inputs[id] = String(i === 0 ? Math.round((100 - base * (selected.length - 1)) * 100) / 100 : base);
    });
    set({ splitInputs: inputs });
  };

  const handleSubmit = async () => {
    setAttempted(true);
    if (errors.length || !session) return;
    setSaving(true);

    const payers = payerResult.payers;
    const splits = splitResult.splits;
    const splitInputs = form.splitMode === 'equal'
      ? {}
      : Object.fromEntries(selected.map(id => [id, parseFloat(form.splitInputs[id]) || (form.splitMode === 'shares' ? 1 : 0)]));

    const row = {
      amount: amountNum,
      description: form.description.trim() || getCategoryById(form.category).label,
      category: form.category,
      paid_by: Object.keys(payers)[0],
      payers,
      split_among: Object.keys(splits),
      splits,
      split_mode: form.splitMode,
      split_inputs: splitInputs,
      note: form.note.trim(),
      spent_at: new Date(form.spentAt).toISOString(),
    };

    try {
      if (expense) await updateExpense(expense.id, row);
      else await addExpense({ ...row, created_by: session.memberId });
      await refresh();
      toast(expense ? '✓ Expense updated' : '✓ Expense added');
      router.push(expense ? '/expenses' : '/');
    } catch (err) {
      console.error('Error saving expense:', err);
      toast('Could not save — check your connection');
      setSaving(false);
    }
  };

  const equalShare = selected.length ? amountNum / selected.length : 0;

  return (
    <>
      <AppHeader title={expense ? '✏️ EDIT EXPENSE' : '➕ ADD EXPENSE'} back />

      <div className="page-content form-page">
        {/* Amount */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-amount">Amount</label>
          <div className="amount-input">
            <span className="amount-input__symbol">₹</span>
            <input
              type="number"
              className="amount-input__field mono"
              placeholder="0"
              value={form.amount}
              onChange={e => set({ amount: e.target.value })}
              autoFocus={!expense}
              id="input-amount"
              inputMode="decimal"
              min="0"
            />
          </div>
          <div className="chip-row">
            {QUICK_AMOUNTS.map(n => (
              <button key={n} className="pill" onClick={() => set({ amount: String((parseFloat(form.amount) || 0) + n) })}>
                +₹{n}
              </button>
            ))}
            {form.amount && <button className="pill" onClick={() => set({ amount: '' })}>Clear</button>}
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-description">Description</label>
          <input
            type="text"
            className="text-input"
            placeholder="Seafood dinner at Darjeeling Café"
            value={form.description}
            onChange={e => set({ description: e.target.value })}
            id="input-description"
          />
        </div>

        {/* Date */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-date">Date & Time</label>
          <input
            type="datetime-local"
            className="text-input mono"
            value={form.spentAt}
            onChange={e => set({ spentAt: e.target.value })}
            id="input-date"
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="category-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`category-chip ${form.category === cat.id ? 'category-chip--on' : ''}`}
                style={form.category === cat.id ? { background: cat.color } : undefined}
                onClick={() => set({ category: cat.id })}
                id={`cat-${cat.id}`}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paid By */}
        <div className="form-group">
          <div className="form-group__head">
            <label className="form-label">Paid By</label>
            <label className="switch">
              <input type="checkbox" checked={form.multiPayer} onChange={e => set({ multiPayer: e.target.checked })} />
              <span className="switch__box" />
              Paid by multiple people?
            </label>
          </div>

          {!form.multiPayer ? (
            <div className="payer-grid">
              {members.map(member => (
                <button
                  key={member.id}
                  className={`payer-chip ${paidBy === member.id ? 'payer-chip--on' : ''}`}
                  style={paidBy === member.id ? { background: member.color } : undefined}
                  onClick={() => set({ paidBy: member.id })}
                  id={`paidby-${member.handle}`}
                >
                  <MemberAvatar member={member} size="sm" />
                  <span>{firstName(member)}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="stack stack--tight">
                {members.map(member => (
                  <div key={member.id} className="split-row">
                    <MemberAvatar member={member} size="sm" />
                    <span className="split-row__name">{member.name}</span>
                    <div className="mini-input">
                      <span>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="mono"
                        placeholder="0"
                        value={form.payerInputs[member.id] ?? ''}
                        onChange={e => setPayerInput(member.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`tally ${payerResult.error ? 'tally--bad' : 'tally--ok'}`}>
                {payerResult.error || '✓ Payers cover the full bill'}
              </div>
            </>
          )}
        </div>

        {/* Split */}
        <div className="form-group">
          <div className="form-group__head">
            <label className="form-label">Split</label>
            <button className="link-btn" onClick={toggleAll} id="toggle-all-split">
              {selected.length === allIds.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="seg seg--full">
            {SPLIT_MODES.map(m => (
              <button
                key={m.id}
                className={`seg__btn ${form.splitMode === m.id ? 'seg__btn--on' : ''}`}
                onClick={() => set({ splitMode: m.id, splitInputs: m.id === form.splitMode ? form.splitInputs : {} })}
              >
                {m.label}
              </button>
            ))}
          </div>

          {form.splitMode === 'equal' && selected.length > 0 && amountNum > 0 && (
            <div className="tally tally--ok mono">{inr(equalShare, 2)} / person × {selected.length}</div>
          )}
          {form.splitMode === 'percent' && (
            <button className="link-btn" onClick={evenPercents} style={{ marginBottom: 8 }}>Split % evenly</button>
          )}

          <div className="stack stack--tight">
            {members.map(member => {
              const on = selected.includes(member.id);
              const share = splitResult.splits[member.id];
              return (
                <div key={member.id} className={`split-row ${on ? 'split-row--on' : ''}`}>
                  <button className="split-row__toggle" onClick={() => toggleMember(member.id)} aria-pressed={on} id={`split-${member.handle}`}>
                    <span className="checkbox">{on ? '✓' : ''}</span>
                    <MemberAvatar member={member} size="sm" />
                    <span className="split-row__name">{member.name}</span>
                  </button>

                  {on && form.splitMode === 'exact' && (
                    <div className="mini-input">
                      <span>₹</span>
                      <input type="number" inputMode="decimal" className="mono" placeholder="0"
                        value={form.splitInputs[member.id] ?? ''} onChange={e => setSplitInput(member.id, e.target.value)} />
                    </div>
                  )}
                  {on && form.splitMode === 'percent' && (
                    <div className="mini-input">
                      <input type="number" inputMode="decimal" className="mono" placeholder="0"
                        value={form.splitInputs[member.id] ?? ''} onChange={e => setSplitInput(member.id, e.target.value)} />
                      <span>%</span>
                    </div>
                  )}
                  {on && form.splitMode === 'shares' && (
                    <div className="stepper">
                      <button onClick={() => setSplitInput(member.id, String(Math.max(0, (parseFloat(form.splitInputs[member.id] ?? 1) || 0) - 1)))}>−</button>
                      <span className="mono">{form.splitInputs[member.id] ?? 1}×</span>
                      <button onClick={() => setSplitInput(member.id, String((parseFloat(form.splitInputs[member.id] ?? 1) || 0) + 1))}>+</button>
                    </div>
                  )}
                  {on && share !== undefined && form.splitMode !== 'exact' && (
                    <span className="split-row__share mono">{inr(share, 2)}</span>
                  )}
                </div>
              );
            })}
          </div>

          {form.splitMode !== 'equal' && amountNum > 0 && (
            <div className={`tally ${splitResult.error ? 'tally--bad' : 'tally--ok'} mono`}>
              {splitResult.error || (form.splitMode === 'exact' ? '✓ ₹0 left to assign' : form.splitMode === 'percent' ? '✓ 100% assigned' : '✓ Shares balanced')}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="form-group">
          <label className="form-label" htmlFor="input-note">Notes (optional)</label>
          <textarea
            className="text-input"
            placeholder="Any extra details…"
            value={form.note}
            onChange={e => set({ note: e.target.value })}
            id="input-note"
            rows={2}
          />
        </div>

        {attempted && errors.length > 0 && <div className="form-error">{errors[0]}</div>}

        <button className="btn btn--primary btn--block btn--lg" onClick={handleSubmit} disabled={saving} id="submit-expense">
          {saving ? 'Saving…' : expense ? '✓ Save Changes' : '✓ Save Expense'}
        </button>
      </div>
    </>
  );
}
