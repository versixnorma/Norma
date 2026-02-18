import { z } from 'zod';

export const condominioIdParamSchema = z.object({
  id: z.string().uuid('ID do condominio invalido'),
});
