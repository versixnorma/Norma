'use client';

import { useAnexos } from '@/hooks/useAnexos';
import type {
  Anexo,
  ComunicadoCategoria,
  ComunicadoComJoins,
  ComunicadoStatus,
  CreateComunicadoInput,
} from '@versix/shared';
import { useState } from 'react';
import { toast } from 'sonner';

interface ComunicadoFormProps {
  comunicado?: ComunicadoComJoins;
  condominioId: string;
  onSubmit: (data: CreateComunicadoInput) => Promise<boolean>;
  onCancel: () => void;
}

const CATEGORIAS: { value: ComunicadoCategoria; label: string }[] = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'geral', label: 'Geral' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'assembleia', label: 'Assembleia' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'evento', label: 'Evento' },
  { value: 'obras', label: 'Obras' },
];

const normalizeAnexos = (value: unknown): Anexo[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (anexo): anexo is Anexo =>
      !!anexo &&
      typeof anexo === 'object' &&
      typeof (anexo as Anexo).url === 'string' &&
      typeof (anexo as Anexo).nome === 'string' &&
      typeof (anexo as Anexo).tipo === 'string' &&
      typeof (anexo as Anexo).tamanho === 'number'
  );
};

export function ComunicadoForm({
  comunicado,
  condominioId,
  onSubmit,
  onCancel,
}: ComunicadoFormProps) {
  const { uploadMultiple, uploading } = useAnexos();
  const [loading, setLoading] = useState(false);
  const initialAnexos: Anexo[] = normalizeAnexos(comunicado?.anexos);
  const [form, setForm] = useState<CreateComunicadoInput>({
    titulo: comunicado?.titulo || '',
    conteudo: comunicado?.conteudo || '',
    resumo: comunicado?.resumo || '',
    categoria: comunicado?.categoria || 'geral',
    fixado: comunicado?.fixado || false,
    destaque: comunicado?.destaque || false,
    publicar_em: comunicado?.publicar_em ?? undefined,
    expirar_em: comunicado?.expirar_em ?? undefined,
    anexos: initialAnexos,
    status: comunicado?.status || 'rascunho',
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const anexos = await uploadMultiple(condominioId, 'comunicados', files);
    setForm((prev) => ({ ...prev, anexos: [...(prev.anexos || []), ...anexos] }));
    toast.success(`${anexos.length} arquivo(s) enviado(s)`);
  };

  const removeAnexo = (index: number) => {
    setForm((prev) => ({ ...prev, anexos: (prev.anexos || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent, status?: ComunicadoStatus) => {
    e.preventDefault();
    if (form.titulo.length < 5) {
      toast.error('Título deve ter pelo menos 5 caracteres');
      return;
    }
    if (form.conteudo.length < 10) {
      toast.error('Conteúdo deve ter pelo menos 10 caracteres');
      return;
    }
    setLoading(true);
    const success = await onSubmit({ ...form, status: status || form.status });
    setLoading(false);
    if (success)
      toast.success(status === 'publicado' ? 'Comunicado publicado!' : 'Comunicado salvo!');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Título *
        </label>
        <input
          type="text"
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Título do comunicado"
          required
          minLength={5}
          maxLength={200}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Resumo (opcional)
        </label>
        <input
          type="text"
          value={form.resumo || ''}
          onChange={(e) => setForm({ ...form, resumo: e.target.value })}
          className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Breve resumo para preview"
          maxLength={500}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Conteúdo *
        </label>
        <textarea
          value={form.conteudo}
          onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
          className="w-full resize-none rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Conteúdo completo do comunicado"
          rows={8}
          required
          minLength={10}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoria
          </label>
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value as ComunicadoCategoria })}
            className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.fixado}
              onChange={(e) => setForm({ ...form, fixado: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Fixar no topo</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.destaque}
              onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Destaque</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Publicar em (opcional)
          </label>
          <input
            type="datetime-local"
            value={form.publicar_em?.slice(0, 16) ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                publicar_em: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
            className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Expirar em (opcional)
          </label>
          <input
            type="datetime-local"
            value={form.expirar_em?.slice(0, 16) ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                expirar_em: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
            className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Anexos
        </label>
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 dark:border-gray-600">
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
            id="anexos-input"
          />
          <label htmlFor="anexos-input" className="flex cursor-pointer flex-col items-center">
            <span className="material-symbols-outlined mb-2 text-3xl text-gray-400">
              {uploading ? 'sync' : 'upload_file'}
            </span>
            <span className="text-sm text-gray-500">
              {uploading ? 'Enviando...' : 'Clique para adicionar arquivos'}
            </span>
          </label>
        </div>
        {form.anexos && form.anexos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.anexos.map((anexo, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800"
              >
                <span className="material-symbols-outlined text-sm text-gray-500">
                  {anexo.tipo.includes('pdf') ? 'picture_as_pdf' : 'image'}
                </span>
                <span className="max-w-[150px] truncate text-sm text-gray-700 dark:text-gray-300">
                  {anexo.nome}
                </span>
                <button
                  type="button"
                  onClick={() => removeAnexo(i)}
                  className="text-red-500 hover:text-red-700"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-6 py-3 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-700 disabled:opacity-50 dark:bg-gray-700 dark:text-white"
        >
          Salvar Rascunho
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e as React.MouseEvent<HTMLButtonElement>, 'publicado')}
          disabled={loading}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </form>
  );
}
