import { describe, expect, it } from 'vitest';
import { EnvValidationError } from '@sellonit/config';
import { loadConfig } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/sellonit',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadConfig', () => {
  it('applies local development defaults', () => {
    const config = loadConfig(base);
    expect(config.env).toBe('development');
    expect(config.server).toMatchObject({ host: '0.0.0.0', port: 4000 });
    expect(config.cors.origins).toEqual(['http://localhost:3000']);
    expect(config.auth.accessTokenSecret).toBeUndefined();
  });

  it('requires DATABASE_URL and REDIS_URL in every environment', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL[\s\S]*REDIS_URL/);
    expect(() => loadConfig({ ...base, DATABASE_URL: 'mysql://x' })).toThrow(EnvValidationError);
  });

  it('refuses to start in production without secrets and CORS origins', () => {
    try {
      loadConfig({ ...base, NODE_ENV: 'production' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues).toEqual([
        'JWT_ACCESS_SECRET: is required when NODE_ENV=production',
        'PAYMENT_WEBHOOK_SECRET: is required when NODE_ENV=production',
        'THREE_PL_WEBHOOK_SECRET: is required when NODE_ENV=production',
        'CORS_ORIGINS: is required when NODE_ENV=production',
      ]);
    }
  });

  it('rejects weak or placeholder secrets', () => {
    expect(() => loadConfig({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => loadConfig({ ...base, PAYMENT_WEBHOOK_SECRET: 'changemechangeme' })).not.toThrow();
    expect(() => loadConfig({ ...base, PAYMENT_WEBHOOK_SECRET: 'change-me' })).toThrow(
      /PAYMENT_WEBHOOK_SECRET/,
    );
  });

  it('starts in production when fully configured', () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'p'.repeat(48),
      PAYMENT_WEBHOOK_SECRET: 'w'.repeat(32),
      THREE_PL_WEBHOOK_SECRET: 't'.repeat(32),
      CORS_ORIGINS: 'https://sellonit.app, https://www.sellonit.app',
    });
    expect(config.isProduction).toBe(true);
    expect(config.cors.origins).toEqual(['https://sellonit.app', 'https://www.sellonit.app']);
  });
});
