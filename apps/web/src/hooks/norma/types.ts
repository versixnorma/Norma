export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: Array<{
    type: string;
    name: string;
    content: string;
  }>;
  suggestions?: string[];
  timestamp: Date;
  status: 'sending' | 'sent' | 'error' | 'streaming';
}

export interface UseNormaChatOptions {
  condominioId: string | null;
  userId: string | null;
}

export interface UseNormaChatReturn {
  messages: Message[];
  isTyping: boolean;
  error: Error | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  loadHistory: () => Promise<void>;
  stopStreaming?: () => void;
}
