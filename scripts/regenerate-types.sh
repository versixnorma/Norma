#!/bin/bash

# Regenera database.types.ts a partir do schema do Supabase
# Uso: ./scripts/regenerate-types.sh

set -e

echo "🔄 Regenerando database.types.ts do Supabase..."

# Verificar se SUPABASE_PROJECT_ID está definido
if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "⚠️  SUPABASE_PROJECT_ID não está definido."
  echo "   Configure com: export SUPABASE_PROJECT_ID=your-project-id"
  echo "   Ou adicione ao .env.local"
  exit 1
fi

# Verificar se npx supabase está disponível
if ! command -v npx &> /dev/null; then
  echo "❌ npx não encontrado. Instale Node.js e npm."
  exit 1
fi

# Gerar tipos
echo "📦 Gerando tipos TypeScript..."
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  > packages/shared/database.types.ts

echo "✅ database.types.ts regenerado com sucesso!"
echo ""
echo "⚡ Próximos passos:"
echo "   1. Verifique mudanças: git diff packages/shared/database.types.ts"
echo "   2. Execute type-check: pnpm type-check"
echo "   3. Se tudo OK, commit: git add . && git commit -m 'chore: atualizar database types'"
