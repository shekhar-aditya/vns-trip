'use client';

/* eslint-disable @next/next/no-img-element -- data-URL avatars */
export default function MemberAvatar({ member, size = 'md', className = '', style = {} }) {
  if (!member) return null;

  return (
    <div
      className={`avatar avatar--${size} ${className}`}
      style={{ background: member.color, ...style }}
      title={`${member.name} · ${member.id}`}
    >
      {member.avatarUrl
        ? <img src={member.avatarUrl} alt={member.name} className="avatar__img" />
        : member.initials}
    </div>
  );
}
