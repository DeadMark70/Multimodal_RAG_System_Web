import { useEffect, useState, type FC, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthContext } from './auth-context';

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
    if (globalError) {
      const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
      if (localError) {
        throw localError;
      }
    }

    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
