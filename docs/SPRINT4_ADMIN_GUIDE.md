# Sprint 4 - Guia de Administracao

## Escopo tecnico
Sprint 4 consolida integracao e performance em:
- APIs de analytics executivo/unificado/funil/cohort/retencao;
- geracao de relatorios;
- cache de API e invalidacao por refresh;
- alertas operacionais no painel executivo.

## Operacao diaria
1. Verificar `Admin > Analytics > Executivo`.
2. Validar secao de alertas.
3. Se necessario, executar refresh pelo botao `Atualizar`.
4. Confirmar consistencia no dashboard e nos relatorios.

## Cache e invalidacao
- Cache em memoria via `apps/web/src/lib/cache.ts`.
- Chaves de analytics usam prefixo `analytics:`.
- Endpoint `POST /api/admin/analytics/refresh` invalida com `invalidatePrefix('analytics:')`.

## Resposta a incidentes
- Erros de API: revisar logs da rota e traces de Sentry.
- Dados defasados: acionar refresh de analytics.
- Alertas repetitivos: avaliar tenants com baixa adocao e custo alto.

## Checklist de deploy
- `pnpm type-check`
- `pnpm --filter @versix/web test:unit`
- `pnpm --filter @versix/web test:coverage -- --coverage.thresholds.statements=40`
- Validar telas `Executivo`, `Avancado` e `Relatorios`.
