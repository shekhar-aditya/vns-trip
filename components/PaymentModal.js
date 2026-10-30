'use client';

import { useState } from 'react';
import Modal from './Modal';
import MemberAvatar from './MemberAvatar';
import IdTag from './IdTag';
import UpiQr from './UpiQr';
import { useTrip } from './TripProvider';
import { addSettlement } from '@/lib/store';
import { pairBalance, pairwiseLedger } from '@/lib/algorithm';
import { buildUpiLink, isValidUpi } from '@/lib/upi';
import { canRecordSettlement } from '@/lib/permissions';
import { balanceText, copyText, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

const NOTE = 'Varkala Trip Settlement';

/** Pay `debt.to` any amount — exact, partial or more than owed. */
export default function PaymentModal({ debt, onClose }) {
  const { membersById, expenses, settlements, session, refresh, toast } = useTrip();
  // Use live member records so freshly uploaded QR/UPI show up
  const from = membersById[debt.from.id] || debt.from;
  const to = membersById[debt.to.id] || debt.to;
  const hasUpi = isValidUpi(to.upiId);
  const [qrMode, setQrMode] = useState(hasUpi ? 'generated' : 'uploaded');
  const [amountInput, setAmountInput] = useState(debt.amount > 0 ? String(debt.amount) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSettle = canRecordSettlement(session, from.id, to.id);
  const owed = pairBalance(pairwiseLedger(expenses, settlements), from.id, to.id);
  const amount = Math.round((parseFloat(amountInput) || 0) * 100) / 100;
  const after = Math.round((owed - amount) * 100) / 100;

  const recordPayment = async () => {
    if (amount <= 0) return;
    setSaving(true);
    try {
      await addSettlement({
        paid_by: from.id,
        paid_to: to.id,
        amount,
        note: note || `${firstName(from)} → ${firstName(to)}`,
        created_by: session.memberId,
      });
      await refresh();
      toast(`✓ ${inr(amount, 2)} recorded · ${balanceText(after, from, to)}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast('Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="📲 Pay via UPI" onClose={onClose} className="pay-modal">
      <div className="pass-strip">
        <div className="pass-strip__end">
          <MemberAvatar member={from} size="sm" />
          <IdTag id={from.id} />
        </div>
        <div className="pass-strip__mid">
          <span className="pass-strip__arrow">➔</span>
          <span className="pass-strip__amount mono">{inr(amount, 2)}</span>
        </div>
        <div className="pass-strip__end">
          <MemberAvatar member={to} size="sm" />
          <IdTag id={to.id} />
        </div>
      </div>

      <div className="pay-to">Pay <strong>{to.name}</strong></div>
      <div className="hint" style={{ textAlign: 'center' }}>Right now: {balanceText(owed, from, to)}</div>

      <label className="form-label" htmlFor="pay-amount">Amount paying (₹)</label>
      <input
        id="pay-amount"
        className="text-input mono"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="0"
        value={amountInput}
        onChange={e => setAmountInput(e.target.value)}
      />
      {amount > 0 && (
        <div className="hint">
          After this: {Math.abs(after) < 0.01
            ? 'settled ✓ ₹0'
            : after > 0
              ? `${inr(after, 2)} remaining to pay`
              : `${firstName(to)} will owe ${firstName(from)} ${inr(-after, 2)}`}
        </div>
      )}

      {to.qrCodeUrl && hasUpi && (
        <div className="seg seg--sm">
          <button className={`seg__btn ${qrMode === 'generated' ? 'seg__btn--on' : ''}`} onClick={() => setQrMode('generated')}>Amount QR</button>
          <button className={`seg__btn ${qrMode === 'uploaded' ? 'seg__btn--on' : ''}`} onClick={() => setQrMode('uploaded')}>Their QR</button>
        </div>
      )}

      <div className="qr-preview qr-preview--bright">
        <UpiQr member={to} amount={amount || undefined} note={NOTE} prefer={qrMode} size={250} />
      </div>

      {to.upiId ? (
        <div className="upi-line">
          <span className="mono upi-line__id">{to.upiId}</span>
          <button className="btn btn--ink btn--sm" onClick={async () => { await copyText(to.upiId); toast('📋 UPI ID copied'); }}>
            📋 Copy UPI ID
          </button>
        </div>
      ) : (
        <div className="hint" style={{ textAlign: 'center' }}>
          {firstName(to)} hasn&apos;t added a UPI ID yet — ask them to set it in their profile.
        </div>
      )}

      <div className="btn-stack">
        {hasUpi && amount > 0 && (
          <a
            className="btn btn--primary btn--block btn--lg"
            href={buildUpiLink({ upiId: to.upiId, name: to.name, amount, note: NOTE })}
          >
            ⚡ Open UPI App ({inr(amount, 2)})
          </a>
        )}
        {canSettle && (
          <>
            <input className="text-input" placeholder="Note (optional) e.g. Paid via GPay" value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn btn--mint btn--block" onClick={recordPayment} disabled={saving || amount <= 0}>
              {saving ? 'Recording…' : `✓ Record ${inr(amount, 2)} Payment`}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
