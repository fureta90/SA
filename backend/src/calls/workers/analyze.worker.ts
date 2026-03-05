import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import { Call, CallStatus } from '../entities/call.entity'
import { Campaign } from '../../campaigns/entities/campaign.entity'

const ANALYZE_URL   = 'https://speech-analytics-788612607917.us-central1.run.app/analyze'
const ANALYZE_TOKEN = process.env.SPEECH_ANALYZE_TOKEN || ''

// ── Extrae métricas del JSON devuelto por Gemini ──────────────────────────────

interface ScoreMetrics {
  scoreTotal: number
  scoreMax:   number
  indOk:      number
  indTotal:   number
}

function extractMetrics(data: any): ScoreMetrics {
  // El JSON tiene la estructura:
  // { resultado_general: {...}, indicadores_calidad: [...] }
  const indicadores: any[] = Array.isArray(data.indicadores_calidad)
    ? data.indicadores_calidad
    : []

  if (indicadores.length > 0) {
    const scoreTotal = indicadores.reduce((acc, ind) => {
      const v = ind.puntaje_asignado ?? ind.puntaje ?? 0
      return acc + (typeof v === 'number' ? v : parseFloat(v) || 0)
    }, 0)

    const scoreMax = indicadores.reduce((acc, ind) => {
      const v = ind.Puntaje_Si_Hace ?? ind.puntaje_si_hace ?? ind.puntaje_max ?? 0
      return acc + (typeof v === 'number' ? v : parseFloat(v) || 0)
    }, 0)

    const indOk    = indicadores.filter(ind => ind.cumple === true).length
    const indTotal = indicadores.length

    return { scoreTotal, scoreMax, indOk, indTotal }
  }

  // Fallbacks para estructuras alternativas
  const fallbackScore = (() => {
    if (typeof data.score_total === 'number')   return data.score_total
    if (typeof data.puntaje_total === 'number') return data.puntaje_total
    if (typeof data.total_score === 'number')   return data.total_score
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

  @Cron(CronExpression.EVERY_SECOND)
  async run() {
    const uploaded = await this.callsRepo.find({
      where: { status: CallStatus.UPLOADED },
      take: 10,
    })

    if (uploaded.length === 0) return

    this.logger.log(`Analizando ${uploaded.length} grabación(es) en paralelo...`)
    await Promise.allSettled(uploaded.map(call => this.processCall(call)))
  }

  private async processCall(call: Call) {
    const campaign = await this.campaignsRepo.findOne({
      where: { id: call.campaignId },
      relations: ['indicadores'],
    })

    if (!campaign) {
      this.logger.warn(`Campaña no encontrada para call ${call.id} — marcando error`)
      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: 'Campaña no encontrada',
      })
      return
    }

    if (!campaign.isActive) {
      this.logger.warn(`Campaña "${campaign.name}" inactiva — se omite call ${call.id}`)
      return
    }

    await this.callsRepo.update(call.id, { status: CallStatus.ANALYZING })

    try {
      const indicadores = campaign.indicadores.map(ind => ({
        INDICADOR:       ind.INDICADOR,
        Puntaje_Si_Hace: ind.Puntaje_Si_Hace,
        Puntaje_No_Hace: ind.Puntaje_No_Hace,
        descripcion:     ind.descripcion,
        condicion:       ind.condicion,
      }))

      const { data } = await axios.post(
        ANALYZE_URL,
        {
          audio_uri:  call.audioUri,
          call_id:    call.callId || call.id,
          indicadores,
          metadata: {
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
          timeout: 300_000,
        },
      )

      this.logger.debug(`API response keys: ${Object.keys(data).join(', ')}`)

      const { scoreTotal, scoreMax, indOk, indTotal } = extractMetrics(data)

      if (scoreTotal === 0) {
        this.logger.warn(
          `Score = 0 para ${call.id}. Estructura: ${JSON.stringify(data).substring(0, 500)}`
        )
      }

      this.logger.log(
        `✓ Analysis OK: ${call.id} score=${scoreTotal}/${scoreMax} ind=${indOk}/${indTotal}`
      )

      await this.callsRepo.update(call.id, {
        status:         CallStatus.ANALYZED,
        analysisResult: JSON.stringify(data),
        scoreTotal,
        scoreMax,
        indOk,
        indTotal,
      })

    } catch (err: any) {
      const status = err.response?.status
      const detail = err.response?.data ?? err.message
      this.logger.error(`✗ Analysis ERROR ${call.id} [${status}]: ${JSON.stringify(detail)}`)
      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: typeof detail === 'string' ? detail : JSON.stringify(detail),
        retryCount:   () => 'retryCount + 1' as any,
      })
    }
  }
}