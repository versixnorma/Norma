import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase admin client
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockFromSelect = vi.fn();
const mockFromInsert = vi.fn();
const mockFromUpsert = vi.fn();

const buildQuery = (data: unknown = null, error: unknown = null) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(() => ({ data, error })),
      single: vi.fn(() => ({ data, error })),
    })),
  })),
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => ({ data, error })),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => ({ data, error })),
  })),
});

const mockAdmin = {
  auth: {
    admin: {
      createUser: mockCreateUser,
      deleteUser: mockDeleteUser,
    },
  },
  from: vi.fn(() => buildQuery()),
};

vi.mock('@/lib/supabase', () => ({
  createAdminClient: () => mockAdmin,
}));

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = {
  nome: 'Test User',
  email: 'test@test.com',
  password: 'Password1!',
  condominio_id: '00000000-0000-0000-0000-000000000001',
  unidade_id: '00000000-0000-0000-0000-000000000002',
  cpf: '12345678901',
  data_nascimento: '1990-01-01',
};

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejeita senha menor que 8 caracteres', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ ...validBody, password: '123' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error || body.details).toBeTruthy();
  });

  it('rejeita senha sem maiúscula', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ ...validBody, password: 'password1!' });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('rejeita senha sem número', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ ...validBody, password: 'Password!' });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('rejeita senha sem caractere especial', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ ...validBody, password: 'Password1' });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('rejeita CPF com menos de 11 dígitos', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ ...validBody, cpf: '123' });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('rejeita email inválido', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ ...validBody, email: 'not-an-email' });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('rejeita campos obrigatórios ausentes', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest({ nome: 'Test' });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('retorna 409 para email duplicado', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already been registered' },
    });

    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest(validBody);
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('já está cadastrado');
  });

  it('cria conta com sucesso quando dados são válidos', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'new-auth-id' } },
      error: null,
    });

    // Mock all table operations (usuarios, usuario_condominios)
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => ({ data: null, error: null })),
      single: vi.fn(() => ({ data: { id: 'new-user-id' }, error: null })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockAdmin.from.mockReturnValue(chainable);

    const { POST } = await import('@/app/api/auth/signup/route');

    const req = makeRequest(validBody);
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledOnce();
  });

  it('retorna 400 para request body inválido', async () => {
    const { POST } = await import('@/app/api/auth/signup/route');

    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: 'not json',
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
  });
});
