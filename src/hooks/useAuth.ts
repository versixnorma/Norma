// src/hooks/useAuth.ts

// Mock de um hook de autenticação para satisfazer as dependências dos componentes
// Em um projeto real, este hook forneceria o estado de autenticação do usuário.

export const useAuth = () => ({ 
    user: { 
        id: 'mock-user-id-123',
        email: 'mock@versix.com.br',
        name: 'Mock User'
    },
    isLoading: false,
    isAuthenticated: true
});

console.warn("ATENÇÃO: O hook useAuth em src/hooks/useAuth.ts é um MOCK. Substitua pela implementação real.");
