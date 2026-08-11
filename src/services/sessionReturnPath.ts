const RETURN_PATH_KEY = 'rag.session.return-path.v1';

function normalizeInternalPath(path: string): string | null {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(path, window.location.origin);
    const canonicalPathname = parsed.pathname.replace(/\/+$/, '') || '/';
    if (
      parsed.origin !== window.location.origin ||
      canonicalPathname === '/login'
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function saveSessionReturnPath(path: string): void {
  const normalized = normalizeInternalPath(path);
  if (normalized) {
    sessionStorage.setItem(RETURN_PATH_KEY, normalized);
    return;
  }

  sessionStorage.removeItem(RETURN_PATH_KEY);
}

export function consumeSessionReturnPath(): string | null {
  const stored = sessionStorage.getItem(RETURN_PATH_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
  return stored === null ? null : normalizeInternalPath(stored);
}
