import { describe, it, expect } from 'vitest';
import theme from './index';

describe('Theme Engine', () => {
  it('should include the new glass color tokens', () => {
    const colors = theme.colors as { glass: Record<string, string> };

    // We expect a new 'glass' color object for handling glassmorphism opacities
    expect(colors).toHaveProperty('glass');
    expect(colors.glass).toHaveProperty('100');
    expect(colors.glass).toHaveProperty('200');
    expect(colors.glass).toHaveProperty('300'); // Border color
    expect(colors.glass).toHaveProperty('400'); // Text color
  });

  it('should have updated typography settings', () => {
    const fonts = theme.fonts as { heading: string; body: string };

    // We want to ensure specific font weights are available
    expect(fonts.heading).toContain('Manrope');
    expect(fonts.body).toContain('Noto Sans TC');
  });
});
