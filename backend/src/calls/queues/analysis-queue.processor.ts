import { Logger } from '@nestjs/common'
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Job } from 'bullmq'
import axios, { AxiosError } from 'axios'

import { Call, CallStatus } from '../entities/call.entity'
import { Campaign } from '../../campaigns/entities/campaign.entity'
import {
  CALL_ANALYSIS_QUEUE,
  ANALYZE_CALL_JOB,
  BACKOFF_DELAYS_MS,
  RETRYABLE_PATTERNS,
  RETRYABLE_HTTP_CODES,
  NON_RETRYABLE_PATTERNS,
  NON_RETRYABLE_HTTP_CODES,
} from './analysis-queue.constants'
import { AnalyzeCallJobPayload } from './analysis-queue.types'
import { CircuitBreakerService } from './circuit-breaker.service'

const PRODUCER_BASE = process.env.SPEECH_PRODUCER_URL || 'https://speech-analytics-producer-kku6uewffq-uc.a.run.app'
const ANALYZE_URL   = `${PRODUCER_BASE}/analyze`
const ANALYZE_TOKEN = process.env.SPEECH_ANALYZE_TOKEN || 'SAFindControl2026'

interface ScoreMetrics {
  scoreTotal: number
  scoreMax:   number
  indOk:      number
  indTotal:   number
}

function extractMetrics(data: any): ScoreMetrics {
  const indicadores: any[] = Array.isArray(data.indicadores_calidad)
    ? data.indicadores_calidad : []

  if (indicadores.length > 0) {
    const aplicables = indicadores.filter(ind => ind.aplica !== false)
    const scoreTotal = aplicables.reduce((acc, ind) => {
      const v = ind.puntaje_asignado ?? ind.puntaje ?? 0
      return acc + (typeof v === 'number' ? v : parseFloat(v) || 0)
    }, 0)
    const scoreMax = aplicables.reduce((acc, ind) => {
      const v = ind.Puntaje_Si_Hace ?? ind.puntaje_si_hace ?? ind.puntaje_max ?? 0
      return acc + (typeof v === 'number' ? v : parseFloat(v) || 0)
    }, 0)
    return {
      scoreTotal,
      scoreMax,
      indOk:    aplicables.filter(ind => ind.cumple === true).length,
      indTotal: aplicables.length,
    }
  }

  const fallbackScore = (() => {
    if (typeof data.score_total   === 'number') return data.score_total
    if (typeof data.puntaje_total === 'number') return data.puntaje_total
    if (typeof data.total_score   === 'number') return data.total_score
    if (Array.isArray(data.resultados)) {
      return data.resultados.reduce((acc: number, r: any) => {
        const v = r.puntaje_obtenido ?? r.score ?? r.puntaje ?? 0
        return acc + (typeof v === 'number' ? v : parseFloat(v) || 0)
      }, 0)
    }
    return 0
  })()
  return { scoreTotal: fallbackScore, scoreMax: 0, indOk: 0, indTotal: 0 }
}

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

function classifyError(err: any): { retryable: boolean; message: string } {
  const httpStatus: number | undefined = (err as AxiosError).response?.status
  const body    = (err as AxiosError).response?.data
  const errMsg  = String(err?.message ?? '')

  if (httpStatus && NON_RETRYABLE_HTTP_CODES.includes(httpStatus))
    return { retryable: false, message: `HTTP ${httpStatus}: ${JSON.stringify(body)}` }
  for (const pat of NON_RETRYABLE_PATTERNS)
    if (errMsg.toLowerCase().includes(pat.toLowerCase()))
      return { retryable: false, message: errMsg }
  if (httpStatus && RETRYABLE_HTTP_CODES.includes(httpStatus))
    return { retryable: true, message: `HTTP ${httpStatus}: ${JSON.stringify(body)}` }
  for (const pat of RETRYABLE_PATTERNS)
    if (errMsg.toLowerCase().includes(pat.toLowerCase()))
      return { retryable: true, message: errMsg }
  return { retryable: true, message: errMsg }
}

// ── Helper: normalizar tipo_llamada ───────────────────────────────────────────
// Convierte cualquier valor que venga de la entidad Call al formato
// que espera el worker Python: "entrante" | "saliente" | null
function normalizeTipoLlamada(raw: string | null | undefined): 'entrante' | 'saliente' | null {
  if (!raw) return null
  const v = raw.toLowerCase().trim()
  if (v === 'entrante' || v === 'inbound'  || v === 'incoming') return 'entrante'
  if (v === 'saliente' || v === 'outbound' || v === 'outgoing') return 'saliente'
  return null
}

// ── Processor ─────────────────────────────────────────────────────────────────

