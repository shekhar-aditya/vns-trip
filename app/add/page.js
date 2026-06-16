'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MemberAvatar from '@/components/MemberAvatar';
import { MEMBERS, getCurrentUser, addExpense } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/categories';

export default function AddExpensePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState('');
  const [splitAmong, setSplitAmong] = useState(MEMBERS.map(m => m.id));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setPaidBy(user.id);
    }
  }, []);

  const toggleSplit = (memberId) => {
    setSplitAmong(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleAll = () => {
    if (splitAmong.length === MEMBERS.length) {
      setSplitAmong(paidBy ? [paidBy] : []);
    } else {
      setSplitAmong(MEMBERS.map(m => m.id));
    }
  };

  const splitAmount = splitAmong.length > 0 ? parseFloat(amount || 0) / splitAmong.length : 0;

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0 || !paidBy || splitAmong.length === 0) return;

    setSaving(true);
    try {
      await addExpense({
        amount: parseFloat(amount),
        description: description || CATEGORIES.find(c => c.id === category)?.label || 'Expense',
        category,
        paid_by: paidBy,
        split_among: splitAmong,
        note,
        created_by: currentUser?.id || paidBy,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/');
      }, 1200);
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const isValid = amount && parseFloat(amount) > 0 && paidBy && splitAmong.length > 0;

  return (
    <div className="app-container">
      <div className="page-content form-page">
        {/* Header */}
        <div className="form-page__header animate-in">
          <button className="form-page__back" onClick={() => router.back()} id="add-expense-back">
            ←
          </button>
          <h1 className="form-page__title">Add Expense</h1>
        </div>

        {/* Amount */}
        <div className="form-group animate-in animate-in--delay-1">
          <label className="form-label">Amount</label>
          <div className="amount-input-wrapper">
            <span className="amount-input-wrapper__symbol">₹</span>
            <input
              type="number"
              className="amount-input-wrapper__input"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
              id="input-amount"
              inputMode="decimal"
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-group animate-in animate-in--delay-2">
          <label className="form-label">Description</label>
          <input
            type="text"
            className="text-input"
            placeholder="What was this for?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            id="input-description"
          />
        </div>

        {/* Category */}
        <div className="form-group animate-in animate-in--delay-2">
          <label className="form-label">Category</label>
          <div className="category-picker">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`category-chip ${category === cat.id ? 'category-chip--selected' : ''}`}
                style={category === cat.id ? { color: cat.color, borderColor: cat.color, background: `${cat.color}15` } : {}}
                onClick={() => setCategory(cat.id)}
                id={`cat-${cat.id}`}
              >
                <span className="category-chip__icon">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paid By */}
        <div className="form-group animate-in animate-in--delay-3">
          <label className="form-label">Paid By</label>
          <div className="paid-by-selector">
            {MEMBERS.map(member => (
              <button
                key={member.id}
                className={`paid-by-chip ${paidBy === member.id ? 'paid-by-chip--selected' : ''}`}
                onClick={() => setPaidBy(member.id)}
                id={`paidby-${member.username}`}
              >
                <MemberAvatar member={member} size="sm" />
                <span className="paid-by-chip__name">{member.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split Among */}
        <div className="form-group animate-in animate-in--delay-4">
          <div className="split-selector__header">
            <label className="form-label" style={{ marginBottom: 0 }}>Split Among</label>
            <button className="split-selector__toggle-all" onClick={toggleAll} id="toggle-all-split">
              {splitAmong.length === MEMBERS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="split-selector">
            {MEMBERS.map(member => {
              const isSelected = splitAmong.includes(member.id);
              return (
                <button
                  key={member.id}
                  className={`split-chip ${isSelected ? 'split-chip--selected' : ''}`}
                  onClick={() => toggleSplit(member.id)}
                  id={`split-${member.username}`}
                >
                  <div className="split-chip__check">
                    {isSelected && '✓'}
                  </div>
                  <MemberAvatar member={member} size="sm" />
                  <span className="split-chip__name">{member.name}</span>
                  {isSelected && amount && (
                    <span className="split-chip__amount">
                      ₹{splitAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div className="form-group animate-in animate-in--delay-5">
          <label className="form-label">Note (Optional)</label>
          <textarea
            className="text-input"
            placeholder="Any extra details..."
            value={note}
            onChange={e => setNote(e.target.value)}
            id="input-note"
            rows={2}
          />
        </div>

        {/* Submit */}
        <button
          className="btn-primary animate-in animate-in--delay-5"
          onClick={handleSubmit}
          disabled={!isValid || saving}
          id="submit-expense"
        >
          {saving ? 'Saving...' : '✓  Save Expense'}
        </button>

        <div style={{ height: 30 }} />
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-content__icon">✅</div>
            <div className="success-content__text">Expense Added!</div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
