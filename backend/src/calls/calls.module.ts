import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Call } from './entities/call.entity'
import { CallIndicatorReview } from './entities/call-indicator-review.entity'
import { Campaign } from '../campaigns/entities/campaign.entity'
import { CallsController } from './calls.controller'
import { CallsService } from './calls.service'
import { UploadWorker } from './workers/upload.worker'
import { RolesModule } from '../roles/roles.module'
import { CampaignsModule } from '../campaigns/campaigns.module'
import { AudioService } from '../audio/audio.service'
import { AudioController } from '../audio/audio.controller'
import { AnalysisQueueModule } from './queues/analysis-queue.module'
import { AnalysisUsage } from './entities/analysis-usage.entity'
@Module({
  imports: [
    TypeOrmModule.forFeature([Call, CallIndicatorReview, Campaign, AnalysisUsage ]),
    RolesModule,
    CampaignsModule,
    AnalysisQueueModule
  ],
  controllers: [CallsController, AudioController],
  providers: [
    CallsService,
    UploadWorker,   // cron: PENDING → UPLOADING → UPLOADED
    AudioService,
  ],
  exports: [CallsService],
})
export class CallsModule {}