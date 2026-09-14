import { z } from 'zod';

export const notificationDeviceSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(['web']),
  label: z.string().trim().min(1).max(80),
}).strict();

export const notificationRevokeSchema = z.object({}).strict();
