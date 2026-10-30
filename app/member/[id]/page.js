'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MemberAvatar from '@/components/MemberAvatar';
import IdTag from '@/components/IdTag';
import BalanceStamp from '@/components/BalanceStamp';
import ExpenseRow from '@/components/ExpenseRow';
import ReceiptModal from '@/components/ReceiptModal';
import { useTrip } from '@/components/TripProvider';
import { getMemberStats } from '@/lib/algorithm';
import { isInvolved } from '@/lib/split';
import { canEditProfile } from '@/lib/permissions';
import { dateTime, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

export default function MemberProfilePage() {
  const { id } = useParams();
  const memberId = decodeURIComponent(id);
  const { members, membersById, expenses, settlements, loading, session, openMember, openProfile } = useTrip();
  const [receiptId, setReceiptId] = useState(null);
  const member = membersById[memberId];

  if (!member) {
    return (
      <>
        <AppHeader title="MEMBER" back />
        <div className="page-content">
          <div className="card empty-state">
            <div className="empty-state__icon">❓</div>
            <div className="empty-state__title">Member not found</div>
            <Link href="/" className="btn btn--primary" style={{ marginTop: 16 }}>Go Home</Link>
          </div>
        </div>
      </>
    );
  }

  const stats = getMemberStats(members, expenses, settlements)[member.id];
  const involved = expenses.filter(e => isInvolved(e, member.id));
  const memberSettlements = settlements.filter(s => s.paid_by === member.id || s.paid_to === member.id);
  const receipt = expenses.find(e => e.id === receiptId);

  return (
    <>
      <AppHeader title={`${firstName(member).toUpperCase()}'S LEDGER`} back />

      <div className="page-content">
        <div className="member-card-hero" style={{ background: member.color }}>
          <MemberAvatar member={member} size="xl" />
          <div className="member-card-hero__name">{member.name}</div>
          <div className="member-card-hero__meta"><IdTag id={member.id} className="id-tag--light" /> <span className="mono">@{member.handle}</span></div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn btn--ink btn--sm" onClick={() => openMember(member.id)}>🔳 QR / UPI</button>
            {canEditProfile(session, member.id) && (
              <button className="btn btn--ghost btn--sm" onClick={() => openProfile(member.id)}>✏️ Edit</button>
            )}
          </div>
        </div>

        <div className="stat-trio">
          <div className="stat-box"><div className="stat-box__value mono">{inr(stats.totalPaid)}</div><div className="stat-box__label">Paid</div></div>
          <div className="stat-box"><div className="stat-box__value mono">{inr(stats.totalShare)}</div><div className="stat-box__label">Share</div></div>
          <div className="stat-box"><BalanceStamp amount={stats.netBalance} /></div>
        </div>

        <section className="section">
          <h3 className="section-title">🧾 Involved In ({involved.length})</h3>
          {loading ? (
            <div className="loading-block">LOADING…</div>
          ) : involved.length ? (
            <div className="stack">
              {involved.map(e => <ExpenseRow key={e.id} expense={e} onClick={() => setReceiptId(e.id)} highlightId={member.id} />)}
            </div>
          ) : (
            <div className="card empty-state"><div className="empty-state__desc">No expenses involving {firstName(member)} yet.</div></div>
          )}
        </section>

        {memberSettlements.length > 0 && (
          <section className="section">
            <h3 className="section-title">✅ Settlements</h3>
            <div className="card history">
              {memberSettlements.map(s => {
                const isPayer = s.paid_by === member.id;
                const other = membersById[isPayer ? s.paid_to : s.paid_by];
                return (
                  <div key={s.id} className="history__item">
                    <div className="history__avatars"><MemberAvatar member={other} size="xs" /></div>
                    <div className="history__info">
                      <div className="history__text">{isPayer ? `Paid ${firstName(other)}` : `Received from ${firstName(other)}`}</div>
                      <div className="history__date mono">{dateTime(s.created_at)}</div>
                    </div>
                    <div className={`history__amount mono ${isPayer ? 'neg' : 'pos'}`}>{isPayer ? '−' : '+'}{inr(s.amount, 2)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {receipt && <ReceiptModal expense={receipt} onClose={() => setReceiptId(null)} />}
    </>
  );
}
