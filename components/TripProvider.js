'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as store from '@/lib/store';
import { MEMBER_SEED, toPublicMember } from '@/lib/members';
import LoginModal from './LoginModal';
import ProfileDrawer from './ProfileDrawer';
import MemberSheet from './MemberSheet';
import PaymentModal from './PaymentModal';

const TripContext = createContext(null);

export function useTrip() {
  return useContext(TripContext);
}

export default function TripProvider({ children }) {
  const [members, setMembers] = useState(() => MEMBER_SEED.map(s => toPublicMember(s)));
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [spotChecks, setSpotChecks] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [profileTarget, setProfileTarget] = useState(null); // member id or null
  const [memberSheet, setMemberSheet] = useState(null);     // member id or null
  const [payment, setPayment] = useState(null);             // { from, to, amount } or null
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await store.fetchAll();
      setMembers(data.members);
      setExpenses(data.expenses);
      setSettlements(data.settlements);
      setSpotChecks(data.spotChecks);
      setLoadError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoadError(err.message || 'Could not load trip data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = await store.checkSession(store.getStoredSession());
      if (cancelled) return;
      setSession(fresh);
      setSessionChecked(true);
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    refresh();

    const unsubscribe = store.subscribe(refresh);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const toast = useCallback(msg => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  const handleLogin = useCallback(newSession => {
    setSession(newSession);
    setShowLogin(false);
  }, []);

  const logout = useCallback(async () => {
    await store.logout(session);
    setSession(null);
    setProfileTarget(null);
    setMemberSheet(null);
  }, [session]);

  /** Server rejected our token (password reset elsewhere) — drop to login. */
  const expireSession = useCallback(async () => {
    const fresh = await store.checkSession(session);
    if (!fresh) setSession(null);
    return fresh;
  }, [session]);

  const membersById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const currentUser = session ? membersById[session.memberId] : null;

  const value = {
    members,
    membersById,
    expenses,
    settlements,
    spotChecks,
    loading,
    loadError,
    refresh,
    session,
    currentUser,
    logout,
    expireSession,
    switchUser: () => setShowLogin(true),
    openProfile: (memberId) => setProfileTarget(memberId || session?.memberId),
    openMember: (memberId) => setMemberSheet(memberId),
    openPayment: (debt) => setPayment(debt),
    toast,
  };

  const needsLogin = sessionChecked && !session;

  return (
    <TripContext.Provider value={value}>
      {children}

      {(needsLogin || showLogin) && (
        <LoginModal
          onLogin={handleLogin}
          onCancel={session ? () => setShowLogin(false) : null}
        />
      )}
      {profileTarget && session && (
        <ProfileDrawer
          targetId={profileTarget}
          onTargetChange={setProfileTarget}
          onClose={() => setProfileTarget(null)}
        />
      )}
      {memberSheet && (
        <MemberSheet memberId={memberSheet} onClose={() => setMemberSheet(null)} />
      )}
      {payment && (
        <PaymentModal debt={payment} onClose={() => setPayment(null)} />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </TripContext.Provider>
  );
}
