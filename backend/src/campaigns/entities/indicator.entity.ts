import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Campaign } from './campaign.entity'

@Entity('indicators')
export class Indicator {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  INDICADOR: string

  @Column('float')
  Puntaje_Si_Hace: number

  @Column('float')
  Puntaje_No_Hace: number

  @Column({ nullable: true })
  descripcion: string

  @Column({ nullable: true })
  condicion: string

  @ManyToOne(() => Campaign, (campaign) => campaign.indicadores, {
    onDelete: 'CASCADE',
  })
  campaign: Campaign
}