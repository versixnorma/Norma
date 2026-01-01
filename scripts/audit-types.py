#!/usr/bin/env python3
"""
Auditoria de Tipos TypeScript vs Schema do Banco de Dados
Compara tipos definidos em packages/shared/src/types/ com tabelas em supabase/migrations/
"""

import re
import os
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

# Cores para output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def extract_tables_from_sql(migrations_dir: Path) -> Dict[str, Dict[str, str]]:
    """Extrai schemas de tabelas das migrations SQL"""
    tables = {}

    for sql_file in sorted(migrations_dir.glob("*.sql")):
        content = sql_file.read_text()

        # Regex para encontrar CREATE TABLE
        table_pattern = r'CREATE TABLE\s+(?:public\.)?(\w+)\s*\((.*?)\);'
        matches = re.finditer(table_pattern, content, re.DOTALL | re.IGNORECASE)

        for match in matches:
            table_name = match.group(1)
            table_def = match.group(2)

            # Extrair colunas
            columns = {}
            for line in table_def.split('\n'):
                line = line.strip()
                if not line or line.startswith('--') or 'CONSTRAINT' in line.upper():
                    continue

                # Parse column definition
                col_match = re.match(r'(\w+)\s+([A-Z][A-Z0-9_().,\[\]]+)', line, re.IGNORECASE)
                if col_match:
                    col_name = col_match.group(1)
                    col_type = col_match.group(2).strip().rstrip(',')

                    # Normalizar tipo
                    col_type = col_type.split()[0]  # Pegar apenas o tipo base

                    # Verificar se é nullable
                    is_nullable = 'NOT NULL' not in line.upper()

                    columns[col_name] = {
                        'type': col_type,
                        'nullable': is_nullable,
                        'full_def': line
                    }

            if columns:
                tables[table_name] = columns

    return tables

def extract_typescript_interfaces(types_dir: Path) -> Dict[str, Dict[str, str]]:
    """Extrai interfaces TypeScript"""
    interfaces = {}

    for ts_file in types_dir.glob("*.ts"):
        if ts_file.name == 'index.ts':
            continue

        content = ts_file.read_text()

        # Regex para encontrar interfaces
        interface_pattern = r'export\s+(?:interface|type)\s+(\w+)\s*(?:=\s*)?{([^}]+)}'
        matches = re.finditer(interface_pattern, content, re.DOTALL)

        for match in matches:
            interface_name = match.group(1)
            interface_body = match.group(2)

            # Extrair propriedades
            properties = {}
            for line in interface_body.split('\n'):
                line = line.strip()
                if not line or line.startswith('//'):
                    continue

                # Parse property
                prop_match = re.match(r'(\w+)(\?)?:\s*([^;]+)', line)
                if prop_match:
                    prop_name = prop_match.group(1)
                    is_optional = prop_match.group(2) == '?'
                    prop_type = prop_match.group(3).strip().rstrip(';')

                    properties[prop_name] = {
                        'type': prop_type,
                        'optional': is_optional
                    }

            if properties:
                interfaces[interface_name] = properties

    return interfaces

def map_pg_to_ts_type(pg_type: str) -> str:
    """Mapeia tipos PostgreSQL para TypeScript"""
    type_map = {
        'UUID': 'string',
        'VARCHAR': 'string',
        'TEXT': 'string',
        'BOOLEAN': 'boolean',
        'INTEGER': 'number',
        'BIGINT': 'number',
        'DECIMAL': 'number',
        'NUMERIC': 'number',
        'TIMESTAMPTZ': 'string',
        'TIMESTAMP': 'string',
        'DATE': 'string',
        'TIME': 'string',
        'JSONB': 'any',
        'JSON': 'any',
    }

    pg_type_upper = pg_type.upper().split('(')[0]
    return type_map.get(pg_type_upper, 'unknown')

def normalize_ts_type(ts_type: str) -> str:
    """Normaliza tipo TypeScript para comparação"""
    # Remove espaços
    ts_type = ts_type.strip()

    # Remove | null ou | undefined
    ts_type = re.sub(r'\s*\|\s*(null|undefined)', '', ts_type)

    # Arrays
    ts_type = re.sub(r'Array<(.+)>', r'\1[]', ts_type)

    return ts_type

