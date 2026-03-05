import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Call } from './entities/call.entity'
import { CallIndicatorReview } from './entities/call-indicator-review.entity'
import { Campaign } from '../campaigns/entities/campaign.entity'
import { CallsController } from './calls.controller'
import { CallsService } from './calls.service'
import { UploadWorker } from './workers/upload.worker'
import { AnalyzeWorker } from './workers/analyze.worker'
import { RolesModule } from '../roles/roles.module'
import { CampaignsModule } from '../campaigns/campaigns.module'
import { AudioService} from '../audio/audio.service'
import { AudioController } from '../audio/audio.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, CallIndicatorReview, Campaign]),
    RolesModule,
    CampaignsModule,
  ],
  controllers: [CallsController, AudioController],
  providers: [CallsService, UploadWorker, AnalyzeWorker, AudioService],
  exports: [CallsService],
})
export class CallsModule {}