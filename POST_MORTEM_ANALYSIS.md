# Análise Post-Mortem: 55 Deploys e Ciclos de Correção

**Data:** 02 Jan 2026
**Contexto:** Estabilização do Deploy Vercel para o Projeto Versix Norma

## 1. Resumo Executivo

Foram realizados 55 ciclos de deploy focados estritamente na resolução de erros de build (TypeScript, Linting e Dependências). Este número elevado não reflete instabilidade na infraestrutura, mas sim uma dívida técnica de tipagem acumulada e uma discrepância entre o ambiente de desenvolvimento local e a esteira de CI/CD.

A estratégia adotada foi "Fail Fast & Fix" (Corrigir erro a erro conforme aparecem no log da Vercel). Embora resolva o problema imediato, gerou um efeito "Whac-A-Mole" (consertar um erro revela o próximo), pois o build completo não estava sendo validado localmente antes do push.

## 2. Categorização dos Erros (Pareto Analysis)

Analisando os logs e correções, os erros se enquadram em 4 categorias principais:

### A. Incompatibilidade com Tipos do Supabase (~60%)

A maior fonte de erros. O cliente JS do Supabase gera tipos complexos dinamicamente.

- **Sintoma:** `Type instantiation is excessively deep`, propriedades faltando em Join tables, `unknown` em retornos de RPC.
- **Causa Raiz:** O código frontend esperava interfaces "bonitas" (Manualmente definidas), mas o Supabase retornava tipos "crus" do banco.
- **Correção Aplicada:** Uso extensivo de `as any` ou castings manuais (`as unknown as Type`) para forçar a compatibilidade.
- **Exemplos:** `useVotacao.ts` (deep instantiation), `useTaxas.ts` (retorno de map).

### B. Chamadas RPC (Remote Procedure Call) (~20%)

- **Sintoma:** Erros de argumentos em funções como `registrar_presenca`, `atualizar_taxas`.
- **Causa Raiz:** As funções Postgres (RPCs) esperam parâmetros exatos (ex: `p_usuario_id`), mas o TypeScript local muitas vezes não alertava sobre nulos (`null` vs `undefined`) ou nomes incorretos até o build estrito.
- **Correção Aplicada:** Castings nos nomes das funções (`rpc('func' as any)`) e validação de parâmetros.

### C. Estrutura de Monorepo e Exports (~15%)

- **Sintoma:** `Module '@versix/shared' has no exported member...`
- **Causa Raiz:** Tipos definidos em arquivos internos do pacote shared (`src/types/...`) não estavam sendo re-exportados no `index.ts` raiz. O VS Code local às vezes "encontra" o arquivo por cache ou path relativo, mas o build da Vercel falha pois respeita estritamente o `package.json` exports.
- **Exemplos:** `ApiLogsFilters`, `Comentario`, `Voto`.

### D. Linting e Strict Mode (~5%)

- **Sintoma:** `Unexpected any`, `Empty block`, `Unused variable`.
- **Causa Raiz:** Regras estritas do ESLint no Next.js (que falham o build em produção) vs regras mais relaxadas no dev server.

## 3. Por que 55 Deploys? (O Efeito Cascata)

O processo de correção seguiu um padrão linear ineficiente:

1.  Erro A bloqueia o compilador na linha 10.
2.  Correção do Erro A é enviada.
3.  Deploy roda -> Passa linha 10 -> Erro B aparece na linha 50.
4.  Repete-se o ciclo.

Como o TypeScript para no primeiro erro fatal de compilação (em muitos casos) ou o log da Vercel trunca múltiplos erros, não foi possível ver "todos" os erros de uma vez. Além disso, a correção de um tipo (ex: forçar `any`) às vezes quebrava a inferência em outro lugar (ex: retorno de um `.map()` que dependia do tipo original), gerando um novo erro no deploy seguinte.

## 4. Plano de Ação Definitivo (Prevention Strategy)

Para "acabar de vez" com estes erros e evitar o deploy 56, 57...:

### A. Validação Local Mandatória

Antes de qualquer novo git push, devemos rodar o comando exato que a Vercel roda:

```bash
# No diretório apps/web
pnpm run build
```

Se falhar localmente, nem subimos.

### B. Unificação dos Tipos (Shared Truth)

Devemos parar de criar interfaces duplicadas no frontend que tentam "imitar" o banco.

- **Ação:** Usar estritamente os tipos exportados de `@versix/shared` (que derivam do `database.types.ts`).
- **Ação:** Garantir que TUDO que é usado nos hooks esteja exportado no `shared/index.ts` (o problema atual do Deploy 56).

### C. Tratamento de "Deep Instantiation"

O erro de "profundidade excessiva" do Supabase é um limitador do TypeScript.

- **Solução Pragmática:** Continuar usando `as any` nas cláusulas `.from()` que envolvem muitos `.select()` com joins complexos, MAS tipar fortemente o retorno da função.
- **Ruim:** `const data = await supabase...` (TS tenta inferir 10 níveis de join e falha).
- **Bom:** `const data: MinhaInterface = (await supabase... as any).data;` (Corta o custo de inferência).
