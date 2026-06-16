'use client';

import { MEMBERS, setCurrentUser } from '@/lib/supabase';
import MemberAvatar from './MemberAvatar';

export default function UserSelector({ onSelect }) {
  const handleSelect = (member) => {
    setCurrentUser(member);
    onSelect(member);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal__title">🚂 Varanasi Trip</h2>
        <p className="modal__subtitle">Who are you? Pick your name to get started</p>
        <div className="modal__members">
          {MEMBERS.map((member, i) => (
            <button
              key={member.id}
              className={`modal__member-btn animate-in animate-in--delay-${i + 1}`}
              onClick={() => handleSelect(member)}
              id={`user-select-${member.username}`}
            >
              <MemberAvatar member={member} size="md" />
              <div>
                <div className="modal__member-name">{member.name}</div>
                <div className="modal__member-username">@{member.username}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
