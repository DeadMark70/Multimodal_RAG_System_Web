import { useEffect, useState, type FC, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import {
  beginIntentionalSignOut,
  cancelIntentionalSignOut,
  resetSessionExpiration,
  subscribeSessionExpired,
} from '../services/sessionRecovery';
import { saveSessionReturnPath } from '../services/sessionReturnPath';
import { AuthContext } from './auth-context';

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryActive, setRecoveryActive] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error("Auth session error:", error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        window.history.replaceState(window.history.state, '', '/reset-password');
      }

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryActive(true);
      }

      if (event === 'SIGNED_OUT') {
        setRecoveryActive(false);
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        resetSessionExpiration();
        setSessionExpired(false);
      }
    });

    const unsubscribeSessionExpired = subscribeSessionExpired(() => {
      if (window.location.pathname !== '/login') {
        saveSessionReturnPath(
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        );
      }
      setSessionExpired(true);
      setSession(null);
      setUser(null);
      setRecoveryActive(false);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeSessionExpired();
    };
  }, []);

  const signOut = async () => {
    setSessionExpired(false);
    resetSessionExpiration();
    beginIntentionalSignOut();

    try {
      const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
      if (globalError) {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) {
          throw localError;
        }
      }

      setSession(null);
      setUser(null);
      setRecoveryActive(false);
    } catch (error) {
      cancelIntentionalSignOut();
      throw error;
    }
  };

  const acknowledgeSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        recoveryActive,
        sessionExpired,
        acknowledgeSessionExpired,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
