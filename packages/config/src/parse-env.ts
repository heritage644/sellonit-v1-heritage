import type { z } from 'zod';

/**
 * Thrown when the process environment does not satisfy an app's schema.
 *
 * The message lists variable names and problems only — it never includes
 * values, so it is safe to log even when a secret is malformed.
 */
export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(appName: string, issues: readonly string[]) {
    super(
      `Invalid environment configuration for ${appName}:\n` +
        issues.map((issue) => `  - ${issue}`).join('\n') +
        '\nSee .env.example for the documented variables.',
    );
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/**
 * Parse and validate environment variables against a zod schema.
 * Call once at process start-up and pass the typed result down explicitly;
 * never read `process.env` elsewhere in application code.
 */
export function parseEnv<Schema extends z.ZodType>(
  appName: string,
  schema: Schema,
  source: Record<string, string | undefined> = process.env,
): z.output<Schema> {
  // Treat empty strings as "unset" so `FOO=` in a .env file behaves like a missing value.
  const normalized = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value !== ''),
  );

  const result = schema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const key = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${key}: ${issue.message}`;
    });
    throw new EnvValidationError(appName, issues);
  }
  return result.data;
}
