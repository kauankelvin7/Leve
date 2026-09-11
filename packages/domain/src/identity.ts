import { z } from 'zod';

export const entityIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const timeZoneSchema = z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }); return true; }
  catch { return false; }
}, 'Fuso horário inválido.');

export const profilePreferencesSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  locale: z.literal('pt-BR'),
  timeZone: timeZoneSchema,
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  reduceTransparency: z.boolean(),
}).strict();

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;
export type UserProfile = ProfilePreferences & {
  uid: string;
  schemaVersion: 1;
  revision: number;
  dataVersion: number;
  accountState: 'active' | 'deleting';
  createdAt: string;
  updatedAt: string;
};

export const commandEnvelopeSchema = z.object({
  command: z.string().min(1).max(60),
  operationId: z.uuid(),
  entityId: entityIdSchema,
  expectedRevision: z.number().int().nonnegative().optional(),
  payload: z.unknown(),
  clientCreatedAt: z.iso.datetime().optional(),
}).strict();

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
export type CommandResult = {
  operationId: string;
  entityId: string;
  revision: number;
  serverTime: string;
  result: 'applied' | 'alreadyApplied';
};

export const acceptInviteSchema = z.object({
  inviteId: entityIdSchema,
  secret: z.string().min(20).max(200),
  profile: profilePreferencesSchema,
}).strict();

export type SessionResult = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  membership: 'none' | 'active' | 'suspended';
  profile: UserProfile | null;
  serviceMode: 'normal' | 'constrained' | 'restricted';
};
