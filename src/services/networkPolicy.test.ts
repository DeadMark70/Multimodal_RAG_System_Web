import { describe, expect, it } from 'vitest';
import {
  assertAllowedApiTarget,
  isAllowedLocalTarget,
  isTestLikeMode,
  resolveApiUrl,
} from './networkPolicy';

describe('networkPolicy', () => {
  it('treats localhost targets as allowed', () => {
    expect(isAllowedLocalTarget('http://127.0.0.1:8000/ping')).toBe(true);
    expect(isAllowedLocalTarget('http://localhost:5173/api')).toBe(true);
  });

  it('rejects non-local targets', () => {
    expect(isAllowedLocalTarget('https://api.example.com/v1')).toBe(false);
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
});
