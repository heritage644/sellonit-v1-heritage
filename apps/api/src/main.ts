import { createServer, type Server } from 'node:http';
import { EnvValidationError } from '@sellonit/config';
import { createApp } from './app.js';
import { loadConfig, type ApiConfig } from './config/env.js';
import { createPrismaClient, pingDatabase } from './infrastructure/database.js';
import { createLogger, type Logger } from './infrastructure/logger.js';
import {
  closeApiQueues,
  createApiQueues,
  createApiRedis,
  pingRedis,
} from './infrastructure/redis.js';
import { createReadinessService } from './modules/health/health.service.js';

function loadConfigOrExit(): ApiConfig {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // Logger is not configured yet; the message contains variable names only.
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function main(): Promise<void> {
  const config = loadConfigOrExit();
  const logger: Logger = createLogger({ level: config.log.level, service: config.serviceName });

  const prisma = createPrismaClient(config.database.url);
  const redis = createApiRedis(config.redis.url);
  redis.on('error', (error: Error) => {
    logger.warn({ err: { message: error.message } }, 'Redis connection error');
  });
  const queues = createApiQueues(redis, config.redis.queuePrefix);

  let shuttingDown = false;
  const readiness = createReadinessService({
    checks: [
      { name: 'database', check: () => pingDatabase(prisma) },
      { name: 'redis', check: () => pingRedis(redis) },
    ],
    timeoutMs: 2_000,
    isShuttingDown: () => shuttingDown,
    logger,
  });

  const app = createApp({ config, logger, readiness });
  const server = createServer(app);
  // Keep idle connections longer than typical load-balancer idle timeouts (60s).
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  await listen(server, config.server.port, config.server.host);
  logger.info(
    { host: config.server.host, port: config.server.port, env: config.env },
    'API listening',
  );

  const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true; // readiness now reports 503 so load balancers drain this instance
    logger.info({ signal }, 'Shutting down API');

    const forceExit = setTimeout(() => {
      logger.error(
        { timeoutMs: config.server.shutdownTimeoutMs },
        'Graceful shutdown timed out; forcing exit',
      );
      process.exit(1);
    }, config.server.shutdownTimeoutMs);
    forceExit.unref();

    try {
      // Stop accepting connections; wait for in-flight requests to finish.
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
        server.closeIdleConnections();
      });
      await closeApiQueues(queues);
      await redis.quit().catch(() => undefined);
      await prisma.$disconnect();
      logger.info('API stopped cleanly');
      process.exit(exitCode);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    void shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });
}

void main();
