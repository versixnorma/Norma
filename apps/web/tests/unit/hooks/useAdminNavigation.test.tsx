import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('useAdminNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns navigation filtered by role and computes active item', async () => {
    mockUseAuth.mockReturnValue({
      profile: { condominio_atual: { role: 'admin_condo' }, role: 'admin_condo' },
      isSuperAdmin: false,
    });
    mockUsePathname.mockReturnValue('/admin/usuarios');

    const { useAdminNavigation } = await import('@/hooks/useAdminNavigation');
    const { result } = renderHook(() => useAdminNavigation());

    expect(result.current.navigation.length).toBeGreaterThan(0);
    // should include 'usuarios' item in navigation
    const hasUsuarios = result.current.navigation.some((section: any) =>
      section.items.some((it: any) => it.id === 'usuarios')
    );
    expect(hasUsuarios).toBeTruthy();

    // activeItem should correspond to usuarios
    expect(result.current.activeItem?.id).toBe('usuarios');
  });
});
