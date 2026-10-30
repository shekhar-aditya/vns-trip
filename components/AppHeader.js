'use client';

import { useRouter } from 'next/navigation';
import MemberAvatar from './MemberAvatar';
import { useTrip } from './TripProvider';
import { firstName } from '@/lib/members';

export default function AppHeader({ title, back = false, right = null }) {
  const router = useRouter();
  const { currentUser, openProfile } = useTrip();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        {back && (
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">←</button>
        )}
        <span className="app-header__title">{title}</span>
        {right}
        {currentUser && (
          <button className="app-header__user" onClick={() => openProfile()} id="header-user-badge">
            <MemberAvatar member={currentUser} size="xs" />
            <span className="app-header__user-name">{firstName(currentUser)}</span>
            <span className="app-header__user-id">{currentUser.id}</span>
          </button>
        )}
      </div>
    </header>
  );
}
