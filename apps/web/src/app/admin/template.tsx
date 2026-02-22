// Server Component — NÃO adicionar 'use client' aqui.
// O Next.js App Router precisa de um server component para respeitar as
// Route Segment Config options. Um layout.tsx 'use client' não pode exportar
// `dynamic` e ter o valor honrado pelo framework.
//
// `template.tsx` difere de `layout.tsx`: é recriado a cada navegação,
// o que é exatamente o comportamento desejado para o painel admin —
// nenhum payload RSC deve ser reutilizado entre visitas.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
