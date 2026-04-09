import { describe, expect, it } from 'vitest';
import {
  assertAllowedApiTarget,
  isAllowedMarkdownTarget,
  isAllowedLocalTarget,
  isTrustedApiTarget,
  isTestLikeMode,
  resolveApiUrl,
  shouldAttachAuthorizationHeader,
} from './networkPolicy';

describe('networkPolicy', () => {
  it('treats localhost targets as allowed', () => {
    expect(isAllowedLocalTarget('http://127.0.0.1:8000/ping')).toBe(true);
    expect(isAllowedLocalTarget('http://localhost:5173/api')).toBe(true);
  });

  it('rejects non-local targets', () => {
    expect(isAllowedLocalTarget('https://api.example.com/v1')).toBe(false);
  });

  it('tracks trusted API targets via allowlist', () => {
    expect(isTrustedApiTarget('http://127.0.0.1:8000/ping')).toBe(true);
    expect(isTrustedApiTarget('https://api.example.com/v1')).toBe(false);
  });

  it('only allows auth header attachment on trusted targets', () => {
    expect(shouldAttachAuthorizationHeader('http://127.0.0.1:8000/ping')).toBe(true);
    expect(shouldAttachAuthorizationHeader('https://api.example.com/v1')).toBe(false);
  });

  it('filters markdown targets to trusted hosts', () => {
    expect(isAllowedMarkdownTarget('/uploads/demo.png')).toBe(true);
    expect(isAllowedMarkdownTarget('https://api.example.com/tracker.png')).toBe(false);
  });

  it('resolves API urls safely', () => {
    expect(resolveApiUrl('http://127.0.0.1:8000', '/rag/ask')).toBe(
      'http://127.0.0.1:8000/rag/ask'
    );
  });

  it('resolves root-relative base url to current origin', () => {
    expect(resolveApiUrl('/', '/rag/execute/stream')).toBe(
      `${window.location.origin}/rag/execute/stream`
    );
  });

  it('blocks external target in test-like mode', () => {
    expect(isTestLikeMode()).toBe(true);
    expect(() => assertAllowedApiTarget('https://api.example.com/v1')).toThrow(
      '測試/模擬模式禁止呼叫非本機 API'
    );
  });

  it('blocks untrusted protocol even when hostname is local', () => {
    expect(() => assertAllowedApiTarget('ftp://localhost:8000/data')).toThrow(
      'API 目標不在允許清單，已阻擋請求'
    );
  });
});
