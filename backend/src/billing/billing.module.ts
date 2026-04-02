import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { BillingPeriodService } from './billing-period.service'
import { Campaign } from '../campaigns/entities/campaign.entity'
import { Call } from '../calls/entities/call.entity'
import { RolesModule } from '../roles/roles.module'
import { CampaignsModule } from '../campaigns/campaigns.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Call]),
    RolesModule,
    CampaignsModule,
  ],
  controllers: [BillingController],
  providers:   [BillingService, BillingPeriodService],
  exports:     [BillingService, BillingPeriodService],
})
export class BillingModule {}