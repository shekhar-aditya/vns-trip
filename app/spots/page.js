'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MemberAvatar from '@/components/MemberAvatar';
import { useTrip } from '@/components/TripProvider';
import { setSpotCheck } from '@/lib/store';
import { SPOTS } from '@/lib/spots';

export default function SpotsPage() {
  const { spotChecks, membersById, session, refresh, toast } = useTrip();
  const [busy, setBusy] = useState(null);
  const done = SPOTS.filter(s => spotChecks[s.id]?.checked).length;

  const toggle = async spot => {
    if (!session) return;
    setBusy(spot.id);
    try {
      await setSpotCheck(spot.id, !spotChecks[spot.id]?.checked, session.memberId);
      await refresh();
    } catch (err) {
      console.error(err);
      toast('Could not update checklist');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <AppHeader title="🗺️ SPOTS" back />

      <div className="page-content">
        <div className="card card--cyan progress-card">
          <div className="progress-card__label">VARKALA SPOT CHECKLIST</div>
          <div className="progress-card__count mono">{done}/{SPOTS.length}</div>
          <div className="progress">
            <div className="progress__fill" style={{ width: `${(done / SPOTS.length) * 100}%` }} />
          </div>
        </div>

        <div className="stack">
          {SPOTS.map(spot => {
            const check = spotChecks[spot.id];
            const checked = Boolean(check?.checked);
            const by = check?.checked_by ? membersById[check.checked_by] : null;
            return (
              <div key={spot.id} className={`card spot ${checked ? 'spot--done' : ''}`}>
                <button className="spot__check" onClick={() => toggle(spot)} disabled={busy === spot.id} aria-pressed={checked} aria-label={`Mark ${spot.name} ${checked ? 'not visited' : 'visited'}`}>
                  {checked ? '✓' : ''}
                </button>
                <div className="spot__info">
                  <div className="spot__name">{spot.icon} {spot.name}</div>
                  <div className="spot__area mono">{spot.area}</div>
                  <div className="spot__tip">{spot.tip}</div>
                  {checked && by && (
                    <div className="spot__by"><MemberAvatar member={by} size="xs" /> ticked by {by.name.split(' ')[0]}</div>
                  )}
                </div>
                <Link
                  className="btn btn--primary btn--sm spot__log"
                  href={`/add?category=${spot.category}&desc=${encodeURIComponent(spot.name)}`}
                >
                  ➕ Log Expense
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
