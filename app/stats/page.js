'use client';

import AppHeader from '@/components/AppHeader';
import MemberAvatar from '@/components/MemberAvatar';
import { useTrip } from '@/components/TripProvider';
import { CATEGORIES, getCategoryById } from '@/lib/categories';
import { getMemberStats, getTotalSpent } from '@/lib/algorithm';
import { getExpensePayers, getExpenseSplits } from '@/lib/split';
import { downloadFile, expenseDate, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function StatsPage() {
  const { members, membersById, expenses, settlements, loading, toast } = useTrip();
  const total = getTotalSpent(expenses);
  const stats = getMemberStats(members, expenses, settlements);

  // Category totals
  const byCategory = CATEGORIES
    .map(c => ({ ...c, total: expenses.filter(e => e.category === c.id).reduce((s, e) => s + parseFloat(e.amount), 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...byCategory.map(c => c.total));

  // Daily timeline
  const dailyMap = {};
  expenses.forEach(e => {
    const k = dayKey(expenseDate(e));
    dailyMap[k] = (dailyMap[k] || 0) + parseFloat(e.amount);
  });
  const days = Object.keys(dailyMap).sort().map(k => ({ key: k, total: dailyMap[k] }));
  const maxDay = Math.max(1, ...days.map(d => d.total));
  const peakDay = days.reduce((a, d) => (d.total > (a?.total || 0) ? d : a), null);

  // Fun badges
  const shareIn = (memberId, cats) => expenses
    .filter(e => cats.includes(e.category))
    .reduce((s, e) => s + (getExpenseSplits(e)[memberId] || 0), 0);
  const topBy = fn => {
    let best = null;
    members.forEach(m => {
      const v = fn(m);
      if (v > 0 && (!best || v > best.value)) best = { member: m, value: v };
    });
    return best;
  };
  const badges = [
    { icon: '🏦', title: 'Chief Sponsor', desc: 'Paid the most upfront', winner: topBy(m => stats[m.id].totalPaid), fmt: v => inr(v) },
    { icon: '🍔', title: 'Cliff Foodie', desc: 'Biggest food & drinks share', winner: topBy(m => shareIn(m.id, ['food', 'drinks'])), fmt: v => inr(v) },
    { icon: '🧾', title: 'Receipt Keeper', desc: 'Logged the most bills', winner: topBy(m => stats[m.id].loggedCount), fmt: v => `${v} bills` },
    { icon: '🏄', title: 'Wave Chaser', desc: 'Most spent on surf & water', winner: topBy(m => shareIn(m.id, ['surf'])), fmt: v => inr(v) },
  ];

  const exportCsv = () => {
    const header = ['Date', 'Description', 'Category', 'Amount', 'Split Mode', 'Paid By', ...members.map(m => `${m.id} ${firstName(m)} share`), 'Notes', 'Logged By'];
    const rows = [...expenses].sort((a, b) => expenseDate(a) - expenseDate(b)).map(e => {
      const payers = getExpensePayers(e);
      const splits = getExpenseSplits(e);
      return [
        expenseDate(e).toLocaleString('en-IN'),
        e.description,
        getCategoryById(e.category).label,
        parseFloat(e.amount).toFixed(2),
        e.split_mode || 'equal',
        Object.entries(payers).map(([id, v]) => `${membersById[id]?.name || id} ₹${v}`).join('; '),
        ...members.map(m => (splits[m.id] || 0).toFixed(2)),
        e.note || '',
        e.created_by || '',
      ];
    });
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
    downloadFile(`varkala-trip-expenses-${dayKey(new Date())}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    toast('⬇ CSV downloaded');
  };

  return (
    <>
      <AppHeader title="📊 INSIGHTS" />

      <div className="page-content">
        {loading ? (
          <div className="loading-block">LOADING…</div>
        ) : expenses.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state__icon">📊</div>
            <div className="empty-state__title">No data yet</div>
            <div className="empty-state__desc">Insights show up once you log some expenses.</div>
          </div>
        ) : (
          <>
            <div className="kpi-row">
              <div className="card card--yellow kpi"><div className="kpi__value mono">{inr(total)}</div><div className="kpi__label">TOTAL</div></div>
              <div className="card kpi"><div className="kpi__value mono">{inr(total / Math.max(1, days.length))}</div><div className="kpi__label">AVG / DAY</div></div>
              <div className="card kpi"><div className="kpi__value mono">{inr(peakDay?.total || 0)}</div><div className="kpi__label">PEAK DAY</div></div>
            </div>

            <section className="section">
              <h3 className="section-title">Spend by Category</h3>
              <div className="card chart">
                {byCategory.map(c => (
                  <div key={c.id} className="hbar" title={`${c.label}: ${inr(c.total, 2)} (${((c.total / total) * 100).toFixed(1)}%)`}>
                    <div className="hbar__label">{c.icon} {c.short}</div>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                    </div>
                    <div className="hbar__value mono">{inr(c.total)} <small>{Math.round((c.total / total) * 100)}%</small></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <h3 className="section-title">Daily Spend</h3>
              <div className="card chart">
                <div className="vbars" role="img" aria-label="Daily spend bar chart">
                  {days.map(d => {
                    const label = new Date(`${d.key}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    return (
                      <div key={d.key} className="vbar" title={`${label}: ${inr(d.total, 2)}`} tabIndex={0}>
                        <div className="vbar__value mono">{d === peakDay ? inr(d.total) : ''}</div>
                        <div className="vbar__col">
                          <div className="vbar__fill" style={{ height: `${Math.max(3, (d.total / maxDay) * 100)}%` }} />
                        </div>
                        <div className="vbar__label mono">{label}</div>
                        <div className="vbar__tip mono">{inr(d.total)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="section">
              <h3 className="section-title">Squad Badges</h3>
              <div className="badge-grid">
                {badges.map(b => (
                  <div key={b.title} className="card badge-card">
                    <div className="badge-card__icon">{b.icon}</div>
                    <div className="badge-card__title">{b.title}</div>
                    <div className="badge-card__desc">{b.desc}</div>
                    {b.winner ? (
                      <div className="badge-card__winner">
                        <MemberAvatar member={b.winner.member} size="xs" />
                        <span>{firstName(b.winner.member)}</span>
                        <span className="mono">{b.fmt(b.winner.value)}</span>
                      </div>
                    ) : <div className="badge-card__winner">—</div>}
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <h3 className="section-title">Who Paid vs. Who Owes</h3>
              <div className="card table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Member</th><th>Paid</th><th>Share</th></tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id}>
                        <td><span className="mono">{m.id}</span> {firstName(m)}</td>
                        <td className="mono">{inr(stats[m.id].totalPaid)}</td>
                        <td className="mono">{inr(stats[m.id].totalShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <button className="btn btn--cyan btn--block btn--lg" onClick={exportCsv} style={{ marginTop: 20 }}>
              ⬇ Export CSV
            </button>
          </>
        )}
      </div>
    </>
  );
}
