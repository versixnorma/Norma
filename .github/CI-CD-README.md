# Versix Norma - CI/CD Setup

## 🔐 Secrets Necessários no GitHub

Para que o CI/CD funcione corretamente, adicione estes secrets no GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

### Secrets OBRIGATÓRIOS:
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Secrets RECOMENDADOS:
```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_DEMO_CONDOMINIO_ID
NEXT_PUBLIC_DEMO_CODIGO_CONVITE
NEXT_PUBLIC_ENABLE_PWA
NEXT_PUBLIC_ENABLE_NORMA_AI
```

## 📋 Valores dos Secrets

### Vercel Secrets:
- **VERCEL_TOKEN**: Obtenha em [vercel.com/account/tokens](https://vercel.com/account/tokens)
- **VERCEL_ORG_ID**: `team_lNqNbfRVjG1TSb57laOCzfWd`
- **VERCEL_PROJECT_ID**: `prj_ZJNJraYsEoF3yyAH76RYsZkd2zmt`

### Supabase Secrets:
- **NEXT_PUBLIC_SUPABASE_URL**: URL do seu projeto Supabase (ex: `https://xxxxx.supabase.co`)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Chave anônima do Supabase (das configurações do projeto)

### App Secrets:
- **NEXT_PUBLIC_APP_URL**: `https://app.versixnorma.com.br`
- **NEXT_PUBLIC_APP_NAME**: `Versix Norma`
- **NEXT_PUBLIC_DEMO_CONDOMINIO_ID**: ID do condomínio de demonstração
- **NEXT_PUBLIC_DEMO_CODIGO_CONVITE**: Código de convite de demonstração
- **NEXT_PUBLIC_ENABLE_PWA**: `true`
- **NEXT_PUBLIC_ENABLE_NORMA_AI**: `true`

## 🚀 Como Testar

Após adicionar os secrets, faça um push para a branch `main` para testar o workflow:

```bash
git commit --allow-empty -m "test: trigger ci/cd pipeline"
git push origin main
```

## 📊 Pipeline CI/CD

O workflow executa 4 jobs em sequência:

1. **Lint & Type Check** - Validação de código
2. **Build** - Compilação da aplicação
3. **Deploy Preview** - Deploy para PRs
4. **Deploy Production** - Deploy para produção (main)

## ⚠️ Limites de Avisos

O CI/CD impõe limites rigorosos de avisos para manter a qualidade do código:

### ESLint:
- **Máximo de avisos**: 50
- **Erros**: 0 (qualquer erro falha o build)

### Build (Next.js):
- **Preview (PRs)**: Máximo 100 avisos
- **Produção (main)**: Máximo 80 avisos

### Configuração:
Os limites são definidos em `.warnings-config.json` na raiz do projeto:

```json
{
  "eslint": {
    "maxWarnings": 50,
    "maxErrors": 0
  },
  "build": {
    "preview": {
      "maxWarnings": 100,
      "maxErrors": 0
    },
    "production": {
      "maxWarnings": 80,
      "maxErrors": 0
    }
  }
}
```

### Como Ajustar Limites:
1. Edite `.warnings-config.json`
2. Faça commit e push
3. O CI/CD usará os novos limites

## 🔍 Monitoramento

- **GitHub Actions**: [github.com/versixsolutions/versix-norma/actions](https://github.com/versixsolutions/versix-norma/actions)
- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)

## 🛡️ Segurança

✅ Credenciais removidas do código
✅ Secrets armazenados de forma segura
✅ Variáveis de ambiente validadas
✅ Build isolado com artifacts
