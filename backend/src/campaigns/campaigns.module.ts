import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RolesModule } from '../roles/roles.module'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'
import { Campaign } from './entities/campaign.entity'
import { Indicator } from './entities/indicator.entity'
import { CampaignUser } from './entities/campaign-user.entity'
import { MulterModule } from '@nestjs/platform-express'

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Indicator, CampaignUser]),
    RolesModule,
    MulterModule.register(),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}