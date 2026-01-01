#!/bin/bash
# Script de Auditoria: Tipos TypeScript vs Schema do Banco de Dados
# Extrai todas as definições CREATE TABLE das migrations

echo "# AUDITORIA DE TIPOS - Versix Norma"
echo "Data: $(date)"
echo ""
echo "## 📋 TABELAS ENCONTRADAS NO BANCO DE DADOS"
echo ""

# Função para extrair schema de uma tabela
extract_table_schema() {
    local file=$1
    echo "### Arquivo: $(basename $file)"
    echo ""

    # Extrair CREATE TABLE statements
    awk '/CREATE TABLE/{flag=1} flag{print} /\);/{if(flag) {print ""; flag=0}}' "$file" | \
    grep -E "CREATE TABLE|^\s+\w+|PRIMARY KEY|FOREIGN KEY|REFERENCES|UNIQUE"

    echo ""
}

# Buscar em todas as migrations
for migration in /workspaces/versix-norma/supabase/migrations/*.sql; do
    if grep -q "CREATE TABLE" "$migration"; then
        extract_table_schema "$migration"
    fi
done

echo ""
echo "## 📝 TIPOS TYPESCRIPT DEFINIDOS"
echo ""

# Listar tipos TypeScript
for type_file in /workspaces/versix-norma/packages/shared/src/types/*.ts; do
    echo "### $(basename $type_file)"
    echo ""
    grep -E "^export (interface|type)" "$type_file" | head -20
    echo ""
done
