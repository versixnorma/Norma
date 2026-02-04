# Versix Norma - Documentação da API

## Visão Geral

A API do Versix Norma é composta por **Supabase Edge Functions** (Deno) que fornecem funcionalidades específicas para o sistema de gestão condominial.

**Base URL:** `{SUPABASE_URL}/functions/v1`

**Autenticação:** Bearer Token (JWT do Supabase Auth)

```
Authorization: Bearer {access_token}
```

---

## Rate Limiting

Todas as endpoints possuem rate limiting configurável. Os limites padrão são:

| Endpoint           | Limite  | Janela |
| ------------------ | ------- | ------ |
| `default`          | 100 req | 60s    |
| `ask-norma`        | 20 req  | 60s    |
| `approve-user`     | 30 req  | 60s    |
| `impersonate`      | 5 req   | 3600s  |
| `process-document` | 10 req  | 60s    |
| `send-email`       | 50 req  | 60s    |
| `auth`             | 10 req  | 60s    |

**Headers de resposta:**

- `X-RateLimit-Limit`: Limite total
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp do reset
- `Retry-After`: Segundos até poder tentar novamente (quando bloqueado)

---

## Endpoints

### 1. Health Check

Verifica o status de todos os serviços.

```
GET /health
```

**Autenticação:** Não requerida

**Resposta (200 OK):**

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "database": { "status": "ok", "latencyMs": 45 },
    "auth": { "status": "ok", "latencyMs": 12 },
    "storage": { "status": "ok", "latencyMs": 89 },
    "groq": { "status": "ok", "latencyMs": 234 }
  },
  "timestamp": "2026-02-03T10:00:00.000Z",
  "version": "1.0.5"
}
```

**Status codes:**

- `200`: Sistema saudável ou degradado
- `503`: Sistema não saudável

---

### 2. Ask Norma (IA Chat)

Chatbot de IA para perguntas sobre governança condominial com RAG.

```
POST /ask-norma
```

**Autenticação:** Requerida

**Rate Limit:** 20 req/min

**Request Body:**

```json
{
  "message": "Qual o horário de silêncio?",
  "condominioId": "uuid-do-condominio",
  "userId": "uuid-do-usuario",
  "conversationHistory": [
    {
      "role": "user" | "assistant",
      "content": "mensagem anterior",
      "timestamp": "2026-02-03T10:00:00.000Z"
    }
  ]
}
```

**Resposta (SSE Streaming):**

```
data: {"content": "De acordo"}
data: {"content": " com o Regimento"}
data: {"content": " Interno..."}
data: [DONE]
```

**Headers de resposta:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Erros:**

- `400`: Parâmetros inválidos
- `401`: Não autenticado
- `429`: Rate limit excedido
- `500`: Erro interno

---

### 3. Approve User

Aprova ou rejeita usuários pendentes (Síndico/SuperAdmin).

```
POST /approve-user
```

**Autenticação:** Requerida (Síndico ou SuperAdmin)

**Rate Limit:** 30 req/min

**Request Body (Aprovação):**

```json
{
  "usuario_id": "uuid-do-usuario",
  "acao": "approve",
  "unidade_id": "uuid-da-unidade"
}
```

**Request Body (Rejeição):**

```json
{
  "usuario_id": "uuid-do-usuario",
  "acao": "reject",
  "motivo_rejeicao": "Documentação insuficiente"
}
```

**Resposta (200 OK):**

```json
{
  "success": true,
  "usuario": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@email.com",
    "status": "active",
    "unidade_id": "uuid-da-unidade"
  },
  "error": null
}
```

**Erros:**

- `400`: Parâmetros inválidos
- `401`: Não autenticado
- `403`: Sem permissão
- `404`: Usuário não encontrado
- `429`: Rate limit excedido

---

### 4. Impersonate

Permite SuperAdmin visualizar o sistema como outro usuário (para suporte).

```
POST /impersonate
```

**Autenticação:** Requerida (SuperAdmin apenas)

**Rate Limit:** 5 req/hora

**Request Body:**

```json
{
  "usuario_alvo_id": "uuid-do-usuario",
  "motivo": "Suporte ao usuário para resolução de problema com boleto"
}
```

**Resposta (200 OK):**

```json
{
  "success": true,
  "session_id": "uuid-da-sessao",
  "expires_at": "2026-02-03T12:00:00.000Z",
  "usuario_alvo": {
    "id": "uuid",
    "nome": "Maria Santos",
    "email": "maria@email.com",
    "role": "morador",
    "condominio_id": "uuid"
  },
  "error": null
}
```

**Erros:**

- `400`: Motivo muito curto (mínimo 10 caracteres)
- `401`: Não autenticado
- `403`: Não é SuperAdmin / Não pode impersonar SuperAdmin
- `404`: Usuário alvo não encontrado
- `429`: Rate limit excedido

---

### 5. Process Document

Processa documentos PDF para RAG (extração de texto + embeddings).

```
POST /process-document
```

**Autenticação:** Requerida

**Rate Limit:** 10 req/min

**Request Body:**

```json
{
  "documentId": "uuid-do-documento",
  "condominioId": "uuid-do-condominio",
  "userId": "uuid-do-usuario"
}
```

**Resposta (200 OK):**

```json
{
  "success": true,
  "chunksProcessed": 42,
  "message": "Document processed successfully. 42 chunks created."
}
```

**Limitações:**

- Tamanho máximo do arquivo: 10MB
- Formato suportado: PDF

**Erros:**

- `400`: Campos obrigatórios faltando
- `404`: Documento não encontrado
- `413`: Arquivo muito grande
- `500`: Erro no processamento

---

### 6. Send Email

Envia email via SendGrid.

```
POST /send-email
```

**Autenticação:** Requerida (interno)

**Rate Limit:** 50 req/min

**Request Body:**

```json
{
  "to": "destinatario@email.com",
  "subject": "Assunto do email",
  "html": "<h1>Conteúdo HTML</h1>",
  "from": "remetente@versixnorma.com"
}
```

**Resposta (200 OK):**

```json
{
  "success": true
}
```

---

### 7. Send Push

Envia notificação push via Firebase Cloud Messaging.

```
POST /send-push
```

**Autenticação:** Requerida (interno)

**Rate Limit:** 100 req/min

**Request Body:**

```json
{
  "token": "fcm-device-token",
  "title": "Nova notificação",
  "body": "Você tem uma nova mensagem",
  "data": {
    "tipo": "comunicado",
    "id": "uuid"
  }
}
```

**Resposta (200 OK):**

```json
{
  "success": true,
  "messageId": "message-id-do-fcm"
}
```

---

### 8. Verify Session

Verifica se a sessão do usuário é válida.

```
POST /verify-session
```

**Autenticação:** Requerida

**Request Body:**

```json
{
  "token": "jwt-access-token"
}
```

**Resposta (200 OK):**

```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "usuario@email.com"
  }
}
```

---

### 9. Validate Ata

Valida assinaturas de atas de assembleia.

```
POST /validate-ata
```

**Autenticação:** Requerida (Síndico)

**Request Body:**

```json
{
  "ataId": "uuid-da-ata",
  "condominioId": "uuid-do-condominio"
}
```

**Resposta (200 OK):**

```json
{
  "valid": true,
  "signatures": 15,
  "quorum_atingido": true
}
```

---

### 10. Collect Metrics

Coleta métricas de uso do sistema (interno/cron).

```
POST /collect-metrics
```

**Autenticação:** Service Role Key

**Request Body:**

```json
{
  "condominioId": "uuid-do-condominio",
  "periodo": "daily"
}
```

---

### 11. Uptime Check

Verificação de uptime para monitoramento externo.

```
GET /uptime-check
```

**Autenticação:** Não requerida

**Resposta (200 OK):**

```json
{
  "status": "up",
  "timestamp": "2026-02-03T10:00:00.000Z"
}
```

---

### 12. Notify Slack

Envia notificações para canal Slack (alertas do sistema).

```
POST /notify-slack
```

**Autenticação:** Service Role Key

**Request Body:**

```json
{
  "channel": "#norma-alerts",
  "message": "Alerta: Taxa de erro acima de 5%",
  "severity": "warning"
}
```

---

### 13. Send SMS

Envia SMS via provedor configurado.

```
POST /send-sms
```

**Autenticação:** Requerida (interno)

**Request Body:**

```json
{
  "to": "+5511999999999",
  "message": "Seu código de verificação é: 123456"
}
```

---

## Códigos de Erro Comuns

| Código | Significado                                    |
| ------ | ---------------------------------------------- |
| `400`  | Bad Request - Parâmetros inválidos             |
| `401`  | Unauthorized - Token inválido ou expirado      |
| `403`  | Forbidden - Sem permissão para a ação          |
| `404`  | Not Found - Recurso não encontrado             |
| `405`  | Method Not Allowed - Método HTTP não suportado |
| `429`  | Too Many Requests - Rate limit excedido        |
| `500`  | Internal Server Error - Erro interno           |
| `503`  | Service Unavailable - Serviço indisponível     |

---

## CORS

Origens permitidas:

- `http://localhost:3000` - `http://localhost:3006`
- `https://versixnorma.com`
- `https://www.versixnorma.com`
- `https://app.versixnorma.com`
- `https://norma.versix.com.br`
- `https://versix-norma.vercel.app`

