# Versix Norma

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

**Plataforma de Governança Condominial Inteligente**

Versix Norma é um sistema SaaS completo para gestão de condomínios, com assistente de IA integrado (Norma), módulos financeiros, assembleias digitais, e comunicação multicanal.

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20.x ou superior
- pnpm 8.x ou superior
- Docker (para Supabase local)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/versixsolutions/versix-norma.git
cd versix-norma

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local

# Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Arquitetura

```
versix-norma/
├── apps/
│   └── web/                      # Next.js 14 App Router
│       ├── src/
│       │   ├── app/              # Páginas (App Router)
│       │   ├── components/       # Componentes React
│       │   ├── hooks/            # Custom Hooks
│       │   └── lib/              # Utilitários
│       └── tests/                # Testes E2E (Playwright)
├── packages/
│   └── shared/                   # Tipos, validators compartilhados
├── supabase/
│   ├── functions/                # Edge Functions (Deno)
│   └── migrations/               # SQL Migrations
└── public/                       # Assets estáticos, PWA
```

### Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript 5, Tailwind CSS |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **AI** | Groq API, pgvector, RAG |
| **Testes** | Playwright (E2E), Vitest (Unit) |
| **Infra** | Vercel, Supabase Cloud, Sentry |

---

## 🔧 Configuração

### Variáveis de Ambiente

Copie `.env.example` e configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# AI
GROQ_API_KEY=xxx

# Monitoramento
NEXT_PUBLIC_SENTRY_DSN=xxx
SENTRY_AUTH_TOKEN=xxx
```

### Banco de Dados Local

```bash
# Iniciar Supabase localmente
supabase start

# Executar migrations
supabase migration dev

# Ver dashboard
supabase status
```

---

## 📚 Módulos Principais

### 🤖 Norma Chat
Assistente de IA que responde perguntas sobre:
- Documentos (Regimentos, Atas)
- Assembleias e votações
- Procedimentos condominiais

### 💰 Módulo Financeiro
- Dashboard com saldo/receitas/despesas
- Lançamentos e categorização
- Prestação de contas
- Relatórios (PDF/Excel)

### 🏛️ Assembleias Digitais
- Criação e envio de pautas
- Votação online
- Quórum automático
- Geração de Atas (PDF/assinado)

### 📢 Comunicação Multicanal
- Push, Email, SMS, WhatsApp
- Avisos de emergência
- Histórico de notificações
- Integração com Zapier/webhooks

---

## 🔧 Gerenciamento de Tipos

### 📖 Princípio Fundamental

**NUNCA crie tipos manualmente para tabelas do banco.**
A fonte única da verdade é o schema do Supabase → `packages/shared/database.types.ts`

📚 **Guia completo:** [TIPOS_GUIA.md](./TIPOS_GUIA.md)

### Comandos

```bash
# Regenerar tipos do Supabase
pnpm types:generate

# Verificar tipos
pnpm types:check

# Build com validação de tipos
pnpm build
```

### Uso Correto

```typescript
// ✅ CORRETO - Use tipos derivados
import { ChamadoComJoins, ChamadoStatus } from '@versix/shared';

// ❌ ERRADO - Não crie tipos manuais
interface Chamado { ... }
```

### FK Hints em Queries

Queries com múltiplas FKs para a mesma tabela **requerem hints**:

```typescript
// ✅ Com hint da FK
.select(`
  *,
  solicitante:usuarios!chamados_solicitante_id_fkey (nome),
  atendente:usuarios!chamados_atendente_id_fkey (nome)
`)
```

### Pre-commit Hook

O hook `.husky/pre-commit` valida tipos automaticamente antes de cada commit.

---

## 🧪 Testes

### Rodar Testes Unitários

```bash
pnpm test:unit
```

**Cobertura:**
- 38 testes passando
- Utils, Comunicados, Assembleias, Financeiro

### Rodar Testes E2E

```bash
pnpm test:e2e
```

Requisitos:
- App rodando em localhost:3000
- Dados de teste criados

### Cobertura

```bash
pnpm test:coverage
```

---

## 📊 Monitoramento

### Sentry
Rastreamento de erros e performance:
- Métricas customizadas
- Breadcrumbs automáticos
- Alertas em tempo real

### Health Check

```bash
curl https://seu-app.com/functions/v1/health
```

Retorna status de:
- PostgreSQL
- Auth
- Storage
- Groq API
- Qdrant (Vector DB)

---

## 🚀 Deploy

### Vercel

```bash
# Deploy automático via GitHub Actions
git push origin main
```

### Supabase Edge Functions

```bash
# Deploy função individual
supabase functions deploy ask-norma

# Deploy todas
supabase functions deploy
```

---

## 📖 Documentação Técnica

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guia de contribuição
- [TIPOS_GUIA.md](./TIPOS_GUIA.md) - **Gerenciamento de Tipos TypeScript**
- [EDGE_FUNCTIONS_API.yaml](./EDGE_FUNCTIONS_API.yaml) - Especificação OpenAPI
- [CODE_SPLITTING_STRATEGY.md](./CODE_SPLITTING_STRATEGY.md) - Otimização de bundle
- [SENTRY_METRICS_GUIDE.md](./SENTRY_METRICS_GUIDE.md) - Instrumentação de metrics

---

## 🔐 Segurança

- **RLS (Row Level Security)** ativado em todas as tabelas
- **CSP Headers** configurados
- **Input Sanitization** em todos os formulários
- **HTTPS** obrigatório em produção
- **JWT** para autenticação

---

## 🤝 Contribuindo

Leia [CONTRIBUTING.md](./CONTRIBUTING.md) para:
- Padrões de código
- Fluxo de branches
- Convenção de commits
- Checklist de PR

---

## 📞 Suporte

- Email: dev@versixsolutions.com.br
- Issues: GitHub Issues
- Documentação: Confluence (interno)

---

## 📄 Licença

Proprietary © 2024-2025 Versix Solutions. Todos os direitos reservados.

---

## 🎯 Status

| Item | Status |
|------|--------|
| TypeScript | ✅ Strict Mode |
| Tests | ✅ 38/38 Passing |
| Performance | ✅ Code-splitting |
| Security | ✅ CSP + RLS |
| Documentation | ✅ Complete |
| Monitoring | ✅ Sentry Active |

**Versão:** 1.0.1
**Data:** Dezembro 2025
**Time:** Versix Solutions
