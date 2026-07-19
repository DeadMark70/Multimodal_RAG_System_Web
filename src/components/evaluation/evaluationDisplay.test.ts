import { describe, expect, it } from 'vitest';
import { formatOptionalNumber, formatOptionalPercent, formatOptionalTokens } from './evaluationDisplay';

describe('evaluation display null policy', () => {
  it('renders missing metrics as N/A while preserving measured zero', () => {
    expect(formatOptionalNumber(null, 3)).toBe('N/A');
    expect(formatOptionalNumber(undefined, 3)).toBe('N/A');
    expect(formatOptionalNumber(0, 3)).toBe('0.000');
    expect(formatOptionalPercent(null)).toBe('N/A');
    expect(formatOptionalPercent(0)).toBe('0.0%');
    expect(formatOptionalTokens(null)).toBe('N/A');
    expect(formatOptionalTokens(0)).toBe('0');
  });
});
