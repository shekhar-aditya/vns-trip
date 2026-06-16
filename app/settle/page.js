'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MemberAvatar from '@/components/MemberAvatar';
import { MEMBERS, getExpenses, getSettlements, addSettlement, getCurrentUser } from '@/lib/supabase';
import { simplifyDebts } from '@/lib/algorithm';

export default function SettlePage() {
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSettleModal, setShowSettleModal] = useState(null);
  const [settleNote, setSettleNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exp, set] = await Promise.all([getExpenses(), getSettlements()]);
      setExpenses(exp);
      setSettlements(set);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const debts = simplifyDebts(expenses, settlements);

  const handleSettle = async (debt) => {
    setSaving(true);
    try {
      await addSettlement({
        paid_by: debt.from.id,
        paid_to: debt.to.id,
        amount: debt.amount,
        note: settleNote || `Settlement from ${debt.from.name.split(' ')[0]} to ${debt.to.name.split(' ')[0]}`,
      });
      await loadData();
      setShowSettleModal(null);
      setSettleNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__title">💰 Settlements</span>
        </div>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="loading-spinner" />
        ) : (
          <>
            {/* Pending Settlements */}
            <h3 className="section-title animate-in">Who Owes Whom</h3>

            {debts.length > 0 ? (
              <div className="member-cards" style={{ marginBottom: 32 }}>
                {debts.map((debt, i) => (
                  <div key={i} className={`glass-card settle-card animate-in animate-in--delay-${Math.min(i + 1, 5)}`}>
                    <div className="settle-card__row">
                      <MemberAvatar member={debt.from} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{debt.from.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>pays</div>
                      </div>
                      <span className="settle-card__arrow">→</span>
                      <MemberAvatar member={debt.to} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{debt.to.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>receives</div>
                      </div>
                      <span className="settle-card__amount">₹{debt.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <button
                      className="settle-card__action"
                      onClick={() => setShowSettleModal(debt)}
                      id={`settle-${debt.from.username}-${debt.to.username}`}
                    >
                      ✓ Mark as Settled
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card glass-card--no-hover empty-state animate-in" style={{ marginBottom: 32 }}>
                <div className="empty-state__icon">🎉</div>
                <div className="empty-state__title">All Settled Up!</div>
                <div className="empty-state__desc">
                  {expenses.length === 0
                    ? 'No expenses added yet. Add some to see who owes whom!'
                    : 'Everyone is even. No pending settlements!'}
                </div>
              </div>
            )}

            {/* Settlement History */}
            {settlements.length > 0 && (
              <>
                <h3 className="section-title animate-in">✅ Settlement History</h3>
                <div className="glass-card glass-card--no-hover animate-in">
                  {settlements.map((s, i) => {
                    const payer = MEMBERS.find(m => m.id === s.paid_by);
                    const receiver = MEMBERS.find(m => m.id === s.paid_to);
                    return (
                      <div key={s.id || i} className="settlement-item">
                        <div className="settlement-item__icon">✅</div>
                        <div className="settlement-item__info">
                          <div className="settlement-item__text">
                            {payer?.name.split(' ')[0] || '?'} paid {receiver?.name.split(' ')[0] || '?'}
                          </div>
                          <div className="settlement-item__date">
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {s.note && ` · ${s.note}`}
                          </div>
                        </div>
                        <div className="settlement-item__amount">
                          ₹{parseFloat(s.amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Settle Confirmation Modal */}
      {showSettleModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSettleModal(null); }}>
          <div className="modal">
            <h2 className="modal__title" style={{ fontSize: '1.2rem' }}>Confirm Settlement</h2>
            <p className="modal__subtitle">
              {showSettleModal.from.name} pays ₹{showSettleModal.amount.toLocaleString('en-IN')} to {showSettleModal.to.name}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '20px 0' }}>
              <MemberAvatar member={showSettleModal.from} size="lg" />
              <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>→</div>
              <MemberAvatar member={showSettleModal.to} size="lg" />
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                ₹{showSettleModal.amount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="form-group">
              <input
                type="text"
                className="text-input"
                placeholder="Add a note (optional)"
                value={settleNote}
                onChange={e => setSettleNote(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              onClick={() => handleSettle(showSettleModal)}
              disabled={saving}
            >
              {saving ? 'Processing...' : '✓ Confirm Settlement'}
            </button>

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: 10, textAlign: 'center' }}
              onClick={() => setShowSettleModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
