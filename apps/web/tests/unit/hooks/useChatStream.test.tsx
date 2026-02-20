import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthGetSession = vi.fn();
const mockFromInsert = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: { getSession: mockAuthGetSession },
    from: () => ({ insert: mockFromInsert }),
  }),
}));

describe('useChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    mockFromInsert.mockResolvedValue({ data: null, error: null });
  });

  it('sendMessage streams chunks and updates messages', async () => {
    // prepare fetch mock with streaming reader
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: {"content":"Olá"}\n'),
      encoder.encode('data: {"content":" Mundo"}\n'),
      encoder.encode('data: [DONE]\n'),
    ];

    const reader = {
      read: vi.fn(async () => {
        const v = chunks.shift();
        if (!v) return { done: true, value: undefined };
        return { done: false, value: v };
      }),
      releaseLock: vi.fn(),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, body: { getReader: () => reader } }))
    );

    const setMessages = vi.fn();
    const initialMessages: any[] = [];

    const { useChatStream } = await import('@/hooks/norma/useChatStream');
    const { result } = renderHook(() =>
      useChatStream({
        condominioId: 'c1',
        userId: 'u1',
        messages: initialMessages,
        setMessages,
      })
    );

    await act(async () => {
      await result.current.sendMessage('Olá');
    });

    // setMessages should be called to add user and bot messages at least once
    expect(setMessages).toHaveBeenCalled();
    // ensure supabase insert was attempted when stream finished
    expect(mockFromInsert).toHaveBeenCalled();
  });
});
