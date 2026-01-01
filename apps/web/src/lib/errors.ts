/**
 * Helper para tratamento de erros tipado
 * Substitui o padrão (err: unknown) => err.message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Erro desconhecido';
}

/**
 * Type guard para PostgrestError do Supabase
 */
export function isPostgrestError(error: unknown): error is { message: string; code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}
