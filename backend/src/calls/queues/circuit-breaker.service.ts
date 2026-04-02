import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { CALL_ANALYSIS_QUEUE } from './analysis-queue.constants'

const ERROR_THRESHOLD  = parseInt(process.env.CB_ERROR_THRESHOLD  ?? '10', 10)  // errors in window
const WINDOW_MS        = parseInt(process.env.CB_WINDOW_MS        ?? '60000', 10) // 1 min
const COOLDOWN_MS      = parseInt(process.env.CB_COOLDOWN_MS      ?? '120000', 10) // 2 min

@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name)

  private errorTimestamps: number[] = []
  private isOpen          = false
  private cooldownTimer?: NodeJS.Timeout

  constructor(
    @InjectQueue(CALL_ANALYSIS_QUEUE) private readonly queue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log(
      `[CircuitBreaker] Initialized (threshold=${ERROR_THRESHOLD} errors/${WINDOW_MS}ms, cooldown=${COOLDOWN_MS}ms)`,
    )
  }

  recordSuccess(): void {
    // A success when circuit is open doesn't auto-close; we wait for the timer.
    // Optionally you could implement half-open state here.
  }

  recordFailure(): void {
    const now = Date.now()
    this.errorTimestamps.push(now)

    // Slide the window
    this.errorTimestamps = this.errorTimestamps.filter(t => now - t < WINDOW_MS)

    this.logger.debug(
      `[CircuitBreaker] ${this.errorTimestamps.length} errors in last ${WINDOW_MS / 1000}s`,
    )

    if (!this.isOpen && this.errorTimestamps.length >= ERROR_THRESHOLD) {
      this.trip()
    }
  }

  private async trip(): Promise<void> {
    this.isOpen = true
    this.logger.warn(
      `[CircuitBreaker] OPEN – ${ERROR_THRESHOLD} errors in ${WINDOW_MS / 1000}s. Pausing queue for ${COOLDOWN_MS / 1000}s.`,
    )

    try {
      await this.queue.pause()
    } catch (e) {
      this.logger.error('[CircuitBreaker] Failed to pause queue', e)
    }

    // Clear any previous timer
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer)

    this.cooldownTimer = setTimeout(() => this.reset(), COOLDOWN_MS)
  }

  private async reset(): Promise<void> {
    this.isOpen          = false
    this.errorTimestamps = []

    this.logger.log('[CircuitBreaker] CLOSED – resuming queue')

    try {
      await this.queue.resume()
    } catch (e) {
      this.logger.error('[CircuitBreaker] Failed to resume queue', e)
    }
  }

  get state(): 'open' | 'closed' {
    return this.isOpen ? 'open' : 'closed'
  }
}