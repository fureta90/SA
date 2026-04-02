import { Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Job } from 'bullmq'

import { Call, CallStatus } from '../entities/call.entity'
import { CALL_ANALYSIS_DLQ } from './analysis-queue.constants'
import { AnalyzeCallJobPayload } from './analysis-queue.types'

@Processor(CALL_ANALYSIS_DLQ, { concurrency: 1 })
export class DlqProcessor extends WorkerHost {
  private readonly logger = new Logger(DlqProcessor.name)

  constructor(
    @InjectRepository(Call) private callsRepo: Repository<Call>,
  ) {
    super()
  }

  async process(job: Job<AnalyzeCallJobPayload>): Promise<void> {
    const { callId } = job.data

    this.logger.error(
      `[DLQ] Call ${callId} exhausted all retries after ${job.attemptsMade} attempts. ` +
      `Last failure: ${job.failedReason}`,
    )

    // Ensure final ERROR state is persisted
    await this.callsRepo.update(callId, {
      status:       CallStatus.ERROR,
      errorMessage: `[DLQ] ${job.failedReason ?? 'Unknown error after max retries'}`,
    })

    // Job is acknowledged (no throw) so it leaves the DLQ cleanly.
    // Ops team can inspect via Bull Dashboard or query DB for status=ERROR.
  }
}