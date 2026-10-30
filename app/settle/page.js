'use client';

import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import MemberAvatar from '@/components/MemberAvatar';
import IdTag from '@/components/IdTag';
import { useTrip } from '@/components/TripProvider';
import { addSettlement, deleteSettlement } from '@/lib/store';
import { simplifyDebts, getTotalSpent } from '@/lib/algorithm';
import { canRecordSettlement } from '@/lib/permissions';
import { copyText, dateTime, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

export default function SettlePage() {
  const { members, membersById, expenses, settlements, loading, session, refresh, toast, openPayment } = useTrip();
  const [busyKey, setBusyKey] = useState(null);

  const debts = simplifyDebts(members, expenses, settlements);

  const quickSettle = async debt => {
    if (!confirm(`Record that ${debt.from.name} paid ${debt.to.name} ${inr(debt.amount, 2)}?`)) return;
    const key = `${debt.from.id}-${debt.to.id}`;
    setBusyKey(key);
    try {
      await addSettlement({
        paid_by: debt.from.id,
        paid_to: debt.to.id,
        amount: debt.amount,
        note: `${firstName(debt.from)} → ${firstName(debt.to)}`,
        created_by: session.memberId,
      });
      await refresh();
      toast(`✓ ${inr(debt.amount, 2)} marked settled`);
    } catch (err) {
      console.error(err);
      toast('Could not record settlement');
    } finally {
      setBusyKey(null);
    }
  };

  const undo = async s => {
    if (!confirm(`Undo ${membersById[s.paid_by]?.name} → ${membersById[s.paid_to]?.name} ${inr(s.amount, 2)}?`)) return;
    setBusyKey(s.id);
    try {
      await deleteSettlement(s.id);
      await refresh();
      toast('↶ Settlement undone');
    } catch (err) {
      console.error(err);
      toast('Could not undo');
    } finally {
      setBusyKey(null);
    }
  };

  const copyWhatsApp = async () => {
    const lines = [
      `🌊 *VARKALA TRIP '26 — SETTLE UP*`,
      `Total spend: ${inr(getTotalSpent(expenses))} · ${expenses.length} bills`,
      '',
    ];
    if (!debts.length) {
      lines.push('✅ Everyone is settled up!');
    } else {
      debts.forEach((d, i) => {
        const upi = membersById[d.to.id]?.upiId;
        lines.push(`${i + 1}. ${d.from.name} (${d.from.id}) ➔ ${d.to.name} (${d.to.id}): *${inr(d.amount, 2)}*`);
        lines.push(`   UPI: ${upi || '— not added yet —'}`);
      });
    }
    lines.push('', 'Pay & tap "Mark as Settled" in the app 🙏');
    await copyText(lines.join('\n'));
    toast('📲 Summary copied — paste in WhatsApp');
  };

  return (
    <>
      <AppHeader title="💸 SETTLE UP" />

      <div className="page-content">
        {loading ? (
          <div className="loading-block">LOADING…</div>
        ) : (
          <>
            <div className="section-head">
              <h3 className="section-title">Who Owes Whom</h3>
              <span className="mono small">{debts.length} TRANSFER{debts.length === 1 ? '' : 'S'}</span>
            </div>

            {debts.length > 0 ? (
              <div className="stack">
                {debts.map((debt, i) => {
                  const key = `${debt.from.id}-${debt.to.id}`;
                  return (
                    <div key={key} className="pass">
                      <div className="pass__head">
                        <span>SETTLEMENT PASS</span>
                        <span className="mono">#{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="pass__body">
                        <div className="pass__party">
                          <MemberAvatar member={debt.from} size="md" />
                          <IdTag id={debt.from.id} />
                          <span className="pass__name">{firstName(debt.from)}</span>
                        </div>
                        <div className="pass__mid">
                          <span className="pass__owes">OWES</span>
                          <span className="pass__arrow">➔</span>
                          <span className="pass__amount mono">{inr(debt.amount, 2)}</span>
                        </div>
                        <div className="pass__party">
                          <MemberAvatar member={debt.to} size="md" />
                          <IdTag id={debt.to.id} />
                          <span className="pass__name">{firstName(debt.to)}</span>
                        </div>
                      </div>
                      <div className="pass__tear" aria-hidden />
                      <div className="pass__actions">
                        <button className="btn btn--primary" onClick={() => openPayment(debt)} id={`pay-${debt.from.handle}-${debt.to.handle}`}>
                          📲 SCAN QR / PAY UPI
                        </button>
                        {canRecordSettlement(session, debt.from.id, debt.to.id) && (
                          <button className="btn btn--mint" onClick={() => quickSettle(debt)} disabled={busyKey === key}>
                            {busyKey === key ? '…' : '✓ Settled'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card card--mint empty-state">
                <div className="empty-state__icon">🎉</div>
                <div className="empty-state__title">ALL SETTLED UP!</div>
                <div className="empty-state__desc">
                  {expenses.length === 0 ? 'No expenses yet. Add some to see who owes whom.' : 'Everyone is even. Go catch a wave.'}
                </div>
              </div>
            )}

            <button className="btn btn--whatsapp btn--block" onClick={copyWhatsApp} style={{ marginTop: 20 }}>
              📲 Copy WhatsApp Summary
            </button>

            {settlements.length > 0 && (
              <section className="section">
                <h3 className="section-title">✅ Settlement History</h3>
                <div className="card history">
                  {settlements.map(s => {
                    const payer = membersById[s.paid_by];
                    const receiver = membersById[s.paid_to];
                    return (
                      <div key={s.id} className="history__item">
                        <div className="history__avatars">
                          <MemberAvatar member={payer} size="xs" />
                          <span>➔</span>
                          <MemberAvatar member={receiver} size="xs" />
                        </div>
                        <div className="history__info">
                          <div className="history__text">{firstName(payer)} paid {firstName(receiver)}</div>
                          <div className="history__date mono">
                            {dateTime(s.created_at)}{s.note ? ` · ${s.note}` : ''}
                          </div>
                        </div>
                        <div className="history__amount mono">{inr(s.amount, 2)}</div>
                        {canRecordSettlement(session, s.paid_by, s.paid_to) && (
                          <button className="icon-btn icon-btn--sm" onClick={() => undo(s)} disabled={busyKey === s.id} aria-label="Undo settlement" title="Undo">
                            ↶
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
