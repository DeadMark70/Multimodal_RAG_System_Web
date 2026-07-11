export const MIN_PASSWORD_LENGTH = 12;

type PasswordOperation = 'change' | 'recovery';

type AuthErrorShape = {
  code?: unknown;
  status?: unknown;
};

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `密碼長度至少需要 ${MIN_PASSWORD_LENGTH} 個字元。`;
  }

  if (password !== confirmation) {
    return '兩次輸入的密碼不一致。';
  }

  return null;
}

export function getPasswordAuthErrorMessage(error: unknown, operation: PasswordOperation): string {
  const shape = typeof error === 'object' && error !== null ? error as AuthErrorShape : {};

  if (shape.status === 429 || shape.code === 'over_request_rate_limit') {
    return '嘗試次數過多，請稍後再試。';
  }

  if (shape.code === 'weak_password') {
    return '新密碼不符合安全要求，請改用較長且未曾洩漏的密碼。';
  }

  if (operation === 'change' && shape.code === 'same_password') {
    return '新密碼不可與目前密碼相同。';
  }

  if (operation === 'change' && shape.code === 'invalid_credentials') {
    return '目前密碼不正確。';
  }

  return operation === 'change'
    ? '更新密碼失敗，請稍後再試。'
    : '重設密碼失敗，請重新申請重設連結。';
}
