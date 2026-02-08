import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  corsHeaders,
  handleCors,
  jsonResponse,
  errorResponse,
  serverErrorResponse,
} from '../_shared/cors.ts';

interface ProcessManualKnowledgeRequest {
  title: string;
  content: string;
  category: string;
  tags: string[];
  condominioId: string;
  userId: string;
}

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);

      if (lastPeriod > start && lastPeriod > lastNewline) {
        end = lastPeriod + 1;
      } else if (lastNewline > start) {
        end = lastNewline + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= 50) {
      chunks.push(chunk);
    }
    start = end - overlap;

    if (start >= text.length) break;
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate embedding: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, req);
  }

  try {
    const body: ProcessManualKnowledgeRequest = await req.json();
    const { title, content, category, tags, condominioId, userId } = body;

    if (!title || !content || !condominioId || !userId) {
      return errorResponse('Campos obrigatórios: title, content, condominioId, userId', 400, req);
    }

    if (content.length < 50) {
      return errorResponse('Conteúdo deve ter pelo menos 50 caracteres', 400, req);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        condominio_id: condominioId,
        name: title,
        type: category || 'manual',
        source_type: 'manual',
        category: category || null,
        tags: tags?.length > 0 ? tags : null,
        status: 'processing',
        created_by: userId,
      })
      .select()
      .single();

    if (docError || !document) {
      console.error('Error creating document:', docError);
      return serverErrorResponse('Falha ao criar documento', req);
    }

    try {
      // Chunk the content
      const textChunks = chunkText(content);

      // Process each chunk with embeddings
      const chunksToInsert: Array<{
        condominio_id: string;
        document_id: string;
        document_type: string;
        document_name: string;
        chunk_index: number;
        content: string;
        embedding: number[];
      }> = [];

      for (let i = 0; i < textChunks.length; i++) {
        try {
          const embedding = await generateEmbedding(textChunks[i]);
          chunksToInsert.push({
            condominio_id: condominioId,
            document_id: document.id,
            document_type: category || 'manual',
            document_name: title,
            chunk_index: i,
            content: textChunks[i],
            embedding,
          });
        } catch (embeddingError) {
          console.error(`Failed to generate embedding for chunk ${i}:`, embeddingError);
        }
      }

      // Insert chunks in batches
      const batchSize = 10;
      for (let i = 0; i < chunksToInsert.length; i += batchSize) {
        const batch = chunksToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from('document_chunks').insert(batch);
        if (insertError) {
          console.error('Error inserting chunk batch:', insertError);
          throw insertError;
        }
      }

      // Update document status to completed
      await supabase
        .from('documents')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', document.id);

      // Log training activity
      await supabase.from('norma_training_logs').insert({
        session_id: crypto.randomUUID(),
        operation_type: 'insert',
        document_id: document.id,
        user_id: userId,
        condominio_id: condominioId,
      });

      return jsonResponse(
        {
          success: true,
          documentId: document.id,
          chunksProcessed: chunksToInsert.length,
          message: `Conhecimento processado com sucesso. ${chunksToInsert.length} chunks criados.`,
        },
        200,
        req
      );
    } catch (processingError) {
      console.error('Error processing manual knowledge:', processingError);

      await supabase.from('documents').update({ status: 'failed' }).eq('id', document.id);

      return serverErrorResponse('Falha ao processar conhecimento', req);
    }
  } catch (error) {
    console.error('Error in process-manual-knowledge:', error);
    return serverErrorResponse('Erro interno do servidor', req);
  }
});
