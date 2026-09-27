import { EnvValidationError } from '@sellonit/config';
import { createRedisConnection } from '@sellonit/queue';
import type { Redis } from 'ioredis';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { processors } from './jobs/index.js';
import { createLogger } from './logger.js';
import { startWorkers } from './worker-host.js';

function loadConfigOrExit(): WorkerConfig {
  try {
    return loadWorkerConfig();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

async function waitForRedis(connection: Redis, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      connection.ping(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Redis not reachable within ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const config = loadConfigOrExit();
  const logger = createLogger({ level: config.log.level, service: config.serviceName });

  const connection = createRedisConnection({
    url: config.redis.url,
    role: 'worker',
    connectionName: 'sellonit-worker',
  });
  connection.on('error', (error: Error) => {
    logger.warn({ err: { message: error.message } }, 'Redis connection error');
  });

  try {
    await waitForRedis(connection, config.redis.connectTimeoutMs);
  } catch (error) {
    logger.fatal({ err: error }, 'Cannot start worker: Redis is unavailable');
    connection.disconnect();
    process.exit(1);
  }
  logger.info('Connected to Redis');

  const host = startWorkers({
    processors,
    connection,
    prefix: config.redis.queuePrefix,
    concurrency: config.concurrency,
    logger,
  });
  await Promise.all(host.workers.map((worker) => worker.waitUntilReady()));
  logger.info(
    { queues: processors.map((processor) => processor.queue), concurrency: config.concurrency },
    'Worker started',
  );

  let shuttingDown = false;
  const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down worker (waiting for active jobs)');

    const forceExit = setTimeout(() => {
      logger.error(
        { timeoutMs: config.shutdownTimeoutMs },
        'Graceful shutdown timed out; forcing exit',
      );
      process.exit(1);
    }, config.shutdownTimeoutMs);
    forceExit.unref();

    try {
      await host.close();
      await connection.quit().catch(() => undefined);
      logger.info('Worker stopped cleanly');
      process.exit(exitCode);
    } catch (error) {
      logger.error({ err: error }, 'Error during worker shutdown');
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
