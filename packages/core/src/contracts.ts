import { z } from 'zod';

/**
 * Canonical zod contracts for cross-app (`shared` schema) data. Per-app
 * contracts live with their app/package. All Supabase request/response shapes
 * should be validated against a contract.
 */
export const profileContract = z.object({
  id: z.uuid(),
  display_name: z.string().min(1),
  created_at: z.string()
});
export type Profile = z.infer<typeof profileContract>;
