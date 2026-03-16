import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import pino from 'pino';

const logger = pino({ name: 'queue-manager' });

export interface QueueManagerOptions {
  connection: ConnectionOptions;
}

export class QueueManager {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();

  constructor(private options: QueueManagerOptions) {}

  getQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: this.options.connection,
      });
      this.queues.set(name, queue);
      logger.info({ queue: name }, 'Queue created');
    }
    return queue;
  }

  registerWorker<T>(
    queueName: string,
    processor: (job: Job<T>) => Promise<unknown>,
    concurrency = 1,
  ): Worker {
    const worker = new Worker(queueName, processor, {
      connection: this.options.connection,
      concurrency,
    });

    worker.on('completed', (job) => {
      logger.debug({ queue: queueName, jobId: job.id }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
      logger.error({ queue: queueName, jobId: job?.id, err: err.message }, 'Job failed');
    });

    this.workers.set(queueName, worker);
    logger.info({ queue: queueName, concurrency }, 'Worker registered');
    return worker;
  }

  async addJob<T>(queueName: string, data: T, options?: { delay?: number; priority?: number }): Promise<string> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(queueName, data, {
      delay: options?.delay,
      priority: options?.priority,
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return job.id ?? '';
  }

  async close(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.debug({ queue: name }, 'Worker closed');
    }
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.debug({ queue: name }, 'Queue closed');
    }
    this.workers.clear();
    this.queues.clear();
  }
}
