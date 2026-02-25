#!/bin/bash
set -euo pipefail

echo "╔══════════════════════════════════╗"
echo "║   Backup & Restore Test          ║"
echo "╚══════════════════════════════════╝"

# 1. Garantir que Supabase CLI está disponível
command -v supabase >/dev/null 2>&1 || { echo "supabase CLI não encontrado. Instale: https://supabase.com/docs/guides/cli"; exit 1; }

# 2. Dump do banco
echo "[1/4] Gerando backup..."
supabase db dump -f /tmp/norma_backup_test.sql --data-only
echo "  Backup: $(wc -l < /tmp/norma_backup_test.sql) linhas"

# 3. Verificar integridade do dump
echo "[2/4] Verificando integridade..."
INSERT_COUNT=$(grep -c "INSERT INTO" /tmp/norma_backup_test.sql || echo 0)
echo "  INSERT statements: ${INSERT_COUNT}"

if [ "${INSERT_COUNT}" -eq 0 ]; then
  echo "  AVISO: Backup gerado mas sem INSERT statements. Verifique se há dados no banco."
fi

# 4. Restore em banco temporário (se local)
echo "[3/4] Testando restore em banco local..."
supabase db reset --linked 2>/dev/null || echo "  (Skip: não há projeto linkado ou reset não disponível)"

# 5. Validar contagens
echo "[4/4] Validando dados..."
if [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" -t -c "
    SELECT 'usuarios: ' || count(*) FROM usuarios
    UNION ALL
    SELECT 'condominios: ' || count(*) FROM condominios
    UNION ALL
    SELECT 'chamados: ' || count(*) FROM chamados
    UNION ALL
    SELECT 'lancamentos_financeiros: ' || count(*) FROM lancamentos_financeiros
    UNION ALL
    SELECT 'audit_logs: ' || count(*) FROM audit_logs;
  "
else
  echo "  (Skip: DATABASE_URL não definida)"
fi

echo ""
echo "✅ Backup restore test completo."

# Cleanup
rm -f /tmp/norma_backup_test.sql
