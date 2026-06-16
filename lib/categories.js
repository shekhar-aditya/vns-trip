export const CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', icon: '🍔', color: '#FF6B6B' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#6C63FF' },
  { id: 'hotel', label: 'Hotel / Stay', icon: '🏨', color: '#00B4D8' },
  { id: 'tickets', label: 'Tickets / Entry', icon: '🎟️', color: '#FF9F43' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#E91E8C' },
  { id: 'activities', label: 'Activities', icon: '🎉', color: '#00D68F' },
  { id: 'medical', label: 'Medical', icon: '💊', color: '#FF4757' },
  { id: 'groceries', label: 'Groceries', icon: '🛒', color: '#A29BFE' },
  { id: 'other', label: 'Other', icon: '📦', color: '#636E72' },
];

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
