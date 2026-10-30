'use client';

import { useState } from 'react';
import Modal from './Modal';
import MemberAvatar from './MemberAvatar';
import IdTag from './IdTag';
import { useTrip } from './TripProvider';
import { login } from '@/lib/store';
import { resolveMemberId } from '@/lib/members';

export default function LoginModal({ onLogin, onCancel }) {
  const { members, membersById } = useTrip();
  const [selectedId, setSelectedId] = useState(null);
  const [idInput, setIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = selectedId ? membersById[selectedId] : null;

  const pickById = e => {
    e.preventDefault();
    const id = resolveMemberId(idInput);
    if (!id) {
      setError('No squad member with that ID. Try VK-01 … VK-07.');
      return;
    }
    setError('');
    setSelectedId(id);
  };

  const submit = async e => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const session = await login(selectedId, password);
      if (session) onLogin(session);
      else setError('Wrong password. Try again.');
    } catch (err) {
      console.error(err);
      setError('Could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={selected ? 'Enter password' : "Who are you?"}
      onClose={onCancel}
      dismissable={Boolean(onCancel)}
      className="login-modal"
    >
      {!selected ? (
        <>
          <div className="login-brand">
            <span className="login-brand__wave">🌊</span>
            <div>
              <div className="login-brand__title">VARKALA TRIP &apos;26</div>
              <div className="login-brand__sub">Pick your name or enter your Member ID</div>
            </div>
          </div>
          <div className="login-grid">
            {members.map(member => (
              <button
                key={member.id}
                className="login-member"
                onClick={() => { setSelectedId(member.id); setError(''); }}
                id={`login-${member.handle}`}
              >
                <MemberAvatar member={member} size="md" />
                <span className="login-member__name">{member.name}</span>
                <IdTag id={member.id} />
              </button>
            ))}
          </div>
          <form className="login-id-form" onSubmit={pickById}>
            <input
              className="text-input mono"
              placeholder="Member ID e.g. VK-03"
              value={idInput}
              onChange={e => setIdInput(e.target.value)}
              autoCapitalize="characters"
              aria-label="Member ID"
            />
            <button className="btn btn--ink" type="submit">GO →</button>
          </form>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="login-selected">
            <MemberAvatar member={selected} size="lg" />
            <div>
              <div className="login-selected__name">{selected.name}</div>
              <div className="login-selected__meta"><IdTag id={selected.id} /> <span className="mono">@{selected.handle}</span></div>
            </div>
          </div>
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="text-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn--primary btn--block" type="submit" disabled={busy || !password} style={{ marginTop: 16 }}>
            {busy ? 'Checking…' : '🔓 Unlock'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ marginTop: 10 }}
            onClick={() => { setSelectedId(null); setPassword(''); setError(''); }}
          >
            ← Not {selected.name.split(' ')[0]}?
          </button>
        </form>
      )}
      {!selected && error && <div className="form-error">{error}</div>}
    </Modal>
  );
}
