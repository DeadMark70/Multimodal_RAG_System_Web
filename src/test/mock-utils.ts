import { vi } from 'vitest';

type TestFunction = (...args: never[]) => unknown;

export function asMock<T extends TestFunction>(fn: T) {
  return vi.mocked(fn);
}
