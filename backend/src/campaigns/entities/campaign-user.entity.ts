import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { Campaign } from './campaign.entity'
import { User } from '../../users/entities/user.entity'

@Entity('campaign_users')
@Unique(['campaign', 'user'])
export class CampaignUser {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Campaign, (campaign) => campaign.campaignUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User

  @CreateDateColumn()
  createdAt: Date
}
