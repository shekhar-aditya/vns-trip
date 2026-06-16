'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import UserSelector from '@/components/UserSelector';
import MemberAvatar from '@/components/MemberAvatar';
import { MEMBERS, getCurrentUser, getExpenses, getSettlements } from '@/lib/supabase';
import { getMemberStats, getTotalSpent, simplifyDebts } from '@/lib/algorithm';
import { getCategoryById } from '@/lib/categories';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    } else {
      setShowUserSelector(true);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exp, set] = await Promise.all([getExpenses(), getSettlements()]);
      setExpenses(exp);
      setSettlements(set);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (member) => {
    setCurrentUser(member);
    setShowUserSelector(false);
  };

  const totalSpent = getTotalSpent(expenses);
  const stats = getMemberStats(expenses, settlements);
  const debts = simplifyDebts(expenses, settlements);
  const recentExpenses = expenses.slice(0, 5);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-container">
      {showUserSelector && <UserSelector onSelect={handleUserSelect} />}

      {/* Header */}
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__title">🚂 Varanasi Trip</span>
          {currentUser && (
            <button
              className="app-header__user"
              onClick={() => setShowUserSelector(true)}
              id="header-user-switch"
            >
              <MemberAvatar member={currentUser} size="xs" />
              <span className="app-header__user-name">{currentUser.name.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </header>

      <div className="page-content">
        {/* Hero / Total Spent */}
        <div className="hero animate-in">
          <div className="hero__label">Total Trip Expense</div>
          <div className="hero__trip-name">Varanasi 2026 🕉️</div>
          <div className="hero__amount">₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="hero__amount-label">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {MEMBERS.length} travelers</div>
        </div>

        {/* Member Balances */}
        <h3 className="section-title animate-in animate-in--delay-1">👥 Everyone&apos;s Balance</h3>
        <div className="member-cards">
          {MEMBERS.map((member, i) => {
            const memberStats = stats[member.id];
            const balance = memberStats?.netBalance || 0;
            const balanceClass = balance > 0.01 ? 'positive' : balance < -0.01 ? 'negative' : 'zero';

            return (
              <Link href={`/member/${member.id}`} key={member.id}>
                <div className={`glass-card member-card animate-in animate-in--delay-${i + 1}`}>
                  <MemberAvatar member={member} size="md" />
                  <div className="member-card__info">
                    <div className="member-card__name">{member.name}</div>
                    <div className="member-card__paid">
                      Paid ₹{(memberStats?.totalPaid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className={`member-card__balance member-card__balance--${balanceClass}`}>
                      {balance > 0.01 ? '+' : ''}₹{Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="member-card__balance-label">
                      {balance > 0.01 ? 'gets back' : balance < -0.01 ? 'owes' : 'settled'}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Settle Summary */}
        {debts.length > 0 && (
          <>
            <h3 className="section-title animate-in">💸 Quick Settle</h3>
            <div className="member-cards" style={{ marginBottom: 28 }}>
              {debts.slice(0, 3).map((debt, i) => (
                <div key={i} className={`glass-card settle-card animate-in animate-in--delay-${i + 1}`}>
                  <div className="settle-card__row">
                    <MemberAvatar member={debt.from} size="sm" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{debt.from.name.split(' ')[0]}</span>
                    <span className="settle-card__arrow">→</span>
                    <MemberAvatar member={debt.to} size="sm" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{debt.to.name.split(' ')[0]}</span>
                    <span className="settle-card__amount">₹{debt.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
              {debts.length > 3 && (
                <Link href="/settle">
                  <div className="btn-secondary" style={{ textAlign: 'center' }}>
                    View all {debts.length} settlements →
                  </div>
                </Link>
              )}
            </div>
          </>
        )}

        {/* Recent Expenses */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>📝 Recent Expenses</h3>
          {expenses.length > 5 && (
            <Link href="/expenses" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
              View all →
            </Link>
          )}
        </div>

        {recentExpenses.length > 0 ? (
          <div className="member-cards">
            {recentExpenses.map((expense, i) => {
              const category = getCategoryById(expense.category);
              const payer = MEMBERS.find(m => m.id === expense.paid_by);
              const splitCount = expense.split_among?.length || 0;

              return (
                <div key={expense.id} className={`glass-card expense-card animate-in animate-in--delay-${Math.min(i + 1, 5)}`}>
                  <div className="expense-card__icon" style={{ background: `${category.color}20`, color: category.color }}>
                    {category.icon}
                  </div>
                  <div className="expense-card__info">
                    <div className="expense-card__desc">{expense.description || category.label}</div>
                    <div className="expense-card__meta">
                      {payer && <MemberAvatar member={payer} size="xs" />}
                      <span>{payer?.name.split(' ')[0]} paid</span>
                      <span>·</span>
                      <span>{new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  <div>
                    <div className="expense-card__amount">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                    <div className="expense-card__split-info">÷ {splitCount}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card glass-card--no-hover empty-state animate-in">
            <div className="empty-state__icon">🧳</div>
            <div className="empty-state__title">No expenses yet</div>
            <div className="empty-state__desc">Start by adding your first expense for the trip!</div>
            <Link href="/add">
              <button className="btn-primary" style={{ maxWidth: 220, margin: '20px auto 0' }}>
                + Add Expense
              </button>
            </Link>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
