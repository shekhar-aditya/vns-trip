'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MemberAvatar from '@/components/MemberAvatar';
import { MEMBERS, getExpenses, deleteExpense, getCurrentUser } from '@/lib/supabase';
import { getCategoryById, CATEGORIES } from '@/lib/categories';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      setSelectedExpense(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = expenses.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false;
    if (memberFilter !== 'all' && e.paid_by !== memberFilter) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__title">📋 All Expenses</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {filtered.length} items · ₹{totalFiltered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </header>

      <div className="page-content">
        {/* Category Filter */}
        <div className="filter-bar animate-in">
          <button
            className={`filter-chip ${filter === 'all' ? 'filter-chip--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`filter-chip ${filter === cat.id ? 'filter-chip--active' : ''}`}
              onClick={() => setFilter(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Member Filter */}
        <div className="filter-bar animate-in animate-in--delay-1">
          <button
            className={`filter-chip ${memberFilter === 'all' ? 'filter-chip--active' : ''}`}
            onClick={() => setMemberFilter('all')}
          >
            👥 Everyone
          </button>
          {MEMBERS.map(member => (
            <button
              key={member.id}
              className={`filter-chip ${memberFilter === member.id ? 'filter-chip--active' : ''}`}
              onClick={() => setMemberFilter(member.id)}
              style={memberFilter === member.id ? { borderColor: member.color, color: member.color } : {}}
            >
              {member.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Expense List */}
        {loading ? (
          <div className="loading-spinner" />
        ) : filtered.length > 0 ? (
          <div className="member-cards">
            {filtered.map((expense, i) => {
              const category = getCategoryById(expense.category);
              const payer = MEMBERS.find(m => m.id === expense.paid_by);
              const splitCount = expense.split_among?.length || 0;

              return (
                <div
                  key={expense.id}
                  className={`glass-card expense-card animate-in animate-in--delay-${Math.min(i + 1, 5)}`}
                  onClick={() => setSelectedExpense(expense)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="expense-card__icon" style={{ background: `${category.color}20`, color: category.color }}>
                    {category.icon}
                  </div>
                  <div className="expense-card__info">
                    <div className="expense-card__desc">{expense.description || category.label}</div>
                    <div className="expense-card__meta">
                      {payer && <MemberAvatar member={payer} size="xs" />}
                      <span>{payer?.name.split(' ')[0]}</span>
                      <span>·</span>
                      <span>{new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div>
                    <div className="expense-card__amount">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                    <div className="expense-card__split-info">÷ {splitCount} people</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card glass-card--no-hover empty-state">
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__title">No expenses found</div>
            <div className="empty-state__desc">Try changing your filters or add a new expense</div>
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="expense-detail-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedExpense(null); }}>
          <div className="expense-detail">
            <div className="expense-detail__header">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Expense Details</span>
              <button className="expense-detail__close" onClick={() => setSelectedExpense(null)}>✕</button>
            </div>

            <div className="expense-detail__amount">
              ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}
            </div>
            <div className="expense-detail__desc">
              {selectedExpense.description || getCategoryById(selectedExpense.category).label}
            </div>

            <div className="expense-detail__row">
              <span className="expense-detail__row-label">Category</span>
              <span className="expense-detail__row-value">
                {getCategoryById(selectedExpense.category).icon} {getCategoryById(selectedExpense.category).label}
              </span>
            </div>

            <div className="expense-detail__row">
              <span className="expense-detail__row-label">Paid by</span>
              <span className="expense-detail__row-value">
                {(() => { const p = MEMBERS.find(m => m.id === selectedExpense.paid_by); return p ? <><MemberAvatar member={p} size="xs" /> {p.name}</> : 'Unknown'; })()}
              </span>
            </div>

            <div className="expense-detail__row">
              <span className="expense-detail__row-label">Date</span>
              <span className="expense-detail__row-value">
                {new Date(selectedExpense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {selectedExpense.note && (
              <div className="expense-detail__row">
                <span className="expense-detail__row-label">Note</span>
                <span className="expense-detail__row-value">{selectedExpense.note}</span>
              </div>
            )}

            {/* Split breakdown */}
            <div className="expense-detail__split-list">
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Split between {selectedExpense.split_among?.length || 0} people
              </div>
              {(selectedExpense.split_among || []).map(memberId => {
                const member = MEMBERS.find(m => m.id === memberId);
                if (!member) return null;
                const share = parseFloat(selectedExpense.amount) / (selectedExpense.split_among?.length || 1);
                return (
                  <div key={memberId} className="expense-detail__split-item">
                    <MemberAvatar member={member} size="sm" />
                    <span className="expense-detail__split-name">{member.name}</span>
                    <span className="expense-detail__split-amount">₹{share.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>

            {/* Added by info */}
            {selectedExpense.created_by && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 16 }}>
                Added by {MEMBERS.find(m => m.id === selectedExpense.created_by)?.name || 'Unknown'}
              </div>
            )}

            <button
              className="expense-detail__delete"
              onClick={() => handleDelete(selectedExpense.id)}
              id="delete-expense"
            >
              🗑️ Delete Expense
            </button>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
