'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MemberAvatar from '@/components/MemberAvatar';
import IdTag from '@/components/IdTag';
import BalanceStamp from '@/components/BalanceStamp';
import ExpenseRow from '@/components/ExpenseRow';
import ReceiptModal from '@/components/ReceiptModal';
import { useTrip } from '@/components/TripProvider';
import { getMemberStats, getTotalSpent, pairwiseDebts } from '@/lib/algorithm';
import { isInvolved } from '@/lib/split';
import { SPOTS } from '@/lib/spots';
import { inr } from '@/lib/format';
import { firstName } from '@/lib/members';

export default function HomePage() {
  const { members, expenses, settlements, spotChecks, loading, loadError, session, openMember, openPayment } = useTrip();
  const [view, setView] = useState('group');
  const [receipt, setReceipt] = useState(null);

  const totalSpent = getTotalSpent(expenses);
  const stats = getMemberStats(members, expenses, settlements);
  const debts = pairwiseDebts(members, expenses, settlements);
  const recentExpenses = expenses.slice(0, 5);
  const me = session ? stats[session.memberId] : null;
  const myCount = session ? expenses.filter(e => isInvolved(e, session.memberId)).length : 0;
  const myDebts = session ? debts.filter(d => d.from.id === session.memberId || d.to.id === session.memberId) : [];
  const spotsDone = SPOTS.filter(s => spotChecks[s.id]?.checked).length;

  return (
    <>
      <AppHeader title="🌊 VARKALA TRIP '26" />

      <div className="page-content">
        {loadError && <div className="card card--coral banner">⚠ {loadError}</div>}

        {/* Hero billboard */}
        <section className="billboard">
          <div className="billboard__top">
            <span className="billboard__tag">CLIFF & SURF · KERALA</span>
            <div className="seg seg--sm">
              <button className={`seg__btn ${view === 'group' ? 'seg__btn--on' : ''}`} onClick={() => setView('group')}>Group Total</button>
              <button className={`seg__btn ${view === 'me' ? 'seg__btn--on' : ''}`} onClick={() => setView('me')} disabled={!me}>My Share</button>
            </div>
          </div>

          {view === 'group' || !me ? (
            <>
              <div className="billboard__label">TOTAL GROUP SPEND</div>
              <div className="billboard__amount mono">{loading ? '…' : inr(totalSpent)}</div>
              <div className="billboard__grid">
                <div><span className="mono">{expenses.length}</span><small>TRANSACTIONS</small></div>
                <div><span className="mono">{members.length}</span><small>CREW</small></div>
                <div><span className="mono">{inr(totalSpent / members.length)}</span><small>₹ / PERSON</small></div>
              </div>
            </>
          ) : (
            <>
              <div className="billboard__label">MY SHARE OF THE TRIP</div>
              <div className="billboard__amount mono">{inr(me.totalShare)}</div>
              <div className="billboard__grid">
                <div><span className="mono">{inr(me.totalPaid)}</span><small>I PAID</small></div>
                <div><span className="mono">{myCount}</span><small>INVOLVED IN</small></div>
                <div><BalanceStamp amount={me.netBalance} size="sm" /></div>
              </div>
            </>
          )}
        </section>

        {/* My pending transfers */}
        {myDebts.length > 0 && (
          <section className="section">
            <h3 className="section-title">⚡ Your Pending Transfers</h3>
            <div className="stack">
              {myDebts.map(d => (
                <TransferMini key={`${d.from.id}-${d.to.id}`} debt={d} onPay={() => openPayment(d)} />
              ))}
            </div>
          </section>
        )}

        {/* Balance ledger */}
        <section className="section">
          <h3 className="section-title">👥 Everyone&apos;s Balance</h3>
          <div className="stack">
            {members.map(member => {
              const s = stats[member.id];
              return (
                <button key={member.id} className="card ledger-row" onClick={() => openMember(member.id)}>
                  <MemberAvatar member={member} size="md" />
                  <div className="ledger-row__info">
                    <div className="ledger-row__name">
                      {member.name}
                      {member.id === session?.memberId && <span className="you-tag">YOU</span>}
                    </div>
                    <div className="ledger-row__meta">
                      <IdTag id={member.id} />
                      <span className="mono">paid {inr(s.totalPaid)}</span>
                    </div>
                  </div>
                  <BalanceStamp amount={s.netBalance} size="sm" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick settle */}
        {debts.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h3 className="section-title">💸 Quick Settle</h3>
              <Link href="/settle" className="link-arrow">All {debts.length} →</Link>
            </div>
            <div className="stack">
              {debts.slice(0, 3).map(d => (
                <TransferMini key={`${d.from.id}-${d.to.id}`} debt={d} onPay={() => openPayment(d)} />
              ))}
            </div>
          </section>
        )}

        {/* Spots teaser */}
        <Link href="/spots" className="card card--cyan spots-teaser">
          <span className="spots-teaser__icon">🗺️</span>
          <div>
            <div className="spots-teaser__title">VARKALA SPOT CHECKLIST</div>
            <div className="mono">{spotsDone}/{SPOTS.length} spots ticked off</div>
          </div>
          <span className="spots-teaser__go">→</span>
        </Link>

        {/* Recent expenses */}
        <section className="section">
          <div className="section-head">
            <h3 className="section-title">📝 Recent Expenses</h3>
            {expenses.length > 5 && <Link href="/expenses" className="link-arrow">View all →</Link>}
          </div>

          {loading ? (
            <div className="loading-block">LOADING…</div>
          ) : recentExpenses.length > 0 ? (
            <div className="stack">
              {recentExpenses.map(e => (
                <ExpenseRow key={e.id} expense={e} onClick={() => setReceipt(e)} highlightId={session?.memberId} />
              ))}
            </div>
          ) : (
            <div className="card empty-state">
              <div className="empty-state__icon">🏖️</div>
              <div className="empty-state__title">No expenses yet</div>
              <div className="empty-state__desc">Log the first chai on the cliff!</div>
              <Link href="/add" className="btn btn--primary" style={{ marginTop: 16 }}>+ Add Expense</Link>
            </div>
          )}
        </section>
      </div>

      {receipt && <ReceiptModal expense={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

function TransferMini({ debt, onPay }) {
  return (
    <div className="card transfer-mini">
      <MemberAvatar member={debt.from} size="sm" />
      <span className="transfer-mini__name">{firstName(debt.from)}</span>
      <span className="transfer-mini__arrow">➔</span>
      <MemberAvatar member={debt.to} size="sm" />
      <span className="transfer-mini__name">{firstName(debt.to)}</span>
      <span className="transfer-mini__amount mono">{inr(debt.amount)}</span>
      <button className="btn btn--primary btn--sm" onClick={onPay} aria-label={`Pay ${debt.to.name}`}>📲</button>
    </div>
  );
}
