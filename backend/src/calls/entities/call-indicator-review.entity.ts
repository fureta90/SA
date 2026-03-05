import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm'
import { Call } from './call.entity'

@Entity('call_indicator_reviews')
export class CallIndicatorReview {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // ── Referencia a la llamada ──────────────────────────────────────────────────
  @Column({ type: 'uniqueidentifier' })
  callId: string

  @ManyToOne(() => Call, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callId' })
  call: Call

  // ── Identificación del indicador ─────────────────────────────────────────────
  /** Posición en el array indicadores_calidad (0-based) */
  @Column({ type: 'int' })
  indicadorIndex: number

  /** Copia del nombre para que el historial sea legible sin el JSON */
  @Column({ type: 'nvarchar', length: 500 })
  indicadorNombre: string

  // ── Valores anteriores (como los devolvió Gemini o la revisión anterior) ─────
  @Column({ type: 'bit', nullable: true })
  valorAnteriorCumple: boolean | null

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  valorAnteriorPuntaje: number | null

  // ── Valores nuevos (los que estableció el auditor) ───────────────────────────
  @Column({ type: 'bit' })
  valorNuevoCumple: boolean

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  valorNuevoPuntaje: number

  // ── Nota del auditor ─────────────────────────────────────────────────────────
  @Column({ type: 'nvarchar', length: 'MAX' as any, nullable: true })
  nota: string | null

  // ── Auditor ──────────────────────────────────────────────────────────────────
  @Column({ type: 'uniqueidentifier' })
  revisadoPorUserId: string

  /** Desnormalizado: queda fijo aunque el usuario cambie nombre/email */
  @Column({ type: 'nvarchar', length: 200 })
  revisadoPorNombre: string

  @CreateDateColumn()
  createdAt: Date
}