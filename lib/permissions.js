// Permission checks. `session.isAdmin` comes from the server on login
// and is never rendered — it only unlocks controls.
import { getExpensePayers } from './split';

export function canEditExpense(session, expense) {
  if (!session || !expense) return false;
  if (session.isAdmin) return true;
  return expense.created_by === session.memberId || session.memberId in getExpensePayers(expense);
}

/** Only the silent admin can delete expenses — anyone's. */
export function canDeleteExpense(session, expense) {
  return Boolean(session?.isAdmin && expense);
}

/** Only the silent admin can wipe the trip. */
export function canResetTrip(session) {
  return Boolean(session?.isAdmin);
}

export function canRecordSettlement(session, fromId, toId) {
  if (!session) return false;
  return session.isAdmin || session.memberId === fromId || session.memberId === toId;
}

export function canEditProfile(session, memberId) {
  if (!session) return false;
  return session.isAdmin || session.memberId === memberId;
}
