'use client';

import Link from 'next/link';
import Modal from './Modal';
import MemberAvatar from './MemberAvatar';
import IdTag from './IdTag';
import UpiQr from './UpiQr';
import BalanceStamp from './BalanceStamp';
import { useTrip } from './TripProvider';
import { getMemberStats } from '@/lib/algorithm';
import { canEditProfile } from '@/lib/permissions';
import { buildUpiLink } from '@/lib/upi';
import { copyText, inr } from '@/lib/format';
import { firstName } from '@/lib/members';

export default function MemberSheet({ memberId, onClose }) {
  const { members, membersById, expenses, settlements, session, openProfile, toast } = useTrip();
  const member = membersById[memberId];
  if (!member) return null;

  const stats = getMemberStats(members, expenses, settlements)[memberId];
  const editable = canEditProfile(session, memberId);

  return (
    <Modal title="Member Card" onClose={onClose} className="member-sheet">
      <div className="member-card-hero" style={{ background: member.color }}>
        <MemberAvatar member={member} size="xl" />
        <div className="member-card-hero__name">{member.name}</div>
        <div className="member-card-hero__meta"><IdTag id={member.id} className="id-tag--light" /> <span className="mono">@{member.handle}</span></div>
      </div>

      <div className="stat-trio">
        <div className="stat-box"><div className="stat-box__value mono">{inr(stats.totalPaid)}</div><div className="stat-box__label">Paid</div></div>
        <div className="stat-box"><div className="stat-box__value mono">{inr(stats.totalShare)}</div><div className="stat-box__label">Share</div></div>
        <div className="stat-box"><BalanceStamp amount={stats.netBalance} /></div>
      </div>

      <div className="qr-preview">
        <UpiQr member={member} size={220} />
      </div>

      {member.upiId ? (
        <div className="upi-line">
          <span className="mono upi-line__id">{member.upiId}</span>
          <button className="btn btn--ink btn--sm" onClick={async () => { await copyText(member.upiId); toast('📋 UPI ID copied'); }}>
            📋 Copy
          </button>
        </div>
      ) : (
        <div className="hint" style={{ textAlign: 'center' }}>{firstName(member)} hasn&apos;t added a UPI ID yet.</div>
      )}

      <div className="btn-stack">
        {member.upiId && (
          <a className="btn btn--primary btn--block" href={buildUpiLink({ upiId: member.upiId, name: member.name, note: 'Varkala Trip' })}>
            ⚡ Open UPI App
          </a>
        )}
        {editable && (
          <button className="btn btn--cyan btn--block" onClick={() => { onClose(); openProfile(memberId); }}>
            ✏️ Edit Profile, UPI & Password
          </button>
        )}
        <Link className="btn btn--ghost btn--block" href={`/member/${member.id}`} onClick={onClose}>
          Full history →
        </Link>
      </div>
    </Modal>
  );
}
