import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Indicator } from './indicator.entity'
import { CampaignUser } from './campaign-user.entity'

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  prompt: string

  @OneToMany(() => Indicator, (indicator) => indicator.campaign, {
    cascade: true,
    eager: true,
  })
  indicadores: Indicator[]

  @OneToMany(() => CampaignUser, (cu) => cu.campaign, {
    cascade: true,
  })
  campaignUsers: CampaignUser[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  imageUrl: string

  @Column({ default: true })
  isActive: boolean
}