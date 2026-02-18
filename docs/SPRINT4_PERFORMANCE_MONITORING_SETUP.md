# Sprint 4 - Setup de Monitoramento de Performance

## Objetivo
Garantir observabilidade de latencia, erros e custo operacional no modulo administrativo.

## 1) Aplicacao web
- Sentry configurado em `apps/web/src/instrumentation.ts`.
- Amostragem diferenciada por ambiente e rotas criticas.
- Validar variaveis:
  - `SENTRY_DSN`
  - `NODE_ENV`

## 2) APIs de analytics
Monitorar:
- `GET /api/admin/analytics/executive`
- `GET /api/admin/analytics/unified`
- `GET /api/admin/analytics/alerts`
- `POST /api/admin/analytics/refresh`

Indicadores recomendados:
- p95 de latencia por endpoint;
- taxa de erro 4xx/5xx;
- tempo de refresh das views.

## 3) Alertas operacionais
Alertas no dashboard executivo sao calculados por:
- `apps/web/src/lib/services/analyticsAlerts.ts`.

Regras atuais:
- satisfacao IA baixa;
- custo alto vs GMV;
- baixo engajamento;
- base IA sem uso.

## 4) Rotina semanal
- Revisar alertas de alta severidade.
- Revisar tenants com pior engajamento.
- Ajustar thresholds conforme comportamento real.
