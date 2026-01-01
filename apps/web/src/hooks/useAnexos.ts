'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { Anexo } from '@versix/shared';
import { useCallback, useState } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function useAnexos() {
  const supabase = getSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.';
    if (file.size > MAX_SIZE) return 'Arquivo muito grande. Máximo 10MB.';
    return null;
  };

  const uploadAnexo = useCallback(async (condominioId: string, modulo: 'comunicados' | 'ocorrencias' | 'chamados' | 'faq', file: File): Promise<Anexo | null> => {
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return null; }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${condominioId}/${modulo}/${timestamp}_${sanitizedName}`;

      const { data, error: uploadError } = await supabase.storage.from('anexos').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        // onUploadProgress não está disponível no supabase-js, mas mantemos a estrutura
      });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(data.path);

      setProgress(100);
      return {
        url: urlData.publicUrl,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        uploaded_at: new Date().toISOString()
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
      return null;
    } finally {
      setUploading(false);
    }
  }, [supabase]);

  const uploadMultiple = useCallback(async (condominioId: string, modulo: 'comunicados' | 'ocorrencias' | 'chamados' | 'faq', files: File[]): Promise<Anexo[]> => {
    const results: Anexo[] = [];
    for (const file of files) {
      const anexo = await uploadAnexo(condominioId, modulo, file);
      if (anexo) results.push(anexo);
    }
    return results;
  }, [uploadAnexo]);

  const deleteAnexo = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Extrair path da URL
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/anexos/')[1];
      if (!path) throw new Error('URL inválida');

      const { error: deleteError } = await supabase.storage.from('anexos').remove([path]);
      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir arquivo');
      return false;
    }
  }, [supabase]);

  return { uploading, error, progress, uploadAnexo, uploadMultiple, deleteAnexo, validateFile };
}

export type { Anexo };
