import { z } from 'zod';

export const ConverseCompatibleErrorSchema = z.object({
  message: z.string(),
  type: z.string().nullish()
});
