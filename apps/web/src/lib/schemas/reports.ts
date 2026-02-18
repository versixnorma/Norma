import { z } from 'zod';

export const reportConfigurationSchema = z
  .object({
    name: z.string().min(2),
    reportType: z.string(),
    metrics: z.array(z.string()).optional(),
    filters: z.record(z.unknown()).optional(),
    format: z.string().optional(),
    schedule: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    condominioId: z.string().uuid().optional(),
  })
  .passthrough();
