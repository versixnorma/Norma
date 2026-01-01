// Utilitário de classes condicional (shadcn/ui)
export function cn(...args: (string | undefined | null | false)[]): string {
  return args
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}
