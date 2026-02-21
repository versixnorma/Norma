import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createBuilder = (data: any, error: any = null) => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) => Promise.resolve(resolve({ data, error })),
  };
  return builder;
};

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};
const mockRpc = vi.fn();
const mockFrom = vi.fn(() => createBuilder(null));
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } });
const mockRemoveChannel = vi.fn();
const mockSupabase = {
  from: mockFrom,
  rpc: mockRpc,
  auth: { getUser: mockGetUser },
  channel: vi.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
};

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mockSupabase }));

describe('useVotacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createBuilder(null));
    mockRpc.mockResolvedValue({ data: 'presenca-id', error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('inicia com loading false e sem erro', async () => {
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('registrarPresenca chama RPC e retorna id', async () => {
    mockRpc.mockResolvedValue({ data: 'presenca-123', error: null });
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let id: string | null;
    await act(async () => {
      id = await result.current.registrarPresenca('assembleia-1', 'online');
    });

    expect(id!).toBe('presenca-123');
    expect(result.current.loading).toBe(false);
  });

  it('registrarPresenca trata erro de RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Erro RPC' } });
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let id: string | null;
    await act(async () => {
      id = await result.current.registrarPresenca('assembleia-1');
    });

    expect(id!).toBeNull();
    // O hook usa `err instanceof Error` — objeto plain do Supabase cai em 'Erro desconhecido'
    expect(result.current.error).toBe('Erro desconhecido');
  });

  it('getMinhaPresenca retorna presença do usuário', async () => {
    const mockPresenca = { id: 'p-1', usuario_id: 'user-1', assembleia_id: 'a-1' };
    mockFrom.mockReturnValue(createBuilder(mockPresenca));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let presenca: any;
    await act(async () => {
      presenca = await result.current.getMinhaPresenca('a-1');
    });

    expect(presenca).toEqual(mockPresenca);
  });

  it('getMinhaPresenca retorna null para PGRST116 (not found)', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { code: 'PGRST116', message: 'not found' }));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let presenca: any;
    await act(async () => {
      presenca = await result.current.getMinhaPresenca('a-1');
    });

    expect(presenca).toBeNull();
    expect(result.current.error).toBeNull(); // PGRST116 não seta erro
  });

  it('iniciarVotacaoPauta chama RPC e retorna boolean', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let ok: boolean;
    await act(async () => {
      ok = await result.current.iniciarVotacaoPauta('pauta-1');
    });

    expect(ok!).toBe(true);
  });

  it('votar chama RPC e retorna id do voto', async () => {
    mockRpc.mockResolvedValue({ data: 'voto-1', error: null });
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let votoId: string | null;
    await act(async () => {
      votoId = await result.current.votar({
        pauta_id: 'pauta-1',
        presenca_id: 'presenca-1',
        voto: 'sim',
      });
    });

    expect(votoId!).toBe('voto-1');
  });

  it('jaVotou retorna true quando voto existe', async () => {
    mockFrom.mockReturnValue(createBuilder({ id: 'voto-1' }));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let votou: boolean;
    await act(async () => {
      votou = await result.current.jaVotou('pauta-1', 'presenca-1');
    });

    expect(votou!).toBe(true);
  });

  it('jaVotou retorna false quando não há voto', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { code: 'PGRST116' }));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let votou: boolean;
    await act(async () => {
      votou = await result.current.jaVotou('pauta-1', 'presenca-1');
    });

    expect(votou!).toBe(false);
  });

  it('encerrarPauta chama RPC e retorna resultado', async () => {
    mockRpc.mockResolvedValue({ data: { votos_sim: 5 }, error: null });
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let res: any;
    await act(async () => {
      res = await result.current.encerrarPauta('pauta-1');
    });

    expect(res).toEqual({ votos_sim: 5 });
  });

  it('getResultadoPauta retorna dados da pauta', async () => {
    const mockResultado = { pauta_id: 'p-1', votos_sim: 3, votos_nao: 1 };
    mockFrom.mockReturnValue(createBuilder(mockResultado));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let res: any;
    await act(async () => {
      res = await result.current.getResultadoPauta('p-1');
    });

    expect(res).toEqual(mockResultado);
  });

  it('fetchComentarios retorna lista de comentários', async () => {
    const mockComents = [{ id: 'c-1', texto: 'Bom dia', visivel: true }];
    mockFrom.mockReturnValue(createBuilder(mockComents));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let comments: any[];
    await act(async () => {
      comments = await result.current.fetchComentarios('pauta-1');
    });

    expect(comments!).toHaveLength(1);
  });

  it('addComentario insere e retorna comentário', async () => {
    const mockComment = { id: 'c-2', texto: 'Novo', usuario_id: 'user-1' };
    mockFrom.mockReturnValue(createBuilder(mockComment));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let comment: any;
    await act(async () => {
      comment = await result.current.addComentario({ pauta_id: 'p-1', texto: 'Novo' } as any);
    });

    expect(comment!.id).toBe('c-2');
  });

  it('moderarComentario atualiza visibilidade', async () => {
    mockFrom.mockReturnValue(createBuilder(null));
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let ok: boolean;
    await act(async () => {
      ok = await result.current.moderarComentario('c-1', false, 'Spam');
    });

    expect(ok!).toBe(true);
  });

  it('subscribeToVotos registra canal realtime e retorna unsubscribe', async () => {
    const { useVotacao } = await import('@/hooks/useVotacao');
    const { result } = renderHook(() => useVotacao());

    let unsub: (() => void) | undefined;
    act(() => {
      unsub = result.current.subscribeToVotos('pauta-1', vi.fn());
    });

    expect(mockChannel.on).toHaveBeenCalled();
    expect(typeof unsub!).toBe('function');
  });
});
