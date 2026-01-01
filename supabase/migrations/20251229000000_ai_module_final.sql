-- Enable pgvector extension for AI functionality
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table for storing uploaded documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condominio_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'doc', 'docx', 'txt')),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_chunks table for vector search
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    page_number INTEGER,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create norma_chat_logs table for conversation history
CREATE TABLE IF NOT EXISTS public.norma_chat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condominio_id UUID NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_condominio ON public.documents(condominio_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_type ON public.document_chunks(document_type);
CREATE INDEX IF NOT EXISTS idx_norma_chat_logs_condominio ON public.norma_chat_logs(condominio_id);
CREATE INDEX IF NOT EXISTS idx_norma_chat_logs_user ON public.norma_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_norma_chat_logs_created_at ON public.norma_chat_logs(created_at);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION public.search_document_chunks(
    query_embedding vector(1536),
    condominio_id UUID,
    match_threshold float DEFAULT 0.1,
    match_count int DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    document_id UUID,
    document_type TEXT,
    document_name TEXT,
    page_number INTEGER,
    chunk_index INTEGER,
    content TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.document_type,
        dc.document_name,
        dc.page_number,
        dc.chunk_index,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    JOIN public.documents d ON dc.document_id = d.id
    WHERE d.condominio_id = search_document_chunks.condominio_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Enable RLS on AI tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norma_chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "documents_condominio_access" ON public.documents
FOR ALL USING (
    condominio_id IN (
        SELECT uc.condominio_id
        FROM public.usuario_condominios uc
        WHERE uc.usuario_id = auth.uid()
        AND uc.status = 'active'
    )
);

-- RLS Policies for document_chunks (inherits from documents)
CREATE POLICY "document_chunks_condominio_access" ON public.document_chunks
FOR ALL USING (
    document_id IN (
        SELECT d.id
        FROM public.documents d
        WHERE d.condominio_id IN (
            SELECT uc.condominio_id
            FROM public.usuario_condominios uc
            WHERE uc.usuario_id = auth.uid()
            AND uc.status = 'active'
        )
    )
);

-- RLS Policies for norma_chat_logs
CREATE POLICY "norma_chat_logs_condominio_access" ON public.norma_chat_logs
FOR ALL USING (
    condominio_id IN (
        SELECT uc.condominio_id
        FROM public.usuario_condominios uc
        WHERE uc.usuario_id = auth.uid()
        AND uc.status = 'active'
    )
);

-- Update trigger for documents
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