@Processor(CALL_ANALYSIS_QUEUE, {
  concurrency:   parseInt(process.env.ANALYZE_CONCURRENCY    ?? '3',      10),
  lockDuration:  parseInt(process.env.ANALYZE_LOCK_DURATION  ?? '360000', 10),
  lockRenewTime: parseInt(process.env.ANALYZE_LOCK_DURATION  ?? '360000', 10) / 2,
  limiter: {
    max:      parseInt(process.env.ANALYZE_RATE_LIMIT ?? '5', 10),
    duration: 60_000,
  },
})
export class AnalysisQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisQueueProcessor.name)

  constructor(
    @InjectRepository(Call)     private callsRepo: Repository<Call>,
    @InjectRepository(Campaign) private campaignsRepo: Repository<Campaign>,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super()
  }

  async process(job: Job<AnalyzeCallJobPayload>): Promise<void> {
    const { callId } = job.data
    this.logger.log(`[Job ${job.id}] Processing call ${callId} (attempt ${job.attemptsMade + 1})`)

    const call = await this.callsRepo.findOne({ where: { id: callId } })
    if (!call) {
      this.logger.warn(`[Job ${job.id}] Call ${callId} not found – skipping`)
      return
    }
    if (call.status !== CallStatus.UPLOADED && call.status !== CallStatus.ERROR) {
      this.logger.log(`[Job ${job.id}] Call ${callId} already in status ${call.status} – skipping`)
      return
    }

    await this.analyzeCall(job, call)
  }

  private async analyzeCall(job: Job<AnalyzeCallJobPayload>, call: Call): Promise<void> {
    const campaign = await this.campaignsRepo.findOne({
      where: { id: call.campaignId },
      relations: ['indicadores'],
    })

    if (!campaign) {
      await this.callsRepo.update(call.id, { status: CallStatus.ERROR, errorMessage: 'Campaña no encontrada' })
      throw new NonRetryableError('Campaña no encontrada')
    }

    if (!campaign.isActive) {
      this.logger.warn(`[Job ${job.id}] Campaign "${campaign.name}" inactive – skipping`)
      return
    }

    await this.callsRepo.update(call.id, { status: CallStatus.ANALYZING })

    const indicadores = campaign.indicadores.map(ind => ({
      INDICADOR:         ind.INDICADOR,
      Puntaje_Si_Hace:   ind.Puntaje_Si_Hace,
      Puntaje_No_Hace:   ind.Puntaje_No_Hace,
      descripcion:       ind.descripcion ?? null,
      condicion:         ind.condicion   ?? 'SIEMPRE',
      puntaje_no_aplica: 0,
    }))

    const backendBase = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`
    const webhookUrl  = `${backendBase}/calls/webhook/analysis-complete`

    // ── v9.4.1: normalizar tipo_llamada desde la entidad Call ────────────────
    // Si la grabación tiene el dato, se manda al worker para que no lo deduzca.
    const tipoLlamada = normalizeTipoLlamada((call as any).tipoLlamada)

    try {
      const { data: enqueueData } = await axios.post(
        ANALYZE_URL,
        {
          audio_uri:            call.audioUri,
          transcription_engine: 'gemini',
          call_id:              call.callId || call.id,
          webhook_url:          webhookUrl,
          indicadores,
          // ── v9.4.1: tipo de llamada confirmado por el sistema ───────────
          // null = Gemini lo deduce del audio
          // "entrante" | "saliente" = dato concreto, Gemini no necesita deducirlo
          ...(tipoLlamada ? { tipo_llamada: tipoLlamada } : {}),
          metadata: {
            callDbId:           call.id,
            campaignId:         call.campaignId,
            nombreGrabacion:    call.nombreGrabacion,
            usuarioLlamada:     call.usuarioLlamada,
            fechaInicioLlamada: call.fechaInicioLlamada,
            fechaFinLlamada:    call.fechaFinLlamada,
            idLlamada:          call.idLlamada,
            idContacto:         call.idContacto,
            duracionSegundos:   call.duracionSegundos,
          },
        },
        {
          headers: { Authorization: `Bearer ${ANALYZE_TOKEN}` },
          timeout: 30_000,
        },
      )

      const jobId = enqueueData.job_id
      this.logger.log(
        `[Job ${job.id}] ✓ Job encolado: call=${call.id} → analysis_job_id=${jobId} ` +
        `tipo_llamada=${tipoLlamada || 'auto'}`
      )

      await this.callsRepo.update(call.id, { analysisJobId: jobId })
      this.circuitBreaker.recordSuccess()

    } catch (err: any) {
      if (err instanceof NonRetryableError) throw err

      const { retryable, message } = classifyError(err)
      this.circuitBreaker.recordFailure()

      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: message,
        retryCount:   () => 'retryCount + 1' as any,
      })

      if (!retryable) {
        this.logger.error(`[Job ${job.id}] ✗ Non-retryable error for ${call.id}: ${message}`)
        throw new NonRetryableError(message)
      }

      this.logger.warn(
        `[Job ${job.id}] ✗ Retryable error for ${call.id} (attempt ${job.attemptsMade + 1}): ${message}`,
      )
      throw err
    }
  }

  static calculateDelay(attemptsMade: number): number {
    const idx = Math.min(attemptsMade, BACKOFF_DELAYS_MS.length - 1)
    return BACKOFF_DELAYS_MS[idx]
  }

  @OnWorkerEvent('active')
  onActive(job: Job) { this.logger.debug(`[Job ${job.id}] Started`) }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) { this.logger.log(`[Job ${job.id}] Completed`) }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) { this.logger.error(`[Job ${job.id}] Failed: ${err.message}`) }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) { this.logger.warn(`[Job ${jobId}] Stalled – will be re-queued automatically`) }
}