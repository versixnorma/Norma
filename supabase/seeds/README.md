# 🌱 Seed Data - Versix Norma

## Condomínio Demo: Residencial Aurora

### 📋 Dados Incluídos

| Entidade | Quantidade | Descrição |
|----------|------------|-----------|
| Organização | 1 | Versix Administradora Demo |
| Condomínio | 1 | Residencial Aurora |
| Blocos | 2 | Bloco A e B |
| Unidades | 18 | 12 no Bloco A, 6 no Bloco B |
| Usuários | 3 | Síndico, Morador, Porteiro |
| Categorias Financeiras | 10 | Receitas e despesas |
| Lançamentos | 7 | Últimos 30 dias |
| Comunicados | 4 | Diversos tipos |
| Chamados | 3 | Em diferentes status |
| Áreas Comuns | 3 | Salão, Churrasqueira, Academia |
| Reservas | 2 | Pendente e aprovada |
| Assembleias | 1 | AGO Janeiro/2025 |

---

## 🚀 Como Executar

### Passo 1: Criar Usuários no Supabase Auth

1. Acesse o **Supabase Dashboard** > **Authentication** > **Users**
2. Clique em **"Add User"** > **"Create New User"**
3. Crie os seguintes usuários:

| Email | Senha | Role |
|-------|-------|------|
| `sindico@aurora.demo` | `Demo@2024!` | Síndico |
| `morador@aurora.demo` | `Demo@2024!` | Morador |
| `porteiro@aurora.demo` | `Demo@2024!` | Porteiro |

> ⚠️ Marque "Auto Confirm User" para cada um

### Passo 2: Executar o Seed SQL

1. Vá em **SQL Editor** no Supabase Dashboard
2. Cole o conteúdo de `001_demo_condominio.sql`
3. Execute o script

### Passo 3: Vincular Auth IDs

1. Cole o conteúdo de `000_create_auth_users.sql`
2. Execute apenas o bloco `DO $$ ... $$` no final

---

## 👥 Credenciais de Acesso

### Síndico
```
Email: sindico@aurora.demo
Senha: Demo@2024!
Unidade: Bloco A, Apto 101
```

### Morador
```
Email: morador@aurora.demo
Senha: Demo@2024!
Unidade: Bloco A, Apto 202
```

### Porteiro
```
Email: porteiro@aurora.demo
Senha: Demo@2024!
Unidade: N/A
```

---

## 📊 Dados Financeiros de Exemplo

### Saldo Atual
- **Conta Corrente:** R$ 45.680,50
- **Fundo de Reserva:** R$ 28.500,00

### Receitas do Mês
- Taxas Condominiais: R$ 28.800,00
- Fundo de Reserva: R$ 4.800,00
- **Total:** R$ 33.600,00

### Despesas do Mês
- Energia Elétrica: R$ 3.250,00
- Água e Esgoto: R$ 1.850,00
- Folha de Pagamento: R$ 12.500,00 (pendente)
- Manutenção: R$ 2.800,00
- Limpeza: R$ 4.200,00
- **Total:** R$ 24.600,00

### Inadimplência
- 2 unidades (8,33%)
- Total devido: R$ 2.400,00

---

## 📣 Comunicados de Exemplo

1. **Manutenção preventiva dos elevadores** (Alta prioridade)
2. **Assembleia Geral Ordinária - Janeiro/2025** (Alta prioridade)
3. **Feliz Natal e Boas Festas!** (Normal)
4. **Lembrete: Taxa condominial vence dia 10** (Normal)

---

## 🔧 Chamados de Exemplo

| # | Título | Status | Prioridade |
|---|--------|--------|------------|
| 1 | Vazamento no teto do banheiro | Em andamento | Alta |
| 2 | Lâmpada queimada no corredor | Resolvido | Baixa |
| 3 | Barulho excessivo após 22h | Aberto | Média |

---

## 📅 Assembleia Agendada

**AGO - Janeiro/2025**
- Data: 15/01/2025 às 19h
- Local: Salão de Festas - Bloco A
- Status: Convocada

**Pautas:**
1. Prestação de Contas 2024
2. Previsão Orçamentária 2025
3. Eleição de Síndico
4. Assuntos Gerais

---

## 🔄 Resetar Dados

Para resetar e recriar os dados:

```sql
-- Deletar dados existentes (cuidado!)
DELETE FROM public.reservas WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.chamados WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.comunicados WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.lancamentos_financeiros WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.usuario_condominios WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.unidades WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.blocos WHERE condominio_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.condominios WHERE id = '22222222-2222-2222-2222-222222222222';

-- Re-executar seed
-- (cole o conteúdo de 001_demo_condominio.sql)
```

---

## 📝 Notas

- Os IDs são fixos (UUIDs previsíveis) para facilitar testes
- As datas são relativas a `CURRENT_DATE`
- O código de convite do condomínio é `AURORA24`
- Tier: `starter` (pode testar upgrade para `full`)
