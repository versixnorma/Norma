'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useContextualSuggestions } from '@/hooks/useContextualSuggestions';
import { useNormaChat, useNormaChatMock } from '@/hooks/useNormaChat';
import { logger } from '@/lib/logger';
import { useEffect, useRef, useState } from 'react';

interface NormaChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NormaChat({ isOpen, onClose }: NormaChatProps) {
  const { profile } = useAuthContext();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextualSuggestions = useContextualSuggestions();
  // Usar hook real ou mock dependendo do ambiente
  const realChat = useNormaChat({
    condominioId: profile?.condominio_atual?.id || null,
    userId: profile?.id || null,
  });
  const mockChat = useNormaChatMock();

  // Usar mock em dev se não houver condomínio configurado
  const chat = profile?.condominio_atual?.id ? realChat : mockChat;
  const { messages, isTyping, sendMessage, loadHistory, clearMessages, stopStreaming } = chat;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Carregar histórico ou mostrar mensagem inicial
      if (profile?.condominio_atual?.id) {
        loadHistory();
      }
    }
  }, [isOpen, messages.length, profile?.condominio_atual?.id, loadHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-bg-dark animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary to-blue-600 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-2xl">smart_toy</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">Norma AI</h3>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isTyping ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[10px] text-gray-500 font-medium">
                {isTyping ? 'Digitando...' : 'Online'} • {profile?.condominio_atual?.nome || 'Demo'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTyping && stopStreaming && (
            <button
              onClick={stopStreaming}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Parar resposta"
            >
              <span className="material-symbols-outlined text-red-500 text-xl">stop</span>
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Limpar conversa"
            >
              <span className="material-symbols-outlined text-gray-500 text-xl">delete</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">expand_more</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20">
        {/* Welcome message if empty */}
        {messages.length === 0 && !isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-2xl rounded-tl-none bg-white dark:bg-card-dark text-gray-700 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm leading-relaxed">
                Olá, {profile?.nome?.split(' ')[0] || 'visitante'}! 👋
              </p>
              <p className="text-sm leading-relaxed mt-2">
                Sou a <span className="font-bold text-secondary">Norma</span>, sua assistente virtual.
                Posso ajudar com dúvidas sobre o regimento, reservas, financeiro e muito mais!
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {contextualSuggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1.5 bg-secondary/10 text-secondary text-xs font-medium rounded-full hover:bg-secondary/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages list */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-primary text-white rounded-tr-none'
                  : `bg-white dark:bg-card-dark text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700 ${
                      msg.status === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''
                    }`
              }`}
            >
              {/* Message text with streaming effect */}
              <div className="whitespace-pre-wrap">
                {msg.text}
                {msg.status === 'streaming' && (
                  <span className="inline-block w-1 h-4 bg-secondary animate-pulse ml-1" />
                )}
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Fontes consultadas:</p>
                  {msg.sources.map((source, i) => (
                    <button
                      key={i}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      onClick={() => {
                        // Navegar para o documento fonte
                        logger.log('Fonte clicada:', source);
                        if (source.type === 'regimento' && 'id' in source && typeof source.id === 'string') {
                          window.open(`/documentos/regimento/${source.id}`, '_blank');
                        } else if (source.type === 'ata' && 'assembleia_id' in source && typeof source.assembleia_id === 'string') {
                          window.open(`/assembleias/${source.assembleia_id}`, '_blank');
                        } else if ('id' in source && typeof source.id === 'string') {
                          window.open(`/documentos/${source.id}`, '_blank');
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5 group-hover:scale-110 transition-transform">
                          {source.type === 'regimento' ? 'menu_book' : source.type === 'ata' ? 'article' : 'description'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">
                            {source.name}
                          </p>
                          <p className="text-[10px] text-gray-500 line-clamp-2">
                            {source.content}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Dynamic suggestions */}
              {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Sugestões:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(suggestion)}
                        className="px-2.5 py-1 bg-secondary/10 text-secondary text-[10px] font-medium rounded-full hover:bg-secondary/20 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-2 text-right">
                <span className={`text-[9px] ${msg.sender === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {msg.status === 'streaming' && ' • Digitando...'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-card-dark p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700 flex gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce animation-delay-100" />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce animation-delay-200" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-bg-dark flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua pergunta..."
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isTyping}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-3 bg-primary text-white rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  );
}
