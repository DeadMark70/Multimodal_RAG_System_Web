/**
 * Network policy helpers for test/mock safety.
 */

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const FALLBACK_ORIGIN = 'http://127.0.0.1:8000';

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

function getWindowOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function parseCommaSeparatedHosts(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((item) => normalizeHost(item))
    .filter((item) => item.length > 0);
}

function parseHostname(rawUrl: string): string | null {
  try {
    return normalizeHost(new URL(rawUrl, getWindowOrigin()).hostname);
  } catch {
    return null;
  }
}

function buildTrustedApiHosts(): Set<string> {
  const hosts = new Set<string>(LOCAL_HOSTS);
  const currentHost = parseHostname(getWindowOrigin());
  if (currentHost) {
    hosts.add(currentHost);
  }

  const configuredApiHost = parseHostname(import.meta.env.VITE_API_BASE_URL ?? '');
  if (configuredApiHost) {
    hosts.add(configuredApiHost);
  }

  for (const host of parseCommaSeparatedHosts(import.meta.env.VITE_TRUSTED_API_HOSTS)) {
    hosts.add(host);
  }

  return hosts;
}

function buildTrustedMarkdownHosts(): Set<string> {
  const hosts = buildTrustedApiHosts();
  for (const host of parseCommaSeparatedHosts(import.meta.env.VITE_TRUSTED_MARKDOWN_HOSTS)) {
    hosts.add(host);
  }
  return hosts;
}

function isHttpProtocol(targetUrl: string): boolean {
  try {
    const protocol = new URL(targetUrl, getWindowOrigin()).protocol.toLowerCase();
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
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
  const hostname = parseHostname(targetUrl);
  if (!hostname) {
    return false;
  }
  return LOCAL_HOSTS.has(hostname);
}

export function isTrustedApiTarget(targetUrl: string): boolean {
  if (!isHttpProtocol(targetUrl)) {
    return false;
  }

  const hostname = parseHostname(targetUrl);
  if (!hostname) {
    return false;
  }

  return buildTrustedApiHosts().has(hostname);
}

export function shouldAttachAuthorizationHeader(targetUrl: string): boolean {
  if (!isTrustedApiTarget(targetUrl)) {
    return false;
  }

  if (isTestLikeMode()) {
    return isAllowedLocalTarget(targetUrl);
  }

  return true;
}

export function isAllowedMarkdownTarget(targetUrl: string): boolean {
  if (!isHttpProtocol(targetUrl)) {
    return false;
  }

  const hostname = parseHostname(targetUrl);
  if (!hostname) {
    return false;
  }

  return buildTrustedMarkdownHosts().has(hostname);
}

export function resolveApiUrl(baseUrl: string | undefined, path: string): string {
  const fallbackOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : FALLBACK_ORIGIN;
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

  if (!isTrustedApiTarget(targetUrl)) {
    throw new Error('API 目標不在允許清單，已阻擋請求');
  }
}
