import { inr } from '@/lib/format';

export default function BalanceStamp({ amount, size = 'md' }) {
  const kind = amount > 0.5 ? 'gets' : amount < -0.5 ? 'owes' : 'settled';
  const label = kind === 'gets' ? `GETS BACK +${inr(amount)}` : kind === 'owes' ? `OWES -${inr(-amount)}` : 'SETTLED ₹0';
  return <span className={`stamp stamp--${kind} stamp--${size}`}>{label}</span>;
}
