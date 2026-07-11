import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn(() => ({}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('Supabase auth configuration', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.resetModules();
  });

  it('intentionally persists and refreshes browser sessions', async () => {
    await import('./supabase');

    expect(createClientMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    );
  });
});
