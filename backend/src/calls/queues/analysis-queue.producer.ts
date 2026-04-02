import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import {
  CALL_ANALYSIS_QUEUE,
  ANALYZE_CALL_JOB,
  BACKOFF_DELAYS_MS,
} from './analysis-queue.constants'
import { AnalyzeCallJobPayload } from './analysis-queue.types'

@Injectable()
export class AnalysisQueueProducer {
  private readonly logger = new Logger(AnalysisQueueProducer.name)

  constructor(
    @InjectQueue(CALL_ANALYSIS_QUEUE) private readonly queue: Queue<AnalyzeCallJobPayload>,
  ) {}

  /**
   * Enqueue a call for analysis.
   * Safe to call multiple times – BullMQ deduplicates by jobId.
   */
  async enqueue(callId: string): Promise<void> {
    const maxRetries = parseInt(process.env.ANALYZE_MAX_RETRIES ?? '5', 10)

    await this.queue.add(
      ANALYZE_CALL_JOB,
      { callId },
      {
        jobId: `analyze-${callId}`,   // idempotent: same job won't be added twice
        attempts: maxRetries,
        backoff: {
          type: 'custom',             // handled by the processor via calculateDelay
        },
        removeOnComplete: { count: 100 },
        removeOnFail:     false,       // keep failed jobs for the DLQ handler
      },
    )

    this.logger.log(`[Queue] Job enqueued for call ${callId}`)
  }

  /** Re-enqueue a call that previously ended in ERROR status (manual retry). */
  async reenqueue(callId: string): Promise<void> {
    // Remove any stalled previous job first
    const existing = await this.queue.getJob(`analyze-${callId}`)
    if (existing) {
      await existing.remove()
    }
    await this.enqueue(callId)
    this.logger.log(`[Queue] Re-enqueued failed call ${callId}`)
  }

  /** Pause the queue – used by the circuit breaker. */
  async pause(): Promise<void> {
    await this.queue.pause()
    this.logger.warn('[CircuitBreaker] Queue PAUSED')
  }

  /** Resume the queue after a circuit-breaker cooldown. */
  async resume(): Promise<void> {
    await this.queue.resume()
    this.logger.log('[CircuitBreaker] Queue RESUMED')
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ])
    return { waiting, active, completed, failed, delayed }
  }
}