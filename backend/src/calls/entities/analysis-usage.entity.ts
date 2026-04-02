// ─────────────────────────────────────────────────────────────────────────────
// analysis-usage.entity.ts
//
// Registra CADA análisis de Gemini con su costo y duración.
// Es inmutable — nunca se actualiza, solo se inserta.
// Permite calcular el costo total acumulado aunque se borren grabaciones
// o se reanalicen múltiples veces.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Campaign } from '../../campaigns/entities/campaign.entity'

@Entity('analysis_usage')
export class AnalysisUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // ── Referencia a campaña (no a call, para sobrevivir borrados) ───────────
  @ManyToOne(() => Campaign, { onDelete: 'SET NULL', nullable: true })
  campaign: Campaign

  @Column({ type: 'uuid', nullable: true })
  campaignId: string | null

  // ── Referencia a la grabación (informativa, puede ser null si se borró) ──
  @Column({ type: 'uuid', nullable: true })
  callId: string | null

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  callNombreGrabacion: string | null

  // ── Identificación del análisis ──────────────────────────────────────────
  @Column({ type: 'nvarchar', length: 255 })
  jobId: string

  /** Número de análisis para esta grabación (1 = primer análisis, 2 = primer re-análisis, etc.) */
  @Column({ type: 'int', default: 1 })
  intentoNumero: number

  // ── Duración del audio analizado ─────────────────────────────────────────
  /** Duración en segundos reportada por Gemini */
  @Column({ type: 'float', nullable: true })
  duracionSegundos: number | null

  /** Duración en minutos (duracionSegundos / 60) */
  @Column({ type: 'float', nullable: true })
  duracionMinutos: number | null

  // ── Tokens y costos de Gemini ────────────────────────────────────────────
  @Column({ type: 'int', nullable: true })
  promptTokens: number | null

  @Column({ type: 'int', nullable: true })
  candidatesTokens: number | null

  @Column({ type: 'int', nullable: true })
  totalTokens: number | null

  /** Costo estimado en USD devuelto por el worker */
  @Column({ type: 'float', nullable: true })
  costoUsd: number | null

  /** Desglose de costos como JSON (input_audio_usd, input_texto_usd, etc.) */
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  costoDetalle: string | null

  /** Modelo usado (ej: gemini-2.5-flash) */
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  modelo: string | null

  @CreateDateColumn()
  createdAt: Date
}