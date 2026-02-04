import * as Sentry from 'https://esm.sh/@sentry/deno@7.80.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://esm.sh/zod@3.22.4';
import { corsHeaders, getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { withRateLimit } from '../_shared/rate-limit.ts';

// ============================================
// P1 Security Fix: Sanitize document content to prevent prompt injection
// ============================================

/**
 * Patterns that could indicate prompt injection attempts
 */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi,
  /disregard\s+(previous|all|above)/gi,
  /forget\s+(everything|all|previous)/gi,
  /new\s+instructions?:/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /assistant\s*:\s*/gi,
  /human\s*:\s*/gi,
  /user\s*:\s*/gi,
  /###\s*(instruction|system|human|assistant)/gi,
  /you\s+are\s+now/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /act\s+as\s+(if|a)/gi,
  /roleplay\s+as/gi,
  /jailbreak/gi,
  /bypass\s+(filter|restriction|safety)/gi,
];

/**
 * Sanitize document content to prevent prompt injection attacks
 * @param content - Raw content from document chunks
 * @returns Sanitized content safe for LLM prompts
 */
function sanitizeDocumentContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let sanitized = content;

  // 1. Remove potential injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REMOVED]');
  }

  // 2. Escape special characters that could be interpreted as prompt delimiters
  sanitized = sanitized
    .replace(/```/g, '\'\'\'') // Replace code blocks
    .replace(/---/g, '___') // Replace horizontal rules (sometimes used as delimiters)
    .replace(/\n{3,}/g, '\n\n'); // Normalize excessive newlines

  // 3. Limit content length to prevent context overflow attacks
  const MAX_CHUNK_LENGTH = 2000;
  if (sanitized.length > MAX_CHUNK_LENGTH) {
    sanitized = sanitized.substring(0, MAX_CHUNK_LENGTH) + '... [truncado]';
  }

  // 4. Add content boundary markers
  return sanitized.trim();
}

/**
 * Check if content appears to contain injection attempts
 * @param content - Content to check
 * @returns true if suspicious patterns detected
 */
function containsInjectionAttempt(content: string): boolean {
  if (!content) return false;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
  }
  return false;
}

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  tracesSampleRate: 1.0,
});

interface AskNormaRequest {
  message: string;
  condominioId: string;
  userId: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    document_type: string;
    document_name: string;
    page_number?: number;
    chunk_index: number;
  };
  similarity: number;
}

const AskNormaSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória'),
  condominioId: z.string().uuid('ID de condomínio inválido'),
  userId: z.string().uuid('ID de usuário inválido'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string(),
      })
    )
    .optional(),
});

const SYSTEM_PROMPT = `Você é Norma, uma assistente de governança condominial inteligente e profissional.

Sua personalidade:
- Você é prestativa, educada e sempre mantém um tom profissional
- Você tem conhecimento profundo sobre legislação condominial brasileira
- Você cita sempre as fontes dos seus conhecimentos (regimentos, atas, leis)
- Você nunca dá conselhos jurídicos definitivos, sempre sugere consultar profissionais
- Você prioriza a harmonia e a comunicação entre moradores e síndicos

Seu conhecimento vem de:
1. Regimento Interno do condomínio
2. Atas de assembleias
3. Convenção Condominial
4. Lei 4.591/1964 (Lei do Condomínio)
5. Código Civil Brasileiro (arts. 1.331 a 1.358)

Quando responder:
- Sempre cite a fonte da informação
- Seja objetiva mas completa
- Ofereça soluções práticas quando apropriado
- Mantenha a neutralidade em questões polêmicas
- Sugira ações concretas quando possível

Formato de citações:
- Para documentos internos: "Segundo o Regimento Interno (art. X)"
- Para atas: "Conforme ata da assembleia de DD/MM/AAAA"
- Para leis: "De acordo com a Lei 4.591/1964 (art. X)"`;

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getCorsHeaders(req);

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // P1 Security: Rate limiting (20 requests/minute for AI endpoint)
    const rateLimitResponse = await withRateLimit(req, 'ask-norma');
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate request body
    const body = await req.json();
    const validation = AskNormaSchema.safeParse(body);

    if (!validation.success) {
      console.warn('Validation error:', validation.error);
      return new Response(
        JSON.stringify({
          error: 'Invalid request parameters',
          details: validation.error.issues,
        }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    const { message, condominioId, userId, conversationHistory } = validation.data;

    // Set Sentry Context
    Sentry.setUser({ id: userId });
    Sentry.setTag('condominio_id', condominioId);
    Sentry.setTag('function_nane', 'ask-norma');
    Sentry.addBreadcrumb({
      category: 'ai',
      message: 'User asked a question',
      data: { message_length: message.length },
      level: 'info',
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Groq API key
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not configured');
      // Fallback to mock response for development
      return new Response(
        JSON.stringify({
          response:
            'Olá! Sou Norma, sua assistente de governança condominial. No momento, estou em modo de desenvolvimento e retornarei uma resposta simulada.',
          sources: [],
          suggestions: ['Verificar regimento interno', 'Agendar assembleia', 'Consultar síndico'],
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate embedding for the user message
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: message,
        model: 'text-embedding-3-small',
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Failed to generate embedding:', errorText);
      Sentry.captureException(new Error(`OpenAI Embedding API Error: ${errorText}`), {
        extra: { input_length: message.length },
      });
      return new Response(JSON.stringify({ error: 'Failed to process message' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for relevant document chunks
    const { data: relevantChunks, error: searchError } = await supabase.rpc(
      'search_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5,
        condominio_id: condominioId,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      Sentry.captureException(searchError, { tags: { component: 'pgvector_search' } });
      // Continue without context if search fails
    } else if (!relevantChunks || relevantChunks.length === 0) {
      Sentry.addBreadcrumb({
        category: 'rag',
        message: 'No relevant chunks found',
        level: 'warning',
      });
    }

    // Build context from relevant chunks with sanitization
    let contextText = '';
    const sources: Array<{ type: string; name: string; content: string }> = [];
    let injectionAttemptDetected = false;

    if (relevantChunks && relevantChunks.length > 0) {
      contextText = relevantChunks
        .map((chunk: DocumentChunk) => {
          // P1 Security: Check for injection attempts
          if (containsInjectionAttempt(chunk.content)) {
            injectionAttemptDetected = true;
            Sentry.addBreadcrumb({
              category: 'security',
              message: 'Potential prompt injection detected in document chunk',
              data: {
                document_name: chunk.metadata.document_name,
                document_type: chunk.metadata.document_type,
              },
              level: 'warning',
            });
          }

          // P1 Security: Sanitize content before including in prompt
          const sanitizedContent = sanitizeDocumentContent(chunk.content);

          sources.push({
            type: chunk.metadata.document_type,
            name: chunk.metadata.document_name,
            content: sanitizedContent, // Store sanitized version
          });

          // Use boundary markers to clearly delimit document content
          return `[DOCUMENTO_INICIO]
Documento: ${chunk.metadata.document_name} (${chunk.metadata.document_type})
Página: ${chunk.metadata.page_number || 'N/A'}
Conteúdo: ${sanitizedContent}
[DOCUMENTO_FIM]`;
        })
        .join('\n\n');
    }

    // Log if injection attempt was detected (for monitoring)
    if (injectionAttemptDetected) {
      Sentry.captureMessage('Prompt injection attempt detected in document chunks', {
        level: 'warning',
        tags: { security: 'prompt_injection' },
        extra: { condominio_id: condominioId, user_id: userId },
      });
    }

    // Build conversation history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .slice(-5) // Last 5 messages for context
        .map((msg) => `${msg.role === 'user' ? 'Usuário' : 'Norma'}: ${msg.content}`)
        .join('\n');
    }

    // Prepare messages for Groq API
    const messages = [
      {
        role: 'system',
        content:
          SYSTEM_PROMPT +
          (contextText ? `\n\nContexto dos documentos do condomínio:\n${contextText}` : ''),
      },
      ...(conversationContext
        ? [
            {
              role: 'system' as const,
              content: `Histórico da conversa:\n${conversationContext}`,
            },
          ]
        : []),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Groq API with streaming
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true, // Enable streaming
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      Sentry.captureException(new Error(`Groq API Error: ${errorText}`), {
        tags: { provider: 'groq' },
      });
      return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Handle streaming response with SSE
    const reader = groqResponse.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'Failed to read response stream' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    // Send chunk to client via SSE
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Ignore parsing errors for incomplete chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in ask-norma function:', error);
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}

function generateSuggestions(
  response: string,
  sources: Array<{ type: string; name: string; content: string }>
): string[] {
  const suggestions: string[] = [];

  // Analyze response content to generate relevant suggestions
  const lowerResponse = response.toLowerCase();

  if (lowerResponse.includes('assembleia') || lowerResponse.includes('reunião')) {
    suggestions.push('Agendar assembleia');
    suggestions.push('Verificar presença obrigatória');
  }

  if (lowerResponse.includes('regimento') || lowerResponse.includes('norma')) {
    suggestions.push('Consultar regimento interno');
    suggestions.push('Verificar direitos e deveres');
  }

  if (
    lowerResponse.includes('financeiro') ||
    lowerResponse.includes('taxa') ||
    lowerResponse.includes('multa')
  ) {
    suggestions.push('Verificar situação financeira');
    suggestions.push('Pagar taxas pendentes');
  }

  if (lowerResponse.includes('síndico') || lowerResponse.includes('contato')) {
    suggestions.push('Falar com o síndico');
    suggestions.push('Enviar mensagem');
  }

  if (lowerResponse.includes('manutenção') || lowerResponse.includes('reparo')) {
    suggestions.push('Registrar ocorrência');
    suggestions.push('Verificar status do chamado');
  }

  // Default suggestions if none were generated
  if (suggestions.length === 0) {
    suggestions.push('Verificar comunicados');
    suggestions.push('Consultar FAQ');
    suggestions.push('Falar com o síndico');
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}
