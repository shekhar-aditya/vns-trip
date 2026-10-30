// ============================================================
// SQUAD ROSTER — seed data. Live profiles (photo, UPI, QR) come
// from the `vk_members` table and are merged over these.
// ============================================================
export const MEMBER_SEED = [
  { id: 'VK-01', name: 'Aditya Shekhar', handle: 'aditya', initials: 'AS', color: '#FFD600', defaultPassword: 'aditya123', isSilentAdmin: true },
  { id: 'VK-02', name: 'Divyanshu Singh', handle: 'divyanshu', initials: 'DS', color: '#00E5FF', defaultPassword: 'divyanshu123' },
  { id: 'VK-03', name: 'Bibek Sundray', handle: 'bibek', initials: 'BS', color: '#FF5252', defaultPassword: 'bibek123' },
  { id: 'VK-04', name: 'Ritu Singh', handle: 'ritu', initials: 'RS', color: '#00E676', defaultPassword: 'ritu123' },
  { id: 'VK-05', name: 'Vidhi Agrawal', handle: 'vidhi', initials: 'VA', color: '#FF80AB', defaultPassword: 'vidhi123' },
  { id: 'VK-06', name: 'Dibyashree Panda', handle: 'dibyashree', initials: 'DP', color: '#B388FF', defaultPassword: 'dibyashree123' },
  { id: 'VK-07', name: 'Kritika Parida', handle: 'kritika', initials: 'KP', color: '#FFAB40', defaultPassword: 'kritika123' },
];

export const MEMBER_IDS = MEMBER_SEED.map(m => m.id);

/** Public shape of a member (never includes password or admin flag). */
export function toPublicMember(seed, profile = {}) {
  return {
    id: seed.id,
    name: seed.name,
    handle: seed.handle,
    initials: seed.initials,
    color: seed.color,
    avatarUrl: profile.avatar_url || null,
    upiId: profile.upi_id || null,
    qrCodeUrl: profile.qr_code_url || null,
  };
}

export function firstName(member) {
  return member?.name?.split(' ')[0] || '?';
}

/** Resolve "VK-01", "vk01", "1", "@aditya" or "aditya" to a member id. */
export function resolveMemberId(input) {
  const raw = String(input || '').trim().toLowerCase().replace(/^@/, '');
  if (!raw) return null;
  const byHandle = MEMBER_SEED.find(m => m.handle === raw);
  if (byHandle) return byHandle.id;
  const digits = raw.replace(/^vk-?/, '');
  if (/^\d{1,2}$/.test(digits)) {
    const id = `VK-${digits.padStart(2, '0')}`;
    if (MEMBER_IDS.includes(id)) return id;
  }
  return null;
}
