import { z } from 'zod';

export const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');
export type NodeEnv = z.infer<typeof nodeEnvSchema>;

export const logLevelSchema = z
  .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  .default('info');
export type LogLevel = z.infer<typeof logLevelSchema>;

export const portSchema = z.coerce.number().int().min(1).max(65535);

export const positiveIntFromString = z.coerce.number().int().positive();

/** Accepts `true/false/1/0/yes/no` (case-insensitive). */
export const booleanFromString = z
  .enum(['true', 'false', '1', '0', 'yes', 'no', 'TRUE', 'FALSE', 'YES', 'NO'])
  .transform((value) => ['true', '1', 'yes'].includes(value.toLowerCase()));

/** `a, b ,c` → `['a', 'b', 'c']` */
export const commaSeparatedList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

export const postgresUrlSchema = z
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), 'must be a postgresql:// connection URL');

export const redisUrlSchema = z
  .url()
  .refine((value) => /^rediss?:\/\//.test(value), 'must be a redis:// or rediss:// URL');

const PLACEHOLDER_PATTERN = /^(change-?me|changeme|replace-?me|secret|password|todo|xxx+)$/i;

/**
 * An optional secret. When present it must be long enough and must not be an
 * obvious placeholder copied from `.env.example`.
 */
export function optionalSecret(minLength = 32) {
  return z
    .string()
    .min(minLength, `must be at least ${minLength} characters`)
    .refine((value) => !PLACEHOLDER_PATTERN.test(value), 'must not be a placeholder value')
    .optional();
}

/**
 * Adds "required when NODE_ENV=production" checks to an object schema's
 * superRefine. Development may run with these unset (features that need them
 * fail closed); production refuses to start.
 */
export function requireInProduction<Keys extends string>(
  keys: readonly Keys[],
): (value: { NODE_ENV: NodeEnv } & Partial<Record<Keys, unknown>>, ctx: z.RefinementCtx) => void {
  return (value, ctx) => {
    if (value.NODE_ENV !== 'production') return;
    for (const key of keys) {
      const present = value[key];
      if (present === undefined || (Array.isArray(present) && present.length === 0)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'is required when NODE_ENV=production',
        });
      }
    }
  };
}
