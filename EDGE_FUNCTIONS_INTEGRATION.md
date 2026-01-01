# Edge Functions - Referência de Integração

## 📖 Documentação

A especificação completa em formato OpenAPI está em [EDGE_FUNCTIONS_API.yaml](./EDGE_FUNCTIONS_API.yaml).

Para visualizar interativamente, use:
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **Postman**: Importe o arquivo YAML
- **ReDoc**: https://redoc.ly/

## 🔐 Autenticação

Todas as funções requerem um JWT token válido do Supabase:

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## 📝 Exemplos de Uso

### 1. Ask Norma (IA Assistant)

```typescript
async function askNorma(message: string) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    'https://{project}.functions.supabase.co/ask-norma',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        condominioId: profile.condominio_atual.id,
        userId: profile.id,
        conversationHistory: previousMessages,
      }),
    }
  );

  const { message: response, sources } = await response.json();
  return { response, sources };
}
```

**Fallback Automático**: Se `GROQ_API_KEY` não estiver configurado, retorna resposta simulada.

### 2. Send Emergency Alert (SOS)

```typescript
async function sendSOSAlert(description: string, location?: { lat: number; lng: number }) {
  const response = await fetch(
    'https://{project}.functions.supabase.co/send-emergency-alert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        condominioId: profile.condominio_atual.id,
        userId: profile.id,
        description,
        location,
        channels: ['sms', 'push', 'email'],
      }),
    }
  );

  const { alert_id, notified } = await response.json();
  return { alert_id, notified };
}
```

**Canais Suportados**:
- SMS (Twilio)
- Push Notifications (FCM)
- E-mail (SendGrid)
- WhatsApp (Evolution API - future)

### 3. Send Email

```typescript
async function sendNotificationEmail(to: string, subject: string, htmlContent: string) {
  const response = await fetch(
    'https://{project}.functions.supabase.co/send-email',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html: htmlContent,
        from: 'comunicacao@versixnorma.com',
      }),
    }
  );

  return response.json();
}
```

### 4. Collect Metrics

```typescript
async function trackEvent(event: string, data: Record<string, any>) {
  await fetch(
    'https://{project}.functions.supabase.co/collect-metrics',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        condominioId: profile.condominio_atual.id,
        event,
        data,
      }),
    }
  );
}

// Exemplo de uso:
trackEvent('norma_chat_message', {
  topic: 'assembleias',
  responseTime: 1200,
  hadSources: true
});
```

### 5. Verify Session

```typescript
async function validateUserSession() {
  const response = await fetch(
    'https://{project}.functions.supabase.co/verify-session',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 401) {
    // Sessão expirada, fazer logout
    await supabase.auth.signOut();
    return null;
  }

  const { userId, expiresAt } = await response.json();
  return { userId, expiresAt };
}
```

## 🚀 Integração em Componentes

### Hook customizado para ask-norma

```typescript
// hooks/useNormaChat.ts
import { useCallback, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export function useNormaChat(condominioId: string, userId: string) {
  const supabase = getSupabaseClient();
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = useCallback(async (input: string) => {
    try {
      setIsTyping(true);
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        'https://{project}.functions.supabase.co/ask-norma',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            condominioId,
            userId,
            conversationHistory: messages,
          }),
        }
      );

      const { message, sources } = await response.json();
      setMessages(prev => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: message, sources }
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [supabase, condominioId, userId, messages]);

  return { messages, isTyping, sendMessage };
}
```

## 📊 Limites e Rate Limiting

| Função | Limite | Reset |
|--------|--------|-------|
| ask-norma | 10 req/min por usuário | 1 minuto |
| send-emergency-alert | 20 req/min por condomínio | 1 minuto |
| send-email | 100 req/min por condomínio | 1 minuto |
| send-push | 50 req/min por condomínio | 1 minuto |
| send-sms | 50 req/min por condomínio | 1 minuto |
| Demais | 1000 req/min por projeto | 1 minuto |

**Headers de resposta**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1703001234
```

## ⚙️ Variáveis de Ambiente Necessárias

```bash
# Obrigatórias
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# IA (opcional - fallback automático sem isso)
GROQ_API_KEY=gsk_xxxxx

# Notificações
SENDGRID_API_KEY=SG.xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+5511999999999

# Firebase (Push)
FIREBASE_PRIVATE_KEY=xxxxx

# Monitoramento
SENTRY_DSN=https://xxxxx.ingest.sentry.io
```

## 🔄 Fluxo de Erro

Todos os endpoints retornam erros estruturados:

```json
{
  "error": "Sessão expirada",
  "code": "AUTH_SESSION_EXPIRED",
  "statusCode": 401,
  "details": {
    "expiresAt": "2024-01-01T12:00:00Z"
  }
}
```

**Status Codes**:
- `200`: Sucesso
- `400`: Validação falhou
- `401`: Não autenticado
- `403`: Não autorizado
- `429`: Rate limit excedido
- `500`: Erro interno

## 📈 Monitoramento

### Health Check

```typescript
async function checkSystemHealth() {
  const response = await fetch(
    'https://{project}.functions.supabase.co/health'
  );
  const { status, timestamp } = await response.json();
  return status === 'ok';
}
```

### Uptime Monitoring

```bash
# Configure em Uptime Robot, Datadog, etc:
GET https://{project}.functions.supabase.co/uptime-check
```

## 🧪 Testando com cURL

```bash
# ask-norma
curl -X POST https://xxxxx.functions.supabase.co/ask-norma \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "O que é quórum?",
    "condominioId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }'

# health
curl https://xxxxx.functions.supabase.co/health

# uptime-check
curl https://xxxxx.functions.supabase.co/uptime-check
```

## 📚 Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.0)
- [GROQ API Docs](https://console.groq.com/docs/api-overview)
- [SendGrid Email API](https://docs.sendgrid.com/api-reference)
- [Twilio SMS API](https://www.twilio.com/docs/sms/api)