---

## Variáveis de Ambiente

| Variável                    | Descrição                      |
| --------------------------- | ------------------------------ |
| `SUPABASE_URL`              | URL do projeto Supabase        |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin)       |
| `GROQ_API_KEY`              | API Key do Groq (LLM)          |
| `OPENAI_API_KEY`            | API Key da OpenAI (embeddings) |
| `SENDGRID_API_KEY`          | API Key do SendGrid (emails)   |
| `FIREBASE_SERVER_KEY`       | Server Key do FCM (push)       |
| `SENTRY_DSN`                | DSN do Sentry (monitoramento)  |

---

## Segurança

1. **Autenticação**: JWT via Supabase Auth
2. **Rate Limiting**: Implementado em todas as rotas sensíveis
3. **CORS**: Allowlist de origens permitidas
4. **Sanitização**: Inputs sanitizados contra injection
5. **RLS**: Row Level Security no banco de dados
6. **Audit Logs**: Ações sensíveis são logadas

---

## Exemplos de Uso

### cURL - Health Check

```bash
curl https://your-project.supabase.co/functions/v1/health
```

### cURL - Ask Norma

```bash
curl -X POST https://your-project.supabase.co/functions/v1/ask-norma \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual o horário de silêncio?",
    "condominioId": "uuid",
    "userId": "uuid"
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-user`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    usuario_id: 'uuid',
    acao: 'approve',
    unidade_id: 'uuid',
  }),
});

const data = await response.json();
```

---

_Documentação gerada em: 2026-02-03_
_Versão: 1.0.5_
