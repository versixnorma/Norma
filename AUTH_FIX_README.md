# 🔐 Resolução do Problema de Autenticação

## Problema Identificado

O erro **400 Bad Request** durante o login ocorre porque **não há usuários criados no Supabase Auth**. O banco de dados tem os dados dos usuários (através dos seeds), mas não há contas de autenticação correspondentes no sistema de auth do Supabase.

## Pré-requisitos

Antes de executar o script, você precisa da **Service Role Key** do Supabase:

1. Acesse seu [Supabase Dashboard](https://supabase.com/dashboard/project/udryfalkvulhzoahgvqc/settings/api)
2. Na seção "Project API keys", copie a **service_role** key
3. Adicione ao arquivo `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcnlmYWxrdnVsaHpvYWhndnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjMwNTU2OSwiZXhwIjoyMDgxODgxNTY5fQ.LHC6YvYOhuy2bv6GjjcH3b6LQOxTQa4qln3e3LcmTGI
```

⚠️ **Importante**: Nunca commite esta chave no git. Ela dá acesso administrativo completo ao seu projeto.

## Solução Automática

Execute o script para criar usuários de teste:

```bash
# Instalar dependências se necessário
pnpm install

# Executar o script de criação de usuários
pnpm create-test-users
```

## Solução Manual (Alternativa)

Se preferir criar manualmente ou se houver problemas com o script:

1. Acesse seu [Supabase Dashboard > Authentication > Users](https://supabase.com/dashboard/project/udryfalkvulhzoahgvqc/auth/users)
2. Clique em "Add user"
3. Crie os usuários com estas informações:

### Síndico
- **Email**: `sindico@aurora.demo`
- **Password**: `demo123456`
- **Auto confirm user?**: ✅ Sim

### Morador
- **Email**: `morador@aurora.demo`
- **Password**: `demo123456`
- **Auto confirm user?**: ✅ Sim

### Porteiro
- **Email**: `porteiro@aurora.demo`
- **Password**: `demo123456`
- **Auto confirm user?**: ✅ Sim

### Admin
- **Email**: `admin@versix.com.br`
- **Password**: `admin123456`
- **Auto confirm user?**: ✅ Sim

4. Após criar, copie o `User ID` de cada usuário
5. Execute no SQL Editor do Supabase:

```sql
-- Vincular usuários criados no Auth aos registros existentes
UPDATE public.usuarios SET auth_id = 'USER-ID-DO-SINDICO' WHERE email = 'sindico@aurora.demo';
UPDATE public.usuarios SET auth_id = 'USER-ID-DO-MORADOR' WHERE email = 'morador@aurora.demo';
UPDATE public.usuarios SET auth_id = 'USER-ID-DO-PORTEIRO' WHERE email = 'porteiro@aurora.demo';
-- Para o admin, pode ser necessário criar o registro primeiro
INSERT INTO public.usuarios (auth_id, nome, email, role, status)
VALUES ('USER-ID-DO-ADMIN', 'Administrador Versix', 'admin@versix.com.br', 'superadmin', 'active');
```

```bash
# Instalar dependências se necessário
pnpm install

# Executar o script de criação de usuários
pnpm create-test-users
```

## Usuários de Teste Criados

Após executar o script, você poderá fazer login com estas contas:

| Email | Senha | Função | Descrição |
|-------|-------|--------|-----------|
| `sindico@aurora.demo` | `demo123456` | Síndico | Acesso completo ao condomínio Aurora |
| `morador@aurora.demo` | `demo123456` | Morador | Acesso limitado ao apartamento 202 |
| `porteiro@aurora.demo` | `demo123456` | Porteiro | Acesso básico para controle de acesso |
| `admin@versix.com.br` | `admin123456` | Super Admin | Acesso administrativo completo |

## Como Funciona

1. **Supabase Auth**: O script cria contas no sistema de autenticação do Supabase
2. **Confirmação automática**: Os emails são confirmados automaticamente (não precisa verificar caixa de entrada)
3. **Vinculação**: Os usuários do Auth são vinculados aos registros existentes na tabela `usuarios`

## Verificação

Após executar o script, você pode:

1. **Testar login**: Acesse `http://localhost:3000/login` e use qualquer uma das contas acima
2. **Ver usuários no Supabase**: Acesse seu [Supabase Dashboard > Authentication > Users](https://supabase.com/dashboard/project/_/auth/users)
3. **Ver dados no banco**: Os registros na tabela `usuarios` terão o `auth_id` preenchido

## Troubleshooting

### Erro: "Variáveis de ambiente não encontradas"
- Certifique-se de que o arquivo `.env.local` existe na raiz do projeto
- Verifique se `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão definidos

### Erro: "Usuário já existe"
- O script pula usuários que já existem, então é seguro executar múltiplas vezes

### Ainda recebendo erro 400
- Execute o script novamente
- Verifique se o Supabase está rodando (`supabase status`)
- Confirme que as migrations foram aplicadas (`supabase db reset`)

## Desenvolvimento

Para criar novos usuários de teste, edite o array `testUsers` no arquivo `scripts/create-test-users.js`.

## Produção

⚠️ **Importante**: Este script é apenas para desenvolvimento/testes. Em produção, implemente:
- Sistema de registro de usuários
- Confirmação de email
- Recuperação de senha
- Políticas de segurança adequadas
