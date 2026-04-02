import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import { Call, CallStatus } from '../entities/call.entity'
import { Campaign } from '../../campaigns/entities/campaign.entity'

// ── URLs y token reales del Producer ─────────────────────────────────────────
const PRODUCER_BASE = process.env.SPEECH_PRODUCER_URL || 'https://speech-analytics-producer-kku6uewffq-uc.a.run.app'
const ANALYZE_URL   = `${PRODUCER_BASE}/analyze`
const RESULT_URL    = (jobId: string) => `${PRODUCER_BASE}/result/${jobId}`
const ANALYZE_TOKEN = process.env.SPEECH_ANALYZE_TOKEN || 'SAFindControl2026'

// ── Extrae métricas del JSON devuelto por la API ──────────────────────────────

interface ScoreMetrics {
  scoreTotal: number
  scoreMax:   number
  indOk:      number
  indTotal:   number
}

function extractMetrics(data: any): ScoreMetrics {
  const indicadores: any[] =
    Array.isArray(data.indicadores_calidad)
      ? data.indicadores_calidad
      : Array.isArray(data.resultado_general?.indicadores_calidad)
        ? data.resultado_general.indicadores_calidad
        : []

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
    const indOk    = aplicables.filter(ind => ind.cumple === true).length
    const indTotal = aplicables.length
    return { scoreTotal, scoreMax, indOk, indTotal }
  }

  const fallbackScore = (() => {
    if (typeof data.score_total === 'number')   return data.score_total
    if (typeof data.puntaje_total === 'number') return data.puntaje_total
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

@Injectable()
export class AnalyzeWorker {
  private readonly logger = new Logger(AnalyzeWorker.name)

  constructor(
    @InjectRepository(Call)     private callsRepo: Repository<Call>,
    @InjectRepository(Campaign) private campaignsRepo: Repository<Campaign>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // FASE 1 — Encolar análisis (cron cada 5s)
  // Toma calls en UPLOADED → POST /analyze → guarda job_id → queda en ANALYZING
  // La API responde inmediatamente con job_id + PENDING, el resultado llega por webhook
  // ─────────────────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_5_SECONDS)
  async enqueueAnalysis() {
    const uploaded = await this.callsRepo.find({
      where: { status: CallStatus.UPLOADED },
      take: 10,
    })
    if (uploaded.length === 0) return

    this.logger.log(`[Enqueue] Enviando ${uploaded.length} grabación(es) a análisis asíncrono...`)
    await Promise.allSettled(uploaded.map(call => this.submitAnalysisJob(call)))
  }

  private async submitAnalysisJob(call: Call) {
    const campaign = await this.campaignsRepo.findOne({
      where: { id: call.campaignId },
      relations: ['indicadores'],
    })

    if (!campaign) {
      await this.callsRepo.update(call.id, { status: CallStatus.ERROR, errorMessage: 'Campaña no encontrada' })
      return
    }
    if (!campaign.isActive) {
      this.logger.warn(`Campaña "${campaign.name}" inactiva — se omite call ${call.id}`)
      return
    }

    await this.callsRepo.update(call.id, { status: CallStatus.ANALYZING })

    try {
      const indicadores = campaign.indicadores.map(ind => ({
        INDICADOR:             ind.INDICADOR,
        Puntaje_Si_Hace:       ind.Puntaje_Si_Hace,
        Puntaje_No_Hace:       ind.Puntaje_No_Hace,
        condicion_descripcion: ind.descripcion,
        condicion:             ind.condicion,
      }))

      // webhook_url apunta a nuestro backend — la API externa lo llamará cuando termine
      const backendBase  = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`
      const webhookUrl   = `${backendBase}/calls/webhook/analysis-complete`

      const { data } = await axios.post(
        ANALYZE_URL,
        {
          audio_uri:            call.audioUri,
          transcription_engine: 'gemini',
          call_id:              call.callId || call.id,
          webhook_url:          webhookUrl,
          indicadores,
          metadata: {
            callDbId:           call.id,        // ← lo usamos al recibir el webhook
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
          timeout: 30_000,   // solo espera el encolado, no el análisis completo
        },
      )

      // Respuesta: { job_id, status: "PENDING", message, poll_url }
      const jobId = data.job_id
      this.logger.log(`[Enqueue] ✓ Job encolado: call=${call.id} → job_id=${jobId}`)

      await this.callsRepo.update(call.id, {
        analysisJobId: jobId,
        status:        CallStatus.ANALYZING,
      })

    } catch (err: any) {
      const httpStatus = err.response?.status
      const detail     = err.response?.data ?? err.message
      this.logger.error(`[Enqueue] ✗ ERROR call=${call.id} [${httpStatus}]: ${JSON.stringify(detail)}`)
      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: typeof detail === 'string' ? detail : JSON.stringify(detail),
        retryCount:   () => 'retryCount + 1' as any,
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FASE 2 — Recibir resultado vía webhook
  // El CallsController llama a este método cuando la API externa notifica que terminó.
  // Aquí hacemos el GET /result/{job_id} y guardamos en BD.
  // ─────────────────────────────────────────────────────────────────────────────

  async handleWebhookResult(callDbId: string, jobId: string) {
    this.logger.log(`[Webhook] Resultado disponible — call=${callDbId} job_id=${jobId}`)
    try {
      const { data } = await axios.get(RESULT_URL(jobId), {
        headers: { Authorization: `Bearer ${ANALYZE_TOKEN}` },
        timeout: 60_000,
      })
      await this.saveAnalysisResult(callDbId, data)
    } catch (err: any) {
      const detail = err.response?.data ?? err.message
      this.logger.error(`[Webhook] ✗ Error al obtener result job=${jobId}: ${JSON.stringify(detail)}`)
      await this.callsRepo.update(callDbId, {
        status:       CallStatus.ERROR,
        errorMessage: typeof detail === 'string' ? detail : JSON.stringify(detail),
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persiste el resultado JSON en la base de datos
  // ─────────────────────────────────────────────────────────────────────────────

  async saveAnalysisResult(callDbId: string, data: any) {
    const { scoreTotal, scoreMax, indOk, indTotal } = extractMetrics(data)
    const cumplimientoPorcentaje = scoreMax > 0 ? Math.round((scoreTotal / scoreMax) * 100) : 0

    if (data.resultado_general) {
      data.resultado_general.cumplimiento_porcentaje = cumplimientoPorcentaje
    }

    this.logger.log(
      `[Save] ✓ call=${callDbId} score=${scoreTotal}/${scoreMax} (${cumplimientoPorcentaje}%) ind=${indOk}/${indTotal}`
    )

    await this.callsRepo.update(callDbId, {
      status:         CallStatus.ANALYZED,
      analysisResult: JSON.stringify(data),
      scoreTotal,
      scoreMax,
      indOk,
      indTotal,
    })
  }
}