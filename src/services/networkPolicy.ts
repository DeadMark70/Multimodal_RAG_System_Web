/**
 * Network policy helpers for test/mock safety.
 */

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function isTrue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value).trim().toLowerCase() === 'true';
  }
  return false;
}

export function isTestLikeMode(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITEST === true ||
    isTrue(import.meta.env.VITE_TEST_MODE) ||
    isTrue(import.meta.env.VITE_MOCK_MODE)
  );
}

export function isAllowedLocalTarget(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl, 'http://127.0.0.1:8000');
    return LOCAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveApiUrl(baseUrl: string | undefined, path: string): string {
  const fallbackOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://127.0.0.1:8000';
  const trimmedBase = (baseUrl ?? '').trim();

  const normalizedBase = (() => {
    if (!trimmedBase) {
      return fallbackOrigin;
    }
    if (/^https?:\/\//i.test(trimmedBase)) {
      return trimmedBase;
    }
    const origin = fallbackOrigin.replace(/\/+$/, '');
    const suffix = trimmedBase.replace(/^\/+/, '');
    return suffix ? `${origin}/${suffix}` : `${origin}/`;
  })();

  try {
    return new URL(path, normalizedBase).toString();
  } catch {
    return path;
  }
}

export function assertAllowedApiTarget(targetUrl: string): void {
  if (isTestLikeMode() && !isAllowedLocalTarget(targetUrl)) {
    throw new Error('測試/模擬模式禁止呼叫非本機 API，請改用 mock provider');
  }
}
