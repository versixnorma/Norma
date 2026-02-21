import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks para rpc-overrides (deve vir antes dos imports do módulo)
const mockRpcContarNaoLidas = vi.fn().mockResolvedValue({ data: 3, error: null });
const mockRpcConfirmarLeitura = vi.fn().mockResolvedValue({ data: true, error: null });
const mockRpcMarcarTodasLidas = vi.fn().mockResolvedValue({ data: 5, error: null });
const mockRpcEnviarNotificacao = vi.fn().mockResolvedValue({ data: 'notif-id', error: null });
const mockQueryDashboard = vi.fn(() => ({
  order: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
}));

vi.mock('@versix/shared/rpc-overrides', () => ({
  rpcContarNaoLidas: mockRpcContarNaoLidas,
  rpcConfirmarLeitura: mockRpcConfirmarLeitura,
  rpcMarcarTodasLidas: mockRpcMarcarTodasLidas,
  rpcEnviarNotificacao: mockRpcEnviarNotificacao,
  queryNotificacoesDashboard: mockQueryDashboard,
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

const createBuilder = (data: any, error: any = null) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) => Promise.resolve(resolve({ data, error })),
  };
  return builder;
};

const mockFrom = vi.fn(() => createBuilder([]));
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } });
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const mockNotif = {
  notificacao_id: 'n-1',
  titulo: 'Aviso',
  corpo: 'Mensagem',
  status: 'nao_lido',
  lido_em: null,
};

describe('useNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createBuilder([mockNotif]));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockRpcContarNaoLidas.mockResolvedValue({ data: 3, error: null });
    mockRpcConfirmarLeitura.mockResolvedValue({ data: true, error: null });
    mockRpcMarcarTodasLidas.mockResolvedValue({ data: 5, error: null });
    mockRpcEnviarNotificacao.mockResolvedValue({ data: 'notif-id', error: null });
  });

  it('inicia com estado vazio', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());
    expect(result.current.notificacoes).toEqual([]);
    expect(result.current.naoLidas).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('fetchMinhasNotificacoes carrega notificações e conta não lidas', async () => {
    mockFrom.mockReturnValue(createBuilder([mockNotif]));
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    await act(async () => {
      await result.current.fetchMinhasNotificacoes();
    });

    expect(result.current.notificacoes).toHaveLength(1);
    expect(result.current.naoLidas).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('fetchMinhasNotificacoes trata erro', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { message: 'Falha' }));
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    await act(async () => {
      await result.current.fetchMinhasNotificacoes();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('fetchContagemNaoLidas retorna count via RPC', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    let count: number;
    await act(async () => {
      count = await result.current.fetchContagemNaoLidas();
    });

    expect(count!).toBe(3);
    expect(result.current.naoLidas).toBe(3);
  });

  it('fetchContagemNaoLidas retorna 0 sem userId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    let count: number;
    await act(async () => {
      count = await result.current.fetchContagemNaoLidas();
    });

    expect(count!).toBe(0);
  });

  it('marcarComoLida atualiza status local e decrementa naoLidas', async () => {
    mockFrom.mockReturnValue(createBuilder([mockNotif]));
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    await act(async () => {
      await result.current.fetchMinhasNotificacoes();
    });
    expect(result.current.naoLidas).toBe(1);

    await act(async () => {
      await result.current.marcarComoLida('n-1');
    });

    expect(result.current.notificacoes[0].status).toBe('lido');
    expect(result.current.naoLidas).toBe(0);
  });

  it('marcarTodasComoLidas zera contador', async () => {
    mockFrom.mockReturnValue(createBuilder([mockNotif]));
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    await act(async () => {
      await result.current.fetchMinhasNotificacoes();
    });

    let count: number;
    await act(async () => {
      count = await result.current.marcarTodasComoLidas();
    });

    expect(count!).toBe(5);
    expect(result.current.naoLidas).toBe(0);
  });

  it('enviarNotificacao chama RPC e retorna id', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    let id: string | null;
    await act(async () => {
      id = await result.current.enviarNotificacao('cond-1', {
        tipo: 'aviso',
        titulo: 'Aviso',
        corpo: 'Corpo',
        prioridade: 'normal',
      } as any);
    });

    expect(id!).toBe('notif-id');
  });

  it('subscribeToNotificacoes registra canal realtime', async () => {
    const { useNotificacoes } = await import('@/hooks/useNotificacoes');
    const { result } = renderHook(() => useNotificacoes());

    let unsub: (() => void) | undefined;
    act(() => {
      unsub = result.current.subscribeToNotificacoes('user-1', vi.fn());
    });

    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(typeof unsub!).toBe('function');
  });
});
