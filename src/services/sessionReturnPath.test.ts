import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeSessionReturnPath,
  saveSessionReturnPath,
} from './sessionReturnPath';

describe('session return path', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it.each([
    ['https://evil.example', null],
    ['//evil.example/path', null],
    ['/login', null],
    ['/login/', null],
    ['/login/?reason=expired', null],
    ['/chat?mode=rag#source', '/chat?mode=rag#source'],
  ])('stores only safe internal routes: %s', (candidate, expected) => {
    saveSessionReturnPath(candidate);

    expect(consumeSessionReturnPath()).toBe(expected);
    expect(consumeSessionReturnPath()).toBeNull();
  });

  it('removes an unsafe value already present in storage', () => {
    sessionStorage.setItem('rag.session.return-path.v1', 'https://evil.example');

    expect(consumeSessionReturnPath()).toBeNull();
    expect(sessionStorage.getItem('rag.session.return-path.v1')).toBeNull();
  });
});
