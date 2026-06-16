'use client';

export default function MemberAvatar({ member, size = 'md', style = {} }) {
  if (!member) return null;

  const bgColor = member.color || '#6C63FF';

  return (
    <div
      className={`avatar avatar--${size}`}
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
        color: '#fff',
        ...style,
      }}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}
