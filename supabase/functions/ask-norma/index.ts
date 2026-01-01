import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { message, condominioId, userId, conversationHistory }: AskNormaRequest = await req.json();

    if (!message || !condominioId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Groq API key
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not configured');
      // Fallback to mock response for development
      return new Response(JSON.stringify({
        response: 'Olá! Sou Norma, sua assistente de governança condominial. No momento, estou em modo de desenvolvimento e retornarei uma resposta simulada.',
        sources: [],
        suggestions: ['Verificar regimento interno', 'Agendar assembleia', 'Consultar síndico']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate embedding for the user message
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: message,
        model: 'text-embedding-3-small',
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('Failed to generate embedding:', await embeddingResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to process message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for relevant document chunks
    const { data: relevantChunks, error: searchError } = await supabase.rpc('search_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      condominio_id: condominioId,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      // Continue without context if search fails
    }

    // Build context from relevant chunks
    let contextText = '';
    const sources: Array<{ type: string; name: string; content: string }> = [];

    if (relevantChunks && relevantChunks.length > 0) {
      contextText = relevantChunks
        .map((chunk: DocumentChunk) => {
          sources.push({
            type: chunk.metadata.document_type,
            name: chunk.metadata.document_name,
            content: chunk.content,
          });
          return `Documento: ${chunk.metadata.document_name} (${chunk.metadata.document_type})
Página: ${chunk.metadata.page_number || 'N/A'}
Conteúdo: ${chunk.content}`;
        })
        .join('\n\n');
    }

    // Build conversation history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Norma'}: ${msg.content}`)
        .join('\n');
    }

    // Prepare messages for Groq API
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + (contextText ? `\n\nContexto dos documentos do condomínio:\n${contextText}` : ''),
      },
      ...(conversationContext ? [{
        role: 'system' as const,
        content: `Histórico da conversa:\n${conversationContext}`,
      }] : []),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Groq API with streaming
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
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
      console.error('Groq API error:', await groqResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle streaming response with SSE
    const reader = groqResponse.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'Failed to read response stream' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in ask-norma function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function generateSuggestions(response: string, sources: Array<{ type: string; name: string; content: string }>): string[] {
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

  if (lowerResponse.includes('financeiro') || lowerResponse.includes('taxa') || lowerResponse.includes('multa')) {
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
