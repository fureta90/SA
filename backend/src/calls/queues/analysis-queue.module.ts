import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullBoardModule } from '@bull-board/nestjs'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

import { Call } from '../entities/call.entity'
import { Campaign } from '../../campaigns/entities/campaign.entity'

import { CALL_ANALYSIS_QUEUE, CALL_ANALYSIS_DLQ } from './analysis-queue.constants'
import { AnalysisQueueProducer }  from './analysis-queue.producer'
import { AnalysisQueueProcessor } from './analysis-queue.processor'
import { DlqProcessor }           from './dlq.processor'
import { CircuitBreakerService }  from './circuit-breaker.service'

@Module({
  imports: [
    // ── Redis connection ─────────────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD'),
          db: 0,
        },
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail:     false,
        },
      }),
      inject: [ConfigService],
    }),

    // ── Queues ───────────────────────────────────────────────────────────────
    BullModule.registerQueue({ name: CALL_ANALYSIS_QUEUE }),
    BullModule.registerQueue({ name: CALL_ANALYSIS_DLQ }),

    // ── Bull Board dashboard ─────────────────────────────────────────────────
    BullBoardModule.forRoot({
      route: '/queues',           // montado bajo el global prefix → /api-backend/queues
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: CALL_ANALYSIS_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: CALL_ANALYSIS_DLQ,
      adapter: BullMQAdapter,
    }),

    // ── DB repositories ──────────────────────────────────────────────────────
    TypeOrmModule.forFeature([Call, Campaign]),
  ],

  providers: [
    AnalysisQueueProducer,
    AnalysisQueueProcessor,
    DlqProcessor,
    CircuitBreakerService,
  ],

  exports: [
    AnalysisQueueProducer,
    CircuitBreakerService,
  ],
})
export class AnalysisQueueModule {}