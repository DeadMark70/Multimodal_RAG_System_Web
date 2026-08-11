import { supabase } from './supabase';

type SessionExpiredListener = () => void;

let refreshPromise: Promise<string | null> | null = null;
let expirationPromise: Promise<void> | null = null;
let expirationPublished = false;
let intentionalSignOut = false;
const listeners = new Set<SessionExpiredListener>();

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = supabase.auth
      .refreshSession()
      .then(({ data, error }) =>
        error ? null : data.session?.access_token ?? null
      )
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function publishSessionExpired(): Promise<void> {
  if (intentionalSignOut) {
    return Promise.resolve();
  }

  if (expirationPromise) {
    return expirationPromise;
  }

  if (expirationPublished) {
    return Promise.resolve();
  }

  expirationPublished = true;
  expirationPromise = (async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Session expiration still needs to reach subscribers if local cleanup fails.
    } finally {
      if (!intentionalSignOut) {
        listeners.forEach((listener) => listener());
      }
    }
  })();

  return expirationPromise;
}

export function subscribeSessionExpired(
  listener: SessionExpiredListener
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function beginIntentionalSignOut(): void {
  intentionalSignOut = true;
}

export function cancelIntentionalSignOut(): void {
  intentionalSignOut = false;
}

export function resetSessionExpiration(): void {
  expirationPromise = null;
  expirationPublished = false;
  intentionalSignOut = false;
}
