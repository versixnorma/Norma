# Guia de Contribuição — Versix Norma

Obrigado por querer contribuir! Este guia ajudará você a entender nossos padrões e processos.

---

## 📋 Padrões de Código

### TypeScript

- **NUNCA use `any`** — use `unknown` se necessário e sempre com type guards
- Defina interfaces para todas as props de componentes
- Exporte tipos junto com implementações
- Use `const` por padrão, `let` apenas quando necessário
- Sempre use tipos explícitos em funções

**❌ Evite:**
```typescript
function handleData(data: any) {
  return data.value;
}
```

**✅ Faça:**
```typescript
interface DataWithValue {
  value: string;
}

function handleData(data: unknown): string | null {
  if (data && typeof data === 'object' && 'value' in data) {
    return (data as DataWithValue).value;
  }
  return null;
}
```

### React

- Componentes funcionais com hooks
- Props sempre tipadas com interface/type
- Use `React.ReactNode` para children
- Implemente acessibilidade: `aria-*`, `role`, `tabIndex`
- Prefira composition sobre herança

**Exemplo de Componente:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onClick, variant = 'primary', disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}
```

### Acessibilidade

- Use `data-testid` para seletores de teste
- Sempre forneça `aria-label` ou `aria-describedby` para elementos sem texto visível
- Use semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`
- Mantenha contrast ratio ≥ 4.5:1 para texto
- Permita navegação por teclado completa

**Exemplo:**
```tsx
<nav aria-label="Navigation">
  <button 
    onClick={toggleMenu} 
    aria-expanded={isOpen}
    aria-label="Toggle navigation menu"
  >
    Menu
  </button>
</nav>
```

---

## 🔄 Fluxo de Branches

```
main (produção)
  ↑
develop (desenvolvimento)
  ↑
feature/xxx (features)
hotfix/xxx (correções críticas)
docs/xxx (documentação)
```

### Criar Branch

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/bug-critico
git checkout -b docs/melhorias
```

---

## 📝 Commits (Conventional Commits)

**Formato:**
```
type(scope): description

[optional body]
[optional footer]
```

**Types:**
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação (sem lógica)
- `refactor:` Refatoração
- `perf:` Otimização de performance
- `test:` Testes
- `chore:` Dependências, configuração

**Exemplos:**
```
feat(auth): add two-factor authentication

fix(chat): resolve message ordering issue

docs(README): update installation steps

refactor(api): simplify error handling

perf(bundle): reduce chunk size by 20%
```

---

## 🧪 Testes

### Estrutura Esperada

```
apps/web/
├── src/
│   └── components/
│       ├── Button.tsx
│       └── Button.test.tsx
```

### Rodar Testes

```bash
# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Cobertura
pnpm test:coverage
```

### Exemplo de Teste

```typescript
import { describe, it, expect } from 'vitest';
import { Button } from './Button';
import { render, screen } from '@testing-library/react';

describe('Button Component', () => {
  it('should render with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="Click" onClick={handleClick} />);
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button label="Click" onClick={() => {}} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## 📤 Abrindo um Pull Request

### Checklist

- [ ] Branch criada a partir de `develop`
- [ ] Commits seguem conventional commits
- [ ] Código passou em `pnpm type-check`
- [ ] Testes passam: `pnpm test:unit`
- [ ] Sem `any` types no código
- [ ] Acessibilidade verificada
- [ ] Documentação atualizada (se necessário)

### Descrição do PR

```markdown
## Descrição
Breve descrição do que foi implementado/corrigido.

## Tipo
- [ ] Feature
- [ ] Bug Fix
- [ ] Documentation

## Checklist
- [x] Código segue padrões do projeto
- [x] TypeScript sem erros
- [x] Testes adicionados/atualizados
- [x] Documentação atualizada

## Screenshots (se aplicável)
Adicione imagens de mudanças visuais.

## Testing
Como testar esta mudança:
1. ...
2. ...
```

---

## 🏗️ Estrutura de Pastas

```
apps/web/src/
├── app/                 # Páginas (Next.js App Router)
├── components/          # Componentes React
│   ├── ui/             # Componentes reutilizáveis
│   ├── features/       # Componentes específicos de features
│   └── layout/         # Layout components
├── hooks/              # Custom hooks
├── lib/                # Utilitários, helpers
├── types/              # Type definitions
└── styles/             # Estilos globais
```

---

## 🔍 Code Review

### O que procuramos:

✅ **Qualidade:**
- TypeScript stricto (sem `any`)
- Testes com boa cobertura
- Código legível e manutenível

✅ **Segurança:**
- Input sanitization
- Sem secrets em código
- RLS policies em banco de dados

✅ **Performance:**
- Sem imports desnecessários
- Memoização quando apropriada
- Bundle size considerado

---

## 📚 Recursos

- [Documentação TypeScript](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev)
- [Next.js Docs](https://nextjs.org/docs)
- [Testing Library](https://testing-library.com)
- [WCAG 2.1 Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)

---

## ❓ Dúvidas?

- Abra uma discussão no GitHub
- Pergunte no Slack (interno)
- Consulte a documentação técnica

---

## �� Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto.

**Versix Solutions © 2024-2025**
