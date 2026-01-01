// src/hooks/useCriticalDataSync.ts

import { saveCriticalData } from '@/lib/offline-db';
import { supabase } from '@/lib/supabase'; // Assumindo que existe um lib/supabase
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useCriticalDataSync(condominioId: string) {
  // Buscar e sincronizar dados críticos
  const { data, error } = useQuery({
    queryKey: ['critical-data', condominioId],
    queryFn: async () => {
      try {
        // Telefones de emergência
        const { data: telefones } = await supabase
          .from('telefones_emergencia')
          .select('*')
          .eq('condominio_id', condominioId);

        // Moradores vulneráveis
        const { data: vulneraveis } = await supabase
          .from('moradores_vulneraveis')
          .select(`
            *,
            usuario:usuarios(nome, telefone),
            unidade:unidades_habitacionais(identificador, bloco)
          `)
          .eq('condominio_id', condominioId)
          .eq('ativo', true);

        // Mapas de evacuação
        const { data: mapas } = await supabase
          .from('documentos')
          .select('*')
          .eq('condominio_id', condominioId)
          .eq('categoria', 'mapa_evacuacao');

        // Contatos do síndico e portaria
        const { data: contatos } = await supabase
          .from('usuarios')
          .select('id, nome, telefone, role')
          .eq('condominio_id', condominioId)
          .in('role', ['sindico', 'subsindico', 'porteiro', 'zelador']);

        return { telefones, vulneraveis, mapas, contatos };
      } catch (error) {
        console.error('[CriticalDataSync] Error fetching data:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Salvar no IndexedDB quando os dados mudarem
  useEffect(() => {
    if (data && !error) {
      saveCriticalData('emergency-phones', data.telefones).catch(err =>
        console.error('[CriticalDataSync] Error saving emergency phones:', err)
      );
      saveCriticalData('vulnerable-residents', data.vulneraveis).catch(err =>
        console.error('[CriticalDataSync] Error saving vulnerable residents:', err)
      );
      saveCriticalData('evacuation-maps', data.mapas).catch(err =>
        console.error('[CriticalDataSync] Error saving evacuation maps:', err)
      );
      saveCriticalData('emergency-contacts', data.contatos).catch(err =>
        console.error('[CriticalDataSync] Error saving emergency contacts:', err)
      );
    }
  }, [data, error]);

  return data;
}
