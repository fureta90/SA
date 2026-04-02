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

  // ── Límite de minutos (mensual) ───────────────────────────────────────────

  /** Activar/desactivar el límite de minutos mensual para esta campaña */
  @Column({ default: false })
  minutesLimitEnabled: boolean

  /** Máximo de minutos transcriptos por período (null = sin límite) */
  @Column({ type: 'int', nullable: true })
  minutesLimit: number | null

  /** Minutos consumidos en el período actual (se resetea en cada renovación) */
  @Column({ type: 'float', default: 0 })
  minutesConsumed: number

  /**
   * TRUE cuando la campaña fue inactivada automáticamente al alcanzar el límite.
   * Al renovar el período se reactiva sola.
   * FALSE = inactivada manualmente → NO se reactiva automáticamente.
   */
  @Column({ default: false })
  inactivatedByLimit: boolean

  // ── Facturación por campaña ───────────────────────────────────────────────

  /** Precio por minuto transcripto que se cobra por esta campaña (null = sin precio) */
  @Column({ type: 'float', nullable: true })
  pricePerMinute: number | null

  // ── Período de renovación ─────────────────────────────────────────────────

  /**
   * Fecha de inicio del período actual de esta campaña.
   * null = sin período configurado (los minutos no se renuevan automáticamente).
   * El cron nocturno detecta cuando now >= periodStartDate + periodDays y renueva.
   */
  @Column({ type: 'datetime', nullable: true })
  periodStartDate: Date | null

  /**
   * Duración del período en días (default: 30).
   * Permite configurar períodos de 28, 30 o 31 días.
   */
  @Column({ type: 'int', default: 30 })
  periodDays: number
}