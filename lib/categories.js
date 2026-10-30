export const CATEGORIES = [
  { id: 'food', label: 'Food & Cliff Cafes', short: 'Food', icon: '🍔', color: '#FFD600' },
  { id: 'drinks', label: 'Drinks & Nightlife', short: 'Drinks', icon: '🍻', color: '#FFAB40' },
  { id: 'scooter', label: 'Scooter / Cab / Auto', short: 'Local Ride', icon: '🛵', color: '#00E5FF' },
  { id: 'transit', label: 'Train / Flight / Transit', short: 'Transit', icon: '🚂', color: '#B388FF' },
  { id: 'stay', label: 'Stay / Cliff Resort', short: 'Stay', icon: '🏨', color: '#FF80AB' },
  { id: 'surf', label: 'Surfing & Water Sports', short: 'Surf', icon: '🏄', color: '#40C4FF' },
  { id: 'tickets', label: 'Tickets & Sightseeing', short: 'Tickets', icon: '🎟️', color: '#00E676' },
  { id: 'shopping', label: 'Shopping', short: 'Shopping', icon: '🛍️', color: '#FF5252' },
  { id: 'medical', label: 'Medical', short: 'Medical', icon: '💊', color: '#FF8A80' },
  { id: 'groceries', label: 'Groceries', short: 'Groceries', icon: '🛒', color: '#CCFF90' },
  { id: 'other', label: 'Other', short: 'Other', icon: '📦', color: '#E0E0E0' },
];

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
