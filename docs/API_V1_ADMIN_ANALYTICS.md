# API v1 - Admin Analytics

## Autenticacao
Todas as rotas abaixo exigem contexto admin (`withAdminAuth`) e retornam JSON.

## Endpoints

### `GET /api/admin/analytics/executive`
Retorna KPIs executivos consolidados.

Resposta:
```json
{
  "data": {
    "totalUsers": 0,
    "activeUsers": 0,
    "totalCondominios": 0,
    "custoMesCentavos": 0,
    "gmvMes": 0,
    "conversasIA30d": 0,
    "satisfacaoIA30d": 0,
    "refreshedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### `GET /api/admin/analytics/unified?timeRange=30d`
Retorna atividade diaria e saude dos condominios.

Query params:
- `timeRange`: `7d | 30d | 90d | custom`
- `startDate` e `endDate` (quando `custom`)
- `condominioIds` (csv opcional)

### `GET /api/admin/analytics/alerts?timeRange=30d`
Retorna alertas operacionais em tempo real para o dashboard executivo.

Resposta:
```json
{
  "data": [
    {
      "id": "ai-satisfaction-low",
      "severity": "high",
      "title": "Satisfacao da IA abaixo do alvo",
      "message": "Satisfacao atual em 3.4/5...",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/admin/analytics/refresh`
Atualiza views de analytics e invalida cache com prefixo `analytics:`.

Resposta:
```json
{
  "success": true,
  "refreshedAt": "2026-01-01T00:00:00.000Z"
}
```
