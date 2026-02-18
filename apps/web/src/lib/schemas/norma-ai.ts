import { z } from 'zod';

export const normaFeedbackSchema = z.object({
  conversationId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  condominioId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  feedbackText: z.string().optional(),
});

export const normaDocumentUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.string().optional(),
    source_type: z.string().optional(),
    category: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    status: z.string().optional(),
    file_url: z.string().url().nullable().optional(),
    processed_at: z.string().datetime().nullable().optional(),
  })
  .passthrough();
