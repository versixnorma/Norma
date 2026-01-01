// src/lib/supabase.ts

// Mock de um cliente Supabase para satisfazer as dependências dos hooks
// Em um projeto real, este arquivo conteria a inicialização do cliente Supabase.

export const supabase = {
  from: (tableName: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        in: (column: string, values: any[]) => ({
          data: [],
          error: null,
        }),
        data: [],
        error: null,
      }),
      single: () => ({
        data: null,
        error: null,
      }),
      data: [],
      error: null,
    }),
    upsert: (data: any, options: any) => ({
      error: null,
    }),
  }),
};

console.warn("ATENÇÃO: O cliente Supabase em src/lib/supabase.ts é um MOCK. Substitua pela implementação real.");
