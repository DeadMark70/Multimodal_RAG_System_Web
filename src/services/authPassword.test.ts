import { describe, expect, it } from 'vitest';
import { getPasswordAuthErrorMessage, validateNewPassword } from './authPassword';

describe('validateNewPassword', () => {
  it('requires at least 12 characters', () => {
    expect(validateNewPassword('short-pass', 'short-pass')).toBe('密碼長度至少需要 12 個字元。');
  });

  it('requires matching confirmation', () => {
    expect(validateNewPassword('strong-password-1', 'strong-password-2')).toBe('兩次輸入的密碼不一致。');
  });

  it('accepts a matching password of at least 12 characters', () => {
    expect(validateNewPassword('strong-password-1', 'strong-password-1')).toBeNull();
  });
});

describe('getPasswordAuthErrorMessage', () => {
  it('maps current-password failures without exposing raw provider text', () => {
    expect(getPasswordAuthErrorMessage({ code: 'invalid_credentials', message: 'internal detail' }, 'change'))
      .toBe('目前密碼不正確。');
  });

  it('maps rate limits to generic cooldown copy', () => {
    expect(getPasswordAuthErrorMessage({ status: 429, message: 'quota detail' }, 'recovery'))
      .toBe('嘗試次數過多，請稍後再試。');
  });

  it('does not return unknown provider messages', () => {
    expect(getPasswordAuthErrorMessage(new Error('sensitive provider detail'), 'change'))
      .toBe('更新密碼失敗，請稍後再試。');
  });
});
