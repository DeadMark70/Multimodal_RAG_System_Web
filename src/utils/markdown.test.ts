import { describe, expect, it } from 'vitest';

import { normalizeMarkdown } from './markdown';

describe('normalizeMarkdown', () => {
  it('normalizes CRLF and CR line endings to LF', () => {
    expect(normalizeMarkdown('alpha\r\nbeta\rgamma')).toBe('alpha\nbeta\ngamma');
  });

  it('inserts a blank line before top-level lists after paragraph text', () => {
    expect(normalizeMarkdown('Intro line\n* item one\n* item two')).toBe(
      'Intro line\n\n* item one\n* item two',
    );
  });

  it('does not mutate fenced code blocks', () => {
    expect(normalizeMarkdown('Intro\n```md\n* keep literal\n```\n* real item')).toBe(
      'Intro\n```md\n* keep literal\n```\n\n* real item',
    );
  });

  it('preserves nested list indentation', () => {
    expect(normalizeMarkdown('* parent\n  * child\n  1. nested ordered')).toBe(
      '* parent\n  * child\n  1. nested ordered',
    );
  });
});
