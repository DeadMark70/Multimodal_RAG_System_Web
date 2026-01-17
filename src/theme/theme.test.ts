import { describe, it, expect } from 'vitest';
import theme from './index';

describe('Theme Engine', () => {
  it('should include the new glass color tokens', () => {
    // We expect a new 'glass' color object for handling glassmorphism opacities
    expect(theme.colors).toHaveProperty('glass');
    expect(theme.colors.glass).toHaveProperty('100');
    expect(theme.colors.glass).toHaveProperty('200');
    expect(theme.colors.glass).toHaveProperty('300'); // Border color
    expect(theme.colors.glass).toHaveProperty('400'); // Text color
  });

  it('should have updated typography settings', () => {
    // We want to ensure specific font weights are available
    expect(theme.fonts.heading).toBe('DM Sans, sans-serif');
    expect(theme.fonts.body).toContain('DM Sans');
  });
});
