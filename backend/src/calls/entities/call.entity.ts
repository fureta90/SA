import {
  Column, CreateDateColumn, Entity,
  ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm'
import { Campaign } from '../../campaigns/entities/campaign.entity'

export enum CallStatus {
  PENDING    = 'PENDING',
  UPLOADING  = 'UPLOADING',
  UPLOADED   = 'UPLOADED',
  ANALYZING  = 'ANALYZING',
  ANALYZED   = 'ANALYZED',
  AUDITED    = 'AUDITED',
  ERROR      = 'ERROR',
}

@Unique(['campaignId', 'nombreGrabacion'])
@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // ── Relación campaña ──────────────────────────────────────────────────────
  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  campaign: Campaign

  @Column({ type: 'uuid' })
  campaignId: string

  // ── Metadata de la llamada ────────────────────────────────────────────────
  @Column({ type: 'nvarchar', length: 255 })
  nombreGrabacion: string

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  usuarioLlamada: string | null

  @Column({ type: 'datetime', nullable: true })
  fechaInicioLlamada: Date | null

  @Column({ type: 'datetime', nullable: true })
  fechaFinLlamada: Date | null

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  tipoLlamada: 'entrante' | 'saliente' | null

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  idLlamada: string | null

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  idContacto: string | null

  @Column({ type: 'int', nullable: true })
  duracionSegundos: number | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  audioTempPath: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  audioUri: string | null

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  callId: string | null

  /** Job ID devuelto por la API de Speech Analytics al encolar el análisis */
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  analysisJobId: string | null

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  analysisResult: string | null

  // ── Scores calculados por el worker ──────────────────────────────────────
  /** Suma de puntaje_asignado de todos los indicadores */
  @Column({ type: 'float', nullable: true })
  scoreTotal: number | null

  /** Suma de Puntaje_Si_Hace de todos los indicadores (máximo posible) */
  @Column({ type: 'float', nullable: true })
  scoreMax: number | null

  /** Cantidad de indicadores donde cumple === true */
  @Column({ type: 'int', nullable: true })
  indOk: number | null

  /** Total de indicadores evaluados */
  @Column({ type: 'int', nullable: true })
  indTotal: number | null

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  errorMessage: string | null

  // ── Estado del worker ─────────────────────────────────────────────────────
  @Column({
    type: 'nvarchar',
    length: 50,
    default: CallStatus.PENDING,
  })
  status: CallStatus

  @Column({ type: 'int', default: 0 })
  retryCount: number

  // ── Auditoría ─────────────────────────────────────────────────────────────
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  auditadoPorNombre: string | null

  @Column({ type: 'uniqueidentifier', nullable: true })
  auditadoPorUserId: string | null

  @Column({ type: 'datetime', nullable: true })
  auditadoAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}