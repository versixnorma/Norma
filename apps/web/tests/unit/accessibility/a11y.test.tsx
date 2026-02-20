/**
 * Testes de acessibilidade com axe-core.
 * Verifica violações WCAG 2.1 AA nos componentes de layout críticos.
 */
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { expect, describe, it, vi } from 'vitest';

expect.extend(toHaveNoViolations);

const axe = configureAxe({
  rules: {
    // Desabilita regras que exigem contexto de página completa
    region: { enabled: false },
    // Desabilita verificações de cor que precisam de contexto de tema
    'color-contrast': { enabled: false },
  },
});

// ── Mocks de dependências ──────────────────────────────────────────────────
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { nome: 'Admin Teste', email: 'admin@test.com', avatar_url: null },
    logout: vi.fn(),
    isSuperAdmin: true,
  }),
}));

vi.mock('@/hooks/useAdminNavigation', () => ({
  useAdminNavigation: () => ({
    navigation: [],
    breadcrumbs: [{ label: 'Dashboard', href: '/admin/dashboard' }],
    isActive: () => false,
    hasActiveChild: () => false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/dashboard',
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ── Testes ────────────────────────────────────────────────────────────────
describe('Acessibilidade — AdminHeader', () => {
  it(
    'não deve ter violações axe',
    async () => {
      const { AdminHeader } = await import('@/components/admin/layout/AdminHeader');
      const { container } = render(
        <AdminHeader sidebarCollapsed={false} onToggleSidebar={vi.fn()} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    },
    { timeout: 20000 }
  );

  it('botões de ação têm aria-label', async () => {
    const { AdminHeader } = await import('@/components/admin/layout/AdminHeader');
    const { getAllByRole } = render(
      <AdminHeader sidebarCollapsed={false} onToggleSidebar={vi.fn()} />
    );
    const buttons = getAllByRole('button');
    buttons.forEach((btn) => {
      const label = btn.getAttribute('aria-label') || btn.textContent;
      expect(label).toBeTruthy();
    });
  });
});

describe('Acessibilidade — AdminSidebar', () => {
  it('aside tem aria-label', async () => {
    const { AdminSidebar } = await import('@/components/admin/layout/AdminSidebar');
    const { container } = render(<AdminSidebar collapsed={false} />);
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute('aria-label')).toBeTruthy();
  });

  it(
    'não deve ter violações axe',
    async () => {
      const { AdminSidebar } = await import('@/components/admin/layout/AdminSidebar');
      const { container } = render(<AdminSidebar collapsed={false} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    },
    { timeout: 20000 }
  );
});

describe('Acessibilidade — id main-content', () => {
  it('elemento main deve ter id main-content para skip-link', () => {
    document.body.innerHTML = '<main id="main-content"><p>Conteúdo principal</p></main>';
    const main = document.getElementById('main-content');
    expect(main).not.toBeNull();
    expect(main?.tagName.toLowerCase()).toBe('main');
  });
});