def compare_schemas(tables: Dict, interfaces: Dict) -> List[Tuple[str, str, str]]:
    """Compara schemas e retorna lista de discrepâncias"""
    issues = []

    # Mapear nomes de tabelas para interfaces (tentar plural/singular)
    table_to_interface = {}

    for table_name in tables.keys():
        # Tentar encontrar interface correspondente
        possible_names = [
            table_name,  # usuarios
            table_name.rstrip('s'),  # usuario
            table_name.title().replace('_', ''),  # Usuarios
            ''.join(word.title() for word in table_name.split('_')),  # UsuariosCanaisPreferencias
        ]

        for possible_name in possible_names:
            for interface_name in interfaces.keys():
                if possible_name.lower() in interface_name.lower() or \
                   interface_name.lower() in possible_name.lower():
                    table_to_interface[table_name] = interface_name
                    break
            if table_name in table_to_interface:
                break

    # Comparar cada par tabela-interface
    for table_name, interface_name in table_to_interface.items():
        table_cols = tables[table_name]
        interface_props = interfaces[interface_name]

        # Verificar campos na tabela que não estão na interface
        for col_name, col_info in table_cols.items():
            if col_name not in interface_props:
                issues.append((
                    'MISSING_IN_TS',
                    f"{table_name}.{col_name}",
                    f"Campo existe no banco mas não em {interface_name}"
                ))

        # Verificar campos na interface que não estão na tabela
        for prop_name, prop_info in interface_props.items():
            if prop_name not in table_cols and not prop_name.endswith('?'):
                # Ignorar campos computed
                if prop_name in ['children', 'total_orcado', 'total_realizado']:
                    continue

                issues.append((
                    'MISSING_IN_DB',
                    f"{interface_name}.{prop_name}",
                    f"Campo existe em TypeScript mas não na tabela {table_name}"
                ))

        # Verificar tipos incompatíveis
        for col_name in set(table_cols.keys()) & set(interface_props.keys()):
            col_info = table_cols[col_name]
            prop_info = interface_props[col_name]

            expected_ts_type = map_pg_to_ts_type(col_info['type'])
            actual_ts_type = normalize_ts_type(prop_info['type'])

            # Verificar nullable
            is_nullable = col_info['nullable']
            has_null = '| null' in prop_info['type'] or prop_info['optional']

            if expected_ts_type not in actual_ts_type and 'any' not in actual_ts_type:
                issues.append((
                    'TYPE_MISMATCH',
                    f"{table_name}.{col_name}",
                    f"Tipo no banco: {col_info['type']} → esperado TS: {expected_ts_type}, atual: {actual_ts_type}"
                ))

            if is_nullable and not has_null:
                issues.append((
                    'NULLABLE_MISMATCH',
                    f"{table_name}.{col_name}",
                    f"Campo é nullable no banco mas não em TypeScript"
                ))

    return issues

def main():
    root_dir = Path("/workspaces/versix-norma")
    migrations_dir = root_dir / "supabase" / "migrations"
    types_dir = root_dir / "packages" / "shared" / "src" / "types"

    print(f"{BLUE}╔══════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{BLUE}║  AUDITORIA COMPLETA: TIPOS TYPESCRIPT VS SCHEMA DO BANCO    ║{RESET}")
    print(f"{BLUE}╚══════════════════════════════════════════════════════════════╝{RESET}")
    print()

    print(f"{YELLOW}📊 Extraindo schemas do banco de dados...{RESET}")
    tables = extract_tables_from_sql(migrations_dir)
    print(f"   ✓ {len(tables)} tabelas encontradas")

    print(f"{YELLOW}📝 Extraindo interfaces TypeScript...{RESET}")
    interfaces = extract_typescript_interfaces(types_dir)
    print(f"   ✓ {len(interfaces)} interfaces encontradas")

    print(f"{YELLOW}🔍 Comparando schemas...{RESET}")
    issues = compare_schemas(tables, interfaces)
    print()

    # Agrupar por tipo de problema
    issues_by_type = defaultdict(list)
    for issue_type, location, description in issues:
        issues_by_type[issue_type].append((location, description))

    # Exibir resultados
    total_issues = len(issues)

    if total_issues == 0:
        print(f"{GREEN}✅ NENHUMA INCONSISTÊNCIA ENCONTRADA!{RESET}")
    else:
        print(f"{RED}❌ {total_issues} INCONSISTÊNCIAS ENCONTRADAS:{RESET}")
        print()

        for issue_type, items in sorted(issues_by_type.items()):
            print(f"{YELLOW}▶ {issue_type} ({len(items)} ocorrências):{RESET}")
            for location, description in items[:10]:  # Limitar a 10 por tipo
                print(f"  • {location}")
                print(f"    {description}")
            if len(items) > 10:
                print(f"  ... e mais {len(items) - 10} ocorrências")
            print()

    # Estatísticas
    print(f"{BLUE}╔══════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{BLUE}║  ESTATÍSTICAS                                                ║{RESET}")
    print(f"{BLUE}╚══════════════════════════════════════════════════════════════╝{RESET}")
    print(f"Tabelas no banco: {len(tables)}")
    print(f"Interfaces TypeScript: {len(interfaces)}")
    print(f"Inconsistências: {total_issues}")
    print()

    # Salvar relatório
    report_path = root_dir / "RELATORIO_AUDITORIA_TIPOS.md"
    with open(report_path, 'w') as f:
        f.write("# Relatório de Auditoria: Tipos TypeScript vs Schema do Banco\n\n")
        f.write(f"**Data:** {os.popen('date').read().strip()}\n\n")
        f.write(f"## Resumo\n\n")
        f.write(f"- Tabelas analisadas: {len(tables)}\n")
        f.write(f"- Interfaces TypeScript: {len(interfaces)}\n")
        f.write(f"- **Inconsistências encontradas: {total_issues}**\n\n")

        if total_issues > 0:
            f.write("## Inconsistências Detalhadas\n\n")
            for issue_type, items in sorted(issues_by_type.items()):
                f.write(f"### {issue_type} ({len(items)} ocorrências)\n\n")
                for location, description in items:
                    f.write(f"- **{location}**\n")
                    f.write(f"  - {description}\n")
                f.write("\n")

    print(f"{GREEN}📄 Relatório salvo em: {report_path}{RESET}")

if __name__ == "__main__":
    main()
