import type { QueueManager } from '../queue-manager.js';
import pino from 'pino';

const logger = pino({ name: 'scheduler:price-refresh' });

export async function setupPriceRefreshScheduler(
  queueManager: QueueManager,
  cronExpression: string,
): Promise<void> {
  const queue = queueManager.getQueue('refresh-prices');

  // Remove existing repeatable jobs
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Add new repeatable job
  await queue.add('refresh-prices', { batchSize: 50 }, {
    repeat: {
      pattern: cronExpression,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  logger.info({ cron: cronExpression }, 'Price refresh scheduler configured');
}
