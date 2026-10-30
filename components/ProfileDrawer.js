'use client';

import { useRef, useState } from 'react';
import Modal from './Modal';
import MemberAvatar from './MemberAvatar';
import IdTag from './IdTag';
import UpiQr from './UpiQr';
import { useTrip } from './TripProvider';
import * as store from '@/lib/store';
import { compressImage, imageFromClipboard } from '@/lib/image';
import { isValidUpi } from '@/lib/upi';
import { canEditProfile } from '@/lib/permissions';
import { copyText, downloadFile } from '@/lib/format';
import { firstName } from '@/lib/members';

export default function ProfileDrawer({ targetId, onTargetChange, onClose }) {
  const { session, members, membersById, refresh, toast, logout, switchUser, expireSession } = useTrip();
  const member = membersById[targetId];
  const isSelf = targetId === session.memberId;

  if (!member || !canEditProfile(session, targetId)) return null;

  return (
    <Modal title={isSelf ? '🪪 My Profile & Payment Setup' : `🪪 ${firstName(member)}'s Profile`} onClose={onClose} className="drawer">
      {session.isAdmin && (
        <section className="drawer-section">
          <h3 className="drawer-section__title">Manage Squad Profiles</h3>
          <div className="chip-row">
            {members.map(m => (
              <button
                key={m.id}
                className={`member-chip ${m.id === targetId ? 'member-chip--active' : ''}`}
                onClick={() => onTargetChange(m.id)}
              >
                <MemberAvatar member={m} size="xs" />
                {firstName(m)}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* key resets all form state when switching member */}
      <ProfileEditor
        key={member.id}
        member={member}
        isSelf={isSelf}
        session={session}
        refresh={refresh}
        toast={toast}
        expireSession={expireSession}
      />

      {isSelf && session.isAdmin && <TripDataControls session={session} refresh={refresh} toast={toast} />}

      {isSelf && (
        <section className="drawer-section drawer-actions">
          <button className="btn btn--ghost" onClick={() => { onClose(); switchUser(); }}>⇄ Switch User</button>
          <button className="btn btn--danger" onClick={logout}>⏻ Log Out</button>
        </section>
      )}
    </Modal>
  );
}

function ProfileEditor({ member, isSelf, session, refresh, toast, expireSession }) {
  const [upiId, setUpiId] = useState(member.upiId || '');
  const [linkInput, setLinkInput] = useState('');
  const [busy, setBusy] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const avatarInput = useRef(null);
  const qrInput = useRef(null);

  const save = async (label, patch) => {
    setBusy(label);
    try {
      await store.updateProfile(session, member.id, patch);
      await refresh();
      toast(`✓ ${label} saved`);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Could not save');
      await expireSession();
    } finally {
      setBusy(null);
    }
  };

  const handleAvatarFile = async file => {
    if (!file) return;
    try {
      const url = await compressImage(file, { maxSize: 400, square: true, maxBytes: 80_000 });
      await save('Photo', { avatar_url: url });
    } catch (err) {
      toast(err.message);
    }
  };

  const handleAvatarLink = async () => {
    const link = linkInput.trim();
    if (!/^https?:\/\//i.test(link)) {
      toast('Paste a full image link (https://…)');
      return;
    }
    let url = link;
    try {
      url = await compressImage(link, { maxSize: 400, square: true, maxBytes: 80_000 });
    } catch {
      // Host blocks cross-origin reads — keep the plain link
    }
    await save('Photo', { avatar_url: url });
    setLinkInput('');
  };

  const handleQrFile = async file => {
    if (!file || !file.type?.startsWith('image/')) {
      toast('That is not an image');
      return;
    }
    try {
      const url = await compressImage(file, { maxSize: 640, maxBytes: 120_000 });
      await save('QR code', { qr_code_url: url });
    } catch (err) {
      toast(err.message);
    }
  };

  const upiValid = isValidUpi(upiId);
  const upiDirty = upiId.trim() !== (member.upiId || '');

  return (
    <>
      <section className="drawer-section profile-head">
        <div className="profile-head__avatar">
          <MemberAvatar member={member} size="xl" />
        </div>
        <div>
          <div className="profile-head__name">{member.name}</div>
          <div className="profile-head__meta"><IdTag id={member.id} /> <span className="mono">@{member.handle}</span></div>
        </div>
      </section>

      {/* ---- Photo ---- */}
      <section className="drawer-section">
        <h3 className="drawer-section__title">📸 Profile Picture</h3>
        <div className="btn-row">
          <button className="btn btn--cyan" onClick={() => avatarInput.current?.click()} disabled={!!busy}>
            {busy === 'Photo' ? 'Uploading…' : '📷 Camera / Gallery'}
          </button>
          {member.avatarUrl && (
            <button className="btn btn--ghost" onClick={() => save('Photo', { avatar_url: null })} disabled={!!busy}>Remove</button>
          )}
        </div>
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          hidden
          onChange={e => { handleAvatarFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        <div className="inline-form">
          <input
            className="text-input"
            placeholder="…or paste an image link"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
          />
          <button className="btn btn--ink" onClick={handleAvatarLink} disabled={!linkInput || !!busy}>Use</button>
        </div>
      </section>

      {/* ---- UPI ---- */}
      <section className="drawer-section">
        <h3 className="drawer-section__title">💳 UPI ID</h3>
        <div className="inline-form">
          <input
            className={`text-input mono ${upiId && !upiValid ? 'text-input--invalid' : ''}`}
            placeholder="name@okaxis or 98xxxxxx10@ybl"
            value={upiId}
            onChange={e => setUpiId(e.target.value.replace(/\s/g, ''))}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {member.upiId && !upiDirty && (
            <button className="btn btn--ghost" onClick={async () => { await copyText(member.upiId); toast('📋 UPI ID copied'); }}>Copy</button>
          )}
        </div>
        <div className={`hint ${upiId && !upiValid ? 'hint--bad' : ''}`}>
          {!upiId ? 'Format: handle@bank (e.g. aditya@upi)' : upiValid ? '✓ Looks like a valid UPI ID' : '✕ Should look like handle@bank'}
        </div>
        {upiDirty && (
          <button
            className="btn btn--primary btn--block"
            disabled={!!busy || (upiId && !upiValid)}
            onClick={() => save('UPI ID', { upi_id: upiId.trim() || null })}
          >
            {busy === 'UPI ID' ? 'Saving…' : upiId ? 'Save UPI ID' : 'Clear UPI ID'}
          </button>
        )}
      </section>

      {/* ---- QR ---- */}
      <section className="drawer-section">
        <h3 className="drawer-section__title">🔳 Payment QR Code</h3>
        <div
          className={`paste-zone ${dragOver ? 'paste-zone--over' : ''}`}
          tabIndex={0}
          role="button"
          onClick={() => qrInput.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') qrInput.current?.click(); }}
          onPaste={e => {
            const file = imageFromClipboard(e);
            if (file) { e.preventDefault(); handleQrFile(file); }
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleQrFile(e.dataTransfer.files?.[0]); }}
        >
          <div className="paste-zone__icon">📤</div>
          <div className="paste-zone__text">{busy === 'QR code' ? 'Saving…' : 'Upload QR Screenshot or Paste Image Here'}</div>
          <div className="paste-zone__sub">Tap to pick · Ctrl/⌘+V or long-press → Paste</div>
        </div>
        <input
          ref={qrInput}
          type="file"
          accept="image/*"
          hidden
          onChange={e => { handleQrFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        <div className="qr-preview">
          <UpiQr member={member} size={200} />
        </div>
        {member.qrCodeUrl && (
          <button className="btn btn--ghost btn--block" onClick={() => save('QR code', { qr_code_url: null })} disabled={!!busy}>
            Remove uploaded QR {member.upiId ? '(use auto QR)' : ''}
          </button>
        )}
        {!member.qrCodeUrl && member.upiId && (
          <div className="hint">No screenshot uploaded — a QR is auto-generated from the UPI ID.</div>
        )}
      </section>

      <PasswordForm member={member} isSelf={isSelf} session={session} toast={toast} expireSession={expireSession} />
    </>
  );
}

function PasswordForm({ member, isSelf, session, toast, expireSession }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (next.length < 4) return setError('New password must be at least 4 characters.');
    if (next !== confirm) return setError("New passwords don't match.");
    setBusy(true);
    try {
      const err = await store.changePassword(session, member.id, isSelf ? current : null, next);
      if (err) {
        setError(err);
        if (err.startsWith('Your session')) await expireSession();
      } else {
        setCurrent(''); setNext(''); setConfirm('');
        toast(isSelf ? '🔑 Password updated' : `🔑 ${firstName(member)}'s password reset`);
      }
    } catch (err2) {
      console.error(err2);
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="drawer-section" onSubmit={submit}>
      <h3 className="drawer-section__title">🔑 {isSelf ? 'Change Password' : `Reset ${firstName(member)}'s Password`}</h3>
      {isSelf && (
        <input className="text-input" type="password" placeholder="Current password" value={current}
          onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
      )}
      <input className="text-input" type="password" placeholder="New password" value={next}
        onChange={e => setNext(e.target.value)} autoComplete="new-password" />
      <input className="text-input" type="password" placeholder="Confirm new password" value={confirm}
        onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
      {error && <div className="form-error">{error}</div>}
      <button className="btn btn--ink btn--block" type="submit" disabled={busy || !next || (isSelf && !current)}>
        {busy ? 'Saving…' : 'Save Password'}
      </button>
    </form>
  );
}

function TripDataControls({ session, refresh, toast }) {
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    const snap = await store.exportSnapshot();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    downloadFile(`varkala-trip-snapshot-${stamp}.json`, JSON.stringify(snap, null, 2), 'application/json');
    toast('⬇ Snapshot downloaded');
  };

  const restore = async file => {
    if (!file) return;
    let snap;
    try {
      snap = JSON.parse(await file.text());
    } catch {
      toast('That file is not valid JSON');
      return;
    }
    const counts = `${snap.expenses?.length ?? 0} expenses, ${snap.settlements?.length ?? 0} settlements`;
    if (!confirm(`Replace ALL current trip data with this snapshot (${counts})?`)) return;
    setBusy(true);
    try {
      await store.restoreSnapshot(session, snap);
      await refresh();
      toast('♻ Snapshot restored');
    } catch (err) {
      console.error(err);
      toast(err.message || 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="drawer-section">
      <h3 className="drawer-section__title">🗄️ Trip Data</h3>
      <div className="btn-row">
        <button className="btn btn--cyan" onClick={exportData}>⬇ Export Snapshot</button>
        <button className="btn btn--ghost" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? 'Restoring…' : '♻ Restore'}
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden
        onChange={e => { restore(e.target.files?.[0]); e.target.value = ''; }} />
    </section>
  );
}
