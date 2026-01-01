'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export function useContextualSuggestions() {
  const { profile } = useAuthContext();

  const suggestions = useMemo(() => {
    if (!profile) return [];

    const baseSuggestions = [
      'Horário de silêncio',
      'Regras do condomínio',
      'Falar com síndico',
    ];

    const roleBasedSuggestions: Record<string, string[]> = {
      sindico: [
        'Ver inadimplência',
        'Gerar relatório financeiro',
        'Agendar assembleia',
        'Cadastrar novo morador',
        'Atualizar regimento',
      ],
      subsindico: [
        'Ver reservas de áreas comuns',
        'Acompanhar ocorrências',
        'Relatório de manutenção',
        'Comunicar moradores',
      ],
      morador: [
        'Reservar salão de festas',
        'Segunda via do boleto',
        'Registrar ocorrência',
        'Ver extrato financeiro',
        'Consultar FAQ',
      ],
    };

    const userRole = profile.usuario_condominios?.[0]?.role || 'morador';
    const roleSuggestions = roleBasedSuggestions[userRole] || [];

    // Combinar sugestões base com sugestões por perfil
    return [...baseSuggestions.slice(0, 2), ...roleSuggestions.slice(0, 3)];
  }, [profile]);

  return suggestions;
}
