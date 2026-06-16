'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MemberAvatar from '@/components/MemberAvatar';
import { MEMBERS, getExpenses, getSettlements } from '@/lib/supabase';
import { getMemberStats } from '@/lib/algorithm';
import { getCategoryById } from '@/lib/categories';

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id;
  const member = MEMBERS.find(m => m.id === memberId);

  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (!member) {
    return (
      <div className="app-container">
        <div className="page-content">
          <div className="glass-card empty-state">
            <div className="empty-state__icon">❓</div>
            <div className="empty-state__title">Member not found</div>
            <Link href="/"><button className="btn-primary" style={{ maxWidth: 200, margin: '16px auto 0' }}>Go Home</button></Link>
          </div>
        </div>
        <Navbar />
      </div>
    );
  }

  const allStats = getMemberStats(expenses, settlements);
  const stats = allStats[member.id];
  const memberExpenses = expenses.filter(e => e.paid_by === member.id);
  const memberSplitExpenses = expenses.filter(e => (e.split_among || []).includes(member.id));
  const memberSettlements = settlements.filter(s => s.paid_by === member.id || s.paid_to === member.id);

  const balance = stats?.netBalance || 0;
  const balanceClass = balance > 0.01 ? 'positive' : balance < -0.01 ? 'negative' : 'zero';

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__inner">
          <button className="form-page__back" onClick={() => router.back()}>←</button>
          <span className="app-header__title">{member.name.split(' ')[0]}&apos;s Profile</span>
          <div style={{ width: 36 }} />
        </div>
      </header>

      <div className="page-content">
        {loading ? (
          <div className="loading-spinner" />
        ) : (
          <>
            {/* Profile Hero */}
            <div className="glass-card profile-hero animate-in">
              <MemberAvatar member={member} size="xl" />
              <h1 className="profile-hero__name">{member.name}</h1>
              <p className="profile-hero__username">@{member.username}</p>
            </div>

            {/* Stats */}
            <div className="profile-stats animate-in animate-in--delay-1">
              <div className="glass-card profile-stat">
                <div className="profile-stat__value" style={{ color: 'var(--accent-primary)' }}>
                  ₹{(stats?.totalPaid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="profile-stat__label">Total Paid</div>
              </div>
              <div className="glass-card profile-stat">
                <div className="profile-stat__value">
                  ₹{(stats?.totalShare || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="profile-stat__label">Total Share</div>
              </div>
              <div className="glass-card profile-stat">
                <div className={`profile-stat__value`} style={{ color: balance > 0.01 ? 'var(--positive)' : balance < -0.01 ? 'var(--negative)' : 'var(--text-secondary)' }}>
                  {balance > 0.01 ? '+' : ''}₹{Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="profile-stat__label">
                  {balance > 0.01 ? 'Gets Back' : balance < -0.01 ? 'Owes' : 'Settled'}
                </div>
              </div>
            </div>

            {/* Expenses they paid */}
            <h3 className="section-title animate-in animate-in--delay-2">
              💳 Paid by {member.name.split(' ')[0]} ({memberExpenses.length})
            </h3>
            {memberExpenses.length > 0 ? (
              <div className="member-cards" style={{ marginBottom: 28 }}>
                {memberExpenses.map((expense, i) => {
                  const category = getCategoryById(expense.category);
                  return (
                    <div key={expense.id} className={`glass-card expense-card animate-in animate-in--delay-${Math.min(i + 1, 5)}`}>
                      <div className="expense-card__icon" style={{ background: `${category.color}20`, color: category.color }}>
                        {category.icon}
                      </div>
                      <div className="expense-card__info">
                        <div className="expense-card__desc">{expense.description || category.label}</div>
                        <div className="expense-card__meta">
                          <span>{new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          <span>·</span>
                          <span>÷ {expense.split_among?.length || 0}</span>
                        </div>
                      </div>
                      <div className="expense-card__amount">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card glass-card--no-hover empty-state" style={{ marginBottom: 28, padding: '24px 16px' }}>
                <div className="empty-state__desc">No expenses paid by {member.name.split(' ')[0]} yet</div>
              </div>
            )}

            {/* Settlements */}
            {memberSettlements.length > 0 && (
              <>
                <h3 className="section-title animate-in">✅ Settlements</h3>
                <div className="glass-card glass-card--no-hover animate-in" style={{ marginBottom: 28 }}>
                  {memberSettlements.map((s, i) => {
                    const other = s.paid_by === member.id
                      ? MEMBERS.find(m => m.id === s.paid_to)
                      : MEMBERS.find(m => m.id === s.paid_by);
                    const isPayer = s.paid_by === member.id;

                    return (
                      <div key={s.id || i} className="settlement-item">
                        <div className="settlement-item__icon">{isPayer ? '💸' : '💰'}</div>
                        <div className="settlement-item__info">
                          <div className="settlement-item__text">
                            {isPayer ? `Paid to ${other?.name.split(' ')[0]}` : `Received from ${other?.name.split(' ')[0]}`}
                          </div>
                          <div className="settlement-item__date">
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <div className="settlement-item__amount" style={{ color: isPayer ? 'var(--negative)' : 'var(--positive)' }}>
                          {isPayer ? '-' : '+'}₹{parseFloat(s.amount).toLocaleString('en-IN')}
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

      <Navbar />
    </div>
  );
}
