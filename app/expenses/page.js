'use client';

import { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import ExpenseRow from '@/components/ExpenseRow';
import ReceiptModal from '@/components/ReceiptModal';
import { useTrip } from '@/components/TripProvider';
import { CATEGORIES } from '@/lib/categories';
import { getExpensePayers, getExpenseSplits, isInvolved } from '@/lib/split';
import { expenseDate, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'high', label: 'Highest ₹' },
  { id: 'low', label: 'Lowest ₹' },
  { id: 'mine', label: 'My Involvement' },
];

export default function ExpensesPage() {
  const { members, membersById, expenses, loading, session } = useTrip();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = expenses.filter(e => {
      if (category !== 'all' && e.category !== category) return false;
      if (memberFilter !== 'all' && !isInvolved(e, memberFilter)) return false;
      if (sort === 'mine' && session && !isInvolved(e, session.memberId)) return false;
      if (!q) return true;
      const people = [...Object.keys(getExpensePayers(e)), ...Object.keys(getExpenseSplits(e))];
      const haystack = [
        e.description, e.note,
        ...people, ...people.map(id => membersById[id]?.name || ''),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });

    const amt = e => parseFloat(e.amount);
    const time = e => expenseDate(e).getTime();
    const sorters = {
      newest: (a, b) => time(b) - time(a),
      oldest: (a, b) => time(a) - time(b),
      high: (a, b) => amt(b) - amt(a),
      low: (a, b) => amt(a) - amt(b),
      mine: (a, b) => (getExpenseSplits(b)[session?.memberId] || 0) - (getExpenseSplits(a)[session?.memberId] || 0),
    };
    return list.sort(sorters[sort]);
  }, [expenses, query, sort, category, memberFilter, session, membersById]);

  const totalFiltered = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const selected = expenses.find(e => e.id === selectedId);

  return (
    <>
      <AppHeader title="🧾 ALL SPENDS" />

      <div className="page-content">
        <div className="toolbar">
          <input
            className="text-input"
            type="search"
            placeholder="🔍 Search description, notes, VK-03…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search expenses"
          />
          <select className="text-input select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div className="pill-scroll">
          <button className={`pill ${category === 'all' ? 'pill--on' : ''}`} onClick={() => setCategory('all')}>All</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`pill ${category === cat.id ? 'pill--on' : ''}`}
              style={category === cat.id ? { background: cat.color } : undefined}
              onClick={() => setCategory(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="pill-scroll">
          <button className={`pill ${memberFilter === 'all' ? 'pill--on' : ''}`} onClick={() => setMemberFilter('all')}>👥 Everyone</button>
          {members.map(m => (
            <button
              key={m.id}
              className={`pill ${memberFilter === m.id ? 'pill--on' : ''}`}
              style={memberFilter === m.id ? { background: m.color } : undefined}
              onClick={() => setMemberFilter(m.id)}
            >
              <span className="mono">{m.id}</span> {firstName(m)}
            </button>
          ))}
        </div>

        <div className="result-bar mono">
          <span>{filtered.length} ITEMS</span>
          <span>{inr(totalFiltered, 2)}</span>
        </div>

        {loading ? (
          <div className="loading-block">LOADING…</div>
        ) : filtered.length > 0 ? (
          <div className="stack">
            {filtered.map(e => (
              <ExpenseRow key={e.id} expense={e} onClick={() => setSelectedId(e.id)} highlightId={sort === 'mine' ? session?.memberId : undefined} />
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__title">Nothing found</div>
            <div className="empty-state__desc">Try a different search or filter.</div>
          </div>
        )}
      </div>

      {selected && <ReceiptModal expense={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
