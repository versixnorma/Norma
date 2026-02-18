import { NextResponse } from 'next/server';
import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

const mockAdmin = {
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('@/lib/supabase', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({})),
}));

describe('api helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withAdminAuth', () => {
    it('retorna 401 sem usuario autenticado', async () => {
      const { withAdminAuth } = await import('@/lib/api-helpers');
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'no session' } });

      const handler = withAdminAuth(async () => NextResponse.json({ ok: true }));
      const response = await handler({} as any);
      expect(response.status).toBe(401);
    });

    it('retorna 403 para usuario sem role superadmin', async () => {
      const { withAdminAuth } = await import('@/lib/api-helpers');
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-1' } }, error: null });
      mockSingle.mockResolvedValueOnce({ data: { id: 'usr-1', role: 'morador' } });

      const handler = withAdminAuth(async () => NextResponse.json({ ok: true }));
      const response = await handler({} as any);
      expect(response.status).toBe(403);
    });

    it('injeta admin client no sucesso', async () => {
      const { withAdminAuth } = await import('@/lib/api-helpers');
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-1' } }, error: null });
      mockSingle.mockResolvedValueOnce({ data: { id: 'usr-1', role: 'superadmin' } });

      const wrapped = withAdminAuth(async ({ admin, usuario }) => {
        expect(admin).toBe(mockAdmin as any);
        expect(usuario.id).toBe('usr-1');
        return NextResponse.json({ ok: true });
      });

      const response = await wrapped({} as any);
      expect(response.status).toBe(200);
    });
  });

  describe('withValidation', () => {
    const schema = z.object({ nome: z.string().min(2) });

    it('retorna 400 para body invalido', async () => {
      const { withValidation } = await import('@/lib/api-helpers');
      const wrapped = withValidation(schema, async () => NextResponse.json({ ok: true }));
      const response = await wrapped({ json: async () => ({ nome: 'A' }) } as any);
      expect(response.status).toBe(400);
    });

    it('retorna 400 para body ausente', async () => {
      const { withValidation } = await import('@/lib/api-helpers');
      const wrapped = withValidation(schema, async () => NextResponse.json({ ok: true }));
      const response = await wrapped({ json: async () => { throw new Error('invalid'); } } as any);
      expect(response.status).toBe(400);
    });

    it('executa handler para body valido', async () => {
      const { withValidation } = await import('@/lib/api-helpers');
      const wrapped = withValidation(schema, async (data) => NextResponse.json({ nome: data.nome }));
      const response = await wrapped({ json: async () => ({ nome: 'Maria' }) } as any);
      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.nome).toBe('Maria');
    });
  });
});
