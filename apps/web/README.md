# 🏢 VERSIX NORMA - Sistema de Gestão Condominial

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-green)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/tests-11%2F11-success)](https://vitest.dev/)

Sistema completo de gestão condominial com IA integrada, desenvolvido com Next.js 14, Supabase e TypeScript.

## 🚀 Começando

### Pré-requisitos

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Conta no Supabase
- (Opcional) Chave API Groq para IA

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Executar migrações do Supabase
pnpm supabase:gen-types

# Iniciar servidor de desenvolvimento
pnpm dev
```

### Variáveis de Ambiente Obrigatórias

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Variáveis de Ambiente Opcionais

```env
# IA - Norma Chat (Opcional)
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key

# Se não configurado, o Norma Chat funcionará em modo fallback com respostas simuladas
# Para desabilitar completamente o módulo de IA, use Feature Flags (ver seção abaixo)
```

## 🤖 Norma Chat - Assistente de IA

O Norma Chat é um assistente de IA integrado que responde perguntas sobre o condomínio baseado em documentos, regimentos e atas.

### Configuração

1. **Com IA Ativa** (recomendado para produção):
   ```bash
   # Adicionar ao .env.local
   GROQ_API_KEY=gsk_your_key_here
   OPENAI_API_KEY=sk_your_key_here
   ```

2. **Modo Fallback** (desenvolvimento/demo):
   - Sem configurar as chaves de API, o sistema retorna respostas simuladas
   - Útil para testes e demonstrações sem custo de API

3. **Desabilitar Completamente**:
   ```sql
   -- Inserir feature flag no Supabase
   INSERT INTO feature_flags (key, nome, descricao, is_enabled, ambiente)
   VALUES ('norma_chat_enabled', 'Norma Chat', 'Assistente de IA', false, 'all');
   ```

### Uso

```typescript
import { useNormaChat } from '@/hooks/useNormaChat';

// Hook detecta automaticamente se IA está disponível
const { messages, sendMessage, isTyping } = useNormaChat({
  userId: user.id,
  condominioId: user.condominioId,
});

// Enviar pergunta
await sendMessage('Qual o horário do síndico?');
```

## 🧪 Testes

### Testes Unitários

```bash
# Executar todos os testes
pnpm test

# Executar com watch
pnpm test:watch

# Cobertura
pnpm test:coverage
```

### Testes E2E

```bash
# Executar testes E2E
pnpm test:e2e

# Executar com UI interativa
pnpm test:e2e:ui

# Executar com servidor
pnpm test:e2e:all
```

## 📦 Build & Deploy

```bash
# Build para produção
pnpm build

# Executar build localmente
pnpm start

# Lint
pnpm lint

# Type check
pnpm type-check
```

## 🏗️ Arquitetura

```
apps/web/                 # Aplicação Next.js
  src/
    app/                  # App Router (Next.js 14)
    components/           # Componentes React
    hooks/                # Custom hooks
    lib/                  # Utilitários
    contexts/             # React contexts
packages/
  shared/                 # Código compartilhado
    utils/                # Funções utilitárias
    constants/            # Constantes
    validators/           # Validadores Zod
supabase/
  migrations/             # Migrações SQL
  functions/              # Edge Functions
```

## 🔒 Segurança

- ✅ Content Security Policy configurado
- ✅ Headers de segurança (HSTS, X-Frame-Options)
- ✅ Row Level Security (RLS) no Supabase
- ✅ Sanitização de SQL queries
- ✅ Validação de inputs com Zod

## 📚 Documentação Adicional

- [Roadmap de Correções](../../VERSIX_NORMA_Roadmap_Correcoes_Developers.md)
- [Sprints Técnicos](../../VERSIX%20NORMA%20-%20Detalhamento%20Técnico_%20Sprint%200%20(The%20Launchpad).md)
- [Documentação Supabase](https://supabase.com/docs)

## 🤝 Contribuindo

1. Sempre execute testes antes de commit
2. Use mensagens de commit semânticas
3. Mantenha cobertura de testes > 80%
4. Siga o guia de estilo TypeScript

## 📝 Licença

Propriedade de Versix Solutions © 2024-2025
