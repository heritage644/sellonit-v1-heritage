import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  booleanFromString,
  commaSeparatedList,
  EnvValidationError,
  nodeEnvSchema,
  optionalSecret,
  parseEnv,
  portSchema,
  requireInProduction,
} from './index.js';

const schema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema.default(4000),
    FLAG: booleanFromString.default(false),
    ORIGINS: commaSeparatedList.default([]),
    SECRET: optionalSecret(),
  })
  .superRefine(requireInProduction(['SECRET', 'ORIGINS']));

describe('parseEnv', () => {
  it('applies defaults and coercions', () => {
    const env = parseEnv('test-app', schema, { PORT: '8080', FLAG: 'yes', ORIGINS: 'a, b ,,c' });
    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 8080,
      FLAG: true,
      ORIGINS: ['a', 'b', 'c'],
    });
  });

  it('treats empty strings as unset', () => {
    expect(parseEnv('test-app', schema, { PORT: '' }).PORT).toBe(4000);
  });

  it('requires production-only variables in production', () => {
    expect(() => parseEnv('test-app', schema, { NODE_ENV: 'production' })).toThrow(
      EnvValidationError,
    );
    try {
      parseEnv('test-app', schema, { NODE_ENV: 'production' });
    } catch (error) {
      expect((error as EnvValidationError).issues).toEqual([
        'SECRET: is required when NODE_ENV=production',
        'ORIGINS: is required when NODE_ENV=production',
      ]);
    }
  });

  it('never includes secret values in error messages', () => {
    const leaked = 'change-me';
    let message = '';
    try {
      parseEnv('test-app', schema, { SECRET: leaked });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('SECRET');
    expect(message).not.toContain(leaked);
  });
});
