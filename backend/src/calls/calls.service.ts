import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { join } from 'path'
import * as fs from 'fs'
import axios from 'axios'
import { Call, CallStatus } from './entities/call.entity'
import { CallIndicatorReview } from './entities/call-indicator-review.entity'
import { CreateCallDto } from './dto/create-call.dto'
import { CreateCallBase64Dto } from './dto/create-call-base64.dto'
import { CreateIndicatorReviewDto } from './dto/create-indicator-review.dto'
import { Campaign } from '../campaigns/entities/campaign.entity'
import { CampaignsService } from '../campaigns/campaigns.service'
import { AnalysisQueueProducer } from './queues/analysis-queue.producer'
import { existsSync, mkdirSync } from 'fs'
import { AnalysisUsage } from './entities/analysis-usage.entity'

const PRODUCER_BASE = process.env.SPEECH_PRODUCER_URL || 'https://speech-analytics-producer-kku6uewffq-uc.a.run.app'
const ANALYZE_TOKEN = process.env.SPEECH_ANALYZE_TOKEN || 'SAFindControl2026'

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name)
  constructor(
  @InjectRepository(Call)
  private callsRepo: Repository<Call>,

  @InjectRepository(Campaign)
  private campaignsRepo: Repository<Campaign>,

  @InjectRepository(CallIndicatorReview)
  private reviewsRepo: Repository<CallIndicatorReview>,

  // ← AGREGAR ESTO
  @InjectRepository(AnalysisUsage)
  private usageRepo: Repository<AnalysisUsage>,

  private readonly analysisProducer: AnalysisQueueProducer,
  private readonly campaignsService: CampaignsService,
) {}

  async create(dto: CreateCallDto, audioFile: Express.Multer.File): Promise<Call> {
    const campaign = await this.campaignsRepo.findOne({ where: { id: dto.campaignId } })
    if (!campaign) throw new BadRequestException('Campaña no encontrada')

    // ── Rechazar si la campaña está inactiva ─────────────────────────────────
    if (!campaign.isActive) {
      if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)
      throw new BadRequestException(
        'La campaña está inactiva y no acepta nuevas grabaciones. Se renueva automáticamente al inicio del próximo período.',
      )
    }

    // ── Evitar duplicados: misma campaña + mismo nombre de grabación ─────────
    const existing = await this.callsRepo.findOne({
      where: { campaignId: dto.campaignId, nombreGrabacion: dto.nombreGrabacion },
    })
    if (existing) {
      if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)
      throw new BadRequestException(
        `Ya existe una grabación con el nombre "${dto.nombreGrabacion}" en esta campaña`,
      )
    }

    const call = new Call()
    call.campaignId         = dto.campaignId
    call.nombreGrabacion    = dto.nombreGrabacion
    call.usuarioLlamada     = dto.usuarioLlamada ?? null
    call.fechaInicioLlamada = dto.fechaInicioLlamada ? new Date(dto.fechaInicioLlamada) : null
    call.fechaFinLlamada    = dto.fechaFinLlamada    ? new Date(dto.fechaFinLlamada)    : null
    call.idLlamada          = dto.idLlamada ?? null
    call.idContacto         = dto.idContacto ?? null
    call.audioTempPath      = audioFile.path
    call.status             = CallStatus.PENDING
    call.retryCount         = 0
    call.tipoLlamada = dto.tipoLlamada ?? null

    // Calcular duración: usar campo explícito, o calcular desde fechas si están disponibles
    call.duracionSegundos = this.calcularDuracion(
      dto.duracionSegundos,
      dto.fechaInicioLlamada,
      dto.fechaFinLlamada,
    )

    return this.callsRepo.save(call)
  }

  async createFromBase64(dto: CreateCallBase64Dto): Promise<Call> {
    const campaign = await this.campaignsRepo.findOne({ where: { id: dto.campaignId } })
    if (!campaign) throw new BadRequestException('Campaña no encontrada')

    // ── Rechazar si la campaña está inactiva ─────────────────────────────────
    if (!campaign.isActive) {
      throw new BadRequestException(
        'La campaña está inactiva y no acepta nuevas grabaciones. Se renueva automáticamente al inicio del próximo período.',
      )
    }

    const existing = await this.callsRepo.findOne({
      where: { campaignId: dto.campaignId, nombreGrabacion: dto.nombreGrabacion },
    })
    if (existing) throw new BadRequestException(
      `Ya existe una grabación con el nombre "${dto.nombreGrabacion}" en esta campaña`
    )
    const AUDIO_TEMP_DIR = join(process.cwd(), 'uploads', 'audio-temp')

    // Convertir base64 → archivo temporal en disco
    const ext = dto.audioExtension?.replace('.', '') ?? 'mp3'
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const tempPath = join(AUDIO_TEMP_DIR, filename)  // reutilizar la constante del controller

    if (!existsSync(AUDIO_TEMP_DIR)) mkdirSync(AUDIO_TEMP_DIR, { recursive: true })

    const buffer = Buffer.from(dto.audioBase64, 'base64')
    fs.writeFileSync(tempPath, buffer)

    const call = new Call()
    call.campaignId         = dto.campaignId
    call.nombreGrabacion    = dto.nombreGrabacion
    call.usuarioLlamada     = dto.usuarioLlamada     ?? null
    call.fechaInicioLlamada = dto.fechaInicioLlamada ? new Date(dto.fechaInicioLlamada) : null
    call.fechaFinLlamada    = dto.fechaFinLlamada    ? new Date(dto.fechaFinLlamada)    : null
    call.idLlamada          = dto.idLlamada          ?? null
    call.idContacto         = dto.idContacto         ?? null
    call.audioTempPath      = tempPath
    call.status             = CallStatus.PENDING
    call.retryCount         = 0
    call.tipoLlamada = dto.tipoLlamada ?? null

    call.duracionSegundos = this.calcularDuracion(
      dto.duracionSegundos,
      dto.fechaInicioLlamada,
      dto.fechaFinLlamada,
    )

    return this.callsRepo.save(call)
  }


  async findByAnalysisJobId(jobId: string): Promise<Call | null> {
    return this.callsRepo.findOne({ where: { analysisJobId: jobId } })
  }

  async getAnalysisJobStatus(id: string): Promise<{
    callId: string
    status: string
    analysisJobId: string | null
    hasResult: boolean
  }> {
    const call = await this.findOne(id)
    return {
      callId:        call.id,
      status:        call.status,
      analysisJobId: call.analysisJobId ?? null,
      hasResult:     !!call.analysisResult,
    }
  }

  /**
   * Llamado por el webhook cuando la API externa notifica que el job terminó.
   * Hace GET /result/{job_id} y persiste el resultado en la BD.
   */
  async handleWebhookResult(callDbId: string, jobId: string): Promise<void> {
  this.logger.log(`[Webhook] Resultado disponible — call=${callDbId} job_id=${jobId}`)
  try {
    // ── GUARDIA IDEMPOTENCIA ─────────────────────────────────────────────
    const existing = await this.callsRepo.findOne({ where: { id: callDbId } })
    if (!existing) {
      this.logger.warn(`[Webhook] call=${callDbId} no encontrada — ignorando`)
      return
    }
    if (existing.status === CallStatus.ANALYZED && existing.analysisJobId === jobId) {
      this.logger.warn(`[Webhook] call=${callDbId} job=${jobId} ya procesado — ignorando duplicado`)
      return
    }
    // ────────────────────────────────────────────────────────────────────
 
    const { data } = await axios.get(
      `${PRODUCER_BASE}/result/${jobId}`,
      { headers: { Authorization: `Bearer ${ANALYZE_TOKEN}` }, timeout: 60_000 },
    )
 
    const indicadores: any[] = Array.isArray(data.indicadores_calidad) ? data.indicadores_calidad : []
    const aplicables = indicadores.filter(ind => ind.aplica !== false)
 
    const scoreTotal = aplicables.reduce((acc, ind) => acc + (ind.puntaje_asignado ?? 0), 0)
    const scoreMax   = aplicables.reduce((acc, ind) => acc + (ind.Puntaje_Si_Hace ?? 0), 0)
    const indOk      = aplicables.filter(ind => ind.cumple === true).length
    const indTotal   = aplicables.length
 
    const pct = scoreMax > 0 ? Math.round((scoreTotal / scoreMax) * 100) : 0
    if (data.resultado_general) data.resultado_general.cumplimiento_porcentaje = pct
 
    // ── Duración real del audio ──────────────────────────────────────────
    const geminiDurSec: number | null =
      data.resultado_general?.duracion_llamada_segundos ??
      data.audio_duration_seconds                       ??
      data.duracion_segundos                            ??
      data.resultado_general?.audio_duration_seconds    ??
      data.resultado_general?.duracion_segundos         ??
      null
 
    const callUpdate: Partial<Call> = {
      status:         CallStatus.ANALYZED,
      analysisResult: JSON.stringify(data),
      scoreTotal,
      scoreMax,
      indOk,
      indTotal,
    }
 
    if (geminiDurSec != null && geminiDurSec > 0) {
      callUpdate.duracionSegundos = Math.round(geminiDurSec)
    }
 
    await this.callsRepo.update(callDbId, callUpdate)
    this.logger.log(`[Webhook] ✓ call=${callDbId} score=${scoreTotal}/${scoreMax} (${pct}%) dur=${geminiDurSec ?? 'n/a'}s`)
 
    // ── Duración final para facturación ──────────────────────────────────
    // Prioridad: Gemini > duracionSegundos preexistente > 0
    const durParaFacturar =
      (geminiDurSec && geminiDurSec > 0)
        ? geminiDurSec
        : (existing.duracionSegundos && existing.duracionSegundos > 0)
          ? existing.duracionSegundos
          : 0
 
    // ── Registrar uso (SIEMPRE, incluso en re-análisis) ───────────────────
    // Esto es el registro contable inmutable — nunca se borra
    await this.registerAnalysisUsage({
      callId:              callDbId,
      callNombreGrabacion: existing.nombreGrabacion,
      campaignId:          existing.campaignId,
      jobId,
      duracionSegundos:    durParaFacturar > 0 ? durParaFacturar : null,
      tokenUsage:          data.metadata?.token_usage ?? null,
      modelo:              data.metadata?.model ?? null,
    })
 
    // ── Descontar minutos de la campaña (límite mensual) ─────────────────
    // Solo si hay duración válida
    if (existing.campaignId && durParaFacturar > 0) {
      await this.campaignsService.addMinutesConsumed(existing.campaignId, durParaFacturar)
      this.logger.log(`[Webhook] Minutos sumados: ${(durParaFacturar / 60).toFixed(2)} min → campaña ${existing.campaignId}`)
    } else {
      this.logger.warn(`[Webhook] call=${callDbId} sin duración válida — no se sumaron minutos`)
    }
 
  } catch (err: any) {
    const detail = err.response?.data ?? err.message
    this.logger.error(`[Webhook] ✗ Error job=${jobId}: ${JSON.stringify(detail)}`)
    await this.callsRepo.update(callDbId, {
      status:       CallStatus.ERROR,
      errorMessage: typeof detail === 'string' ? detail : JSON.stringify(detail),
    })
  }
}

  async findByCampaign(campaignId: string): Promise<Call[]> {
    return this.callsRepo.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<Call> {
    const call = await this.callsRepo.findOne({ where: { id } })
    if (!call) throw new NotFoundException('Llamada no encontrada')
    return call
  }

  async remove(id: string): Promise<void> {
    const call = await this.findOne(id)
    if (call.audioTempPath && fs.existsSync(call.audioTempPath)) {
      fs.unlinkSync(call.audioTempPath)
    }
    await this.callsRepo.delete(id)
  }

  async updateStatus(
    id: string,
    status: CallStatus,
    extra?: Partial<Call>,
  ): Promise<void> {
    await this.callsRepo.update(id, { status, ...extra })
  }

  async findPendingUpload(): Promise<Call[]> {
    return this.callsRepo.find({
      where: { status: CallStatus.PENDING },
      take: 10,
    })
  }

  async findPendingAnalysis(): Promise<Call[]> {
    return this.callsRepo.find({
      where: { status: CallStatus.UPLOADED },
      take: 10,
    })
  }

  async getWorkerStats() {
    const counts = await this.callsRepo
      .createQueryBuilder('call')
      .select('call.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('call.status')
      .getRawMany()

    const errors = await this.callsRepo.find({
      where: { status: CallStatus.ERROR },
      order: { updatedAt: 'DESC' },
      take: 20,
      select: ['id', 'nombreGrabacion', 'errorMessage', 'retryCount', 'updatedAt', 'campaignId'],
    })

    return { counts, errors }
  }

  async getDashboardStats(allowedCampaignIds?: string[]) {
    const hasCampaignFilter = allowedCampaignIds && allowedCampaignIds.length > 0

    let countsQuery = this.callsRepo
      .createQueryBuilder('call')
      .select('call.status', 'status')
      .addSelect('COUNT(*)', 'count')

    if (hasCampaignFilter) {
      countsQuery = countsQuery.where('call.campaignId IN (:...ids)', { ids: allowedCampaignIds })
    }

    const counts = await countsQuery.groupBy('call.status').getRawMany()

    let recentQuery = this.callsRepo
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.campaign', 'campaign')
      .where('call.status IN (:...statuses)', { statuses: [CallStatus.ANALYZED, CallStatus.AUDITED] })

    if (hasCampaignFilter) {
      recentQuery = recentQuery.andWhere('call.campaignId IN (:...ids)', { ids: allowedCampaignIds })
    }

    const recent = await recentQuery
      .orderBy('call.updatedAt', 'DESC')
      .take(8)
      .getMany()

    let allCampaigns: { id: string; name: string; isActive: boolean }[]
    if (hasCampaignFilter) {
      allCampaigns = await this.campaignsRepo
        .createQueryBuilder('c')
        .select(['c.id', 'c.name', 'c.isActive'])
        .where('c.id IN (:...ids)', { ids: allowedCampaignIds })
        .getMany()
    } else {
      allCampaigns = await this.campaignsRepo.find({
        select: ['id', 'name', 'isActive'],
      })
    }

    let callStatsQuery = this.callsRepo
      .createQueryBuilder('call')
      .leftJoin('call.campaign', 'campaign')
      .select('campaign.id',   'campaignId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN call.status = 'ANALYZED' THEN 1 ELSE 0 END)`,                    'analyzed')
      .addSelect(`SUM(CASE WHEN call.status = 'AUDITED'  THEN 1 ELSE 0 END)`,                    'audited')
      .addSelect(`SUM(CASE WHEN call.status = 'ERROR'    THEN 1 ELSE 0 END)`,                    'errors')
      .addSelect(`AVG(CASE WHEN call.status IN ('ANALYZED','AUDITED') THEN call.scoreTotal ELSE NULL END)`, 'avgScore')
      .addSelect(`MAX(CASE WHEN call.status IN ('ANALYZED','AUDITED') THEN call.scoreMax   ELSE NULL END)`, 'scoreMax')

    if (hasCampaignFilter) {
      callStatsQuery = callStatsQuery.where('call.campaignId IN (:...ids)', { ids: allowedCampaignIds })
    }

    const callStats = await callStatsQuery.groupBy('campaign.id').getRawMany()

    const statsMap = Object.fromEntries(
      callStats.map((cs: any) => [cs.campaignId, cs])
    )

    const campaignStats = allCampaigns.map(campaign => {
      const cs = statsMap[campaign.id]
      return {
        campaignId:   campaign.id,
        campaignName: campaign.name,
        isActive:     campaign.isActive,
        total:        cs ? parseInt(cs.total)                                        : 0,
        analyzed:     cs ? parseInt(cs.analyzed || '0')                              : 0,
        audited:      cs ? parseInt(cs.audited  || '0')                              : 0,
        errors:       cs ? parseInt(cs.errors   || '0')                              : 0,
        avgScore:     cs?.avgScore ? parseFloat(parseFloat(cs.avgScore).toFixed(1))  : null,
        scoreMax:     cs?.scoreMax ? parseFloat(cs.scoreMax)                         : null,
      }
    })

    const campaignCount = allCampaigns.length
    const statusMap = Object.fromEntries(counts.map((c: any) => [c.status, parseInt(c.count)]))

    return {
      campaigns:    campaignCount,
      total:        Object.values(statusMap).reduce((a: any, b: any) => a + b, 0),
      pending:      statusMap['PENDING']   || 0,
      uploading:    statusMap['UPLOADING'] || 0,
      uploaded:     statusMap['UPLOADED']  || 0,
      analyzing:    statusMap['ANALYZING'] || 0,
      analyzed:     statusMap['ANALYZED']  || 0,
      audited:      statusMap['AUDITED']   || 0,
      errors:       statusMap['ERROR']     || 0,
      recentCalls: recent.map(c => ({
        id:         c.id,
        name:       c.nombreGrabacion,
        score:      c.scoreTotal,
        scoreMax:   c.scoreMax   ?? null,
        campaign:   c.campaign?.name,
        campaignId: c.campaign?.id,
        date:       c.updatedAt,
      })),
      campaignStats,
    }
  }

  /**
   * Reintenta o fuerza re-análisis de una grabación.
   *
   * El audio ya está en GCS (audioUri presente), por lo que NO hace falta
   * volver a subir el archivo. Se pone directamente en UPLOADED para que
   * el worker de análisis (BullMQ) lo procese sin pasar por UploadWorker.
   *
   * - ERROR    → UPLOADED  (el archivo ya estaba en GCS desde el intento anterior)
   * - ANALYZED / AUDITED → UPLOADED + limpia resultado anterior
   */
  async retryCall(id: string): Promise<void> {
    const call = await this.findOne(id)

    const allowedStatuses = [CallStatus.ERROR, CallStatus.ANALYZED, CallStatus.AUDITED]
    if (!allowedStatuses.includes(call.status)) {
      throw new BadRequestException(
        'Solo se pueden reintentar llamadas con estado ERROR, ANALYZED o AUDITED',
      )
    }

    // Si no tiene audioUri el archivo nunca llegó a GCS → re-subir desde cero
    if (!call.audioUri) {
      await this.callsRepo.update(id, {
        status:       CallStatus.PENDING,
        errorMessage: null,
        retryCount:   0,
      })
      return
    }

    const update: Partial<Call> = {
      status:       CallStatus.UPLOADED,  // ← salta directamente a análisis
      errorMessage: null,
      retryCount:   0,
    }

    // Si viene de ANALYZED/AUDITED, limpiar análisis anterior
    if (call.status === CallStatus.ANALYZED || call.status === CallStatus.AUDITED) {
      update.analysisResult    = null
      update.scoreTotal        = null
      update.scoreMax          = null
      update.indOk             = null
      update.indTotal          = null
      update.auditadoPorNombre = null
      update.auditadoPorUserId = null
      update.auditadoAt        = null
    }

    await this.callsRepo.update(id, update)

    // Encolar directamente en BullMQ → AnalysisQueueProcessor hace el análisis
    await this.analysisProducer.reenqueue(id)
    this.logger.log(`[Retry] call=${id} reencolado en BullMQ`)
  }

  // ── AUDITORÍA DE LLAMADA ─────────────────────────────────────────────────────

  async auditCall(
    id: string,
    auditor: { userId: string; nombre: string },
  ): Promise<Call> {
    const call = await this.findOne(id)
    if (call.status !== CallStatus.ANALYZED && call.status !== CallStatus.AUDITED) {
      throw new BadRequestException('Solo se pueden auditar llamadas con estado ANALYZED o AUDITED')
    }
    await this.callsRepo.update(id, {
      status:             CallStatus.AUDITED,
      auditadoPorNombre:  auditor.nombre,
      auditadoPorUserId:  auditor.userId,
      auditadoAt:         new Date(),
    })
    return this.findOne(id)
  }

  // ── REVISIONES DE INDICADORES ────────────────────────────────────────────────

  async saveIndicatorReview(
    callId: string,
    indicadorIndex: number,
    dto: CreateIndicatorReviewDto,
    auditor: { userId: string; nombre: string },
  ): Promise<CallIndicatorReview> {
    const call = await this.findOne(callId)
    if (call.status !== CallStatus.ANALYZED && call.status !== CallStatus.AUDITED) {
      throw new BadRequestException('Solo se pueden revisar llamadas con estado ANALYZED o AUDITED')
    }

    let valorAnteriorCumple: boolean | null = null
    let valorAnteriorPuntaje: number | null = null

    if (call.analysisResult) {
      try {
        const analysis = JSON.parse(call.analysisResult)
        const indicadores = analysis?.indicadores_calidad ?? []
        const ind = indicadores[indicadorIndex]
        if (ind) {
          valorAnteriorCumple  = ind.cumple ?? null
          valorAnteriorPuntaje = ind.puntaje_asignado ?? null
        }
      } catch {}
    }

    const lastReview = await this.reviewsRepo.findOne({
      where: { callId, indicadorIndex },
      order: { createdAt: 'DESC' },
    })
    if (lastReview) {
      valorAnteriorCumple  = lastReview.valorNuevoCumple
      valorAnteriorPuntaje = Number(lastReview.valorNuevoPuntaje)
    }

    const review = this.reviewsRepo.create({
      callId,
      indicadorIndex,
      indicadorNombre:      dto.indicadorNombre,
      valorAnteriorCumple,
      valorAnteriorPuntaje,
      valorNuevoCumple:     dto.valorNuevoCumple,
      valorNuevoPuntaje:    dto.valorNuevoPuntaje,
      nota:                 dto.nota ?? null,
      revisadoPorUserId:    auditor.userId,
      revisadoPorNombre:    auditor.nombre,
    })

    const saved = await this.reviewsRepo.save(review)
    await this.recalculateCallScores(callId)
    return saved
  }

  async getIndicatorReviews(callId: string): Promise<CallIndicatorReview[]> {
    await this.findOne(callId)
    return this.reviewsRepo.find({
      where: { callId },
      order: { createdAt: 'DESC' },
    })
  }

  async getLatestReviewsPerIndicator(callId: string): Promise<Record<number, CallIndicatorReview>> {
    const reviews = await this.getIndicatorReviews(callId)
    const latest: Record<number, CallIndicatorReview> = {}
    for (const r of reviews) {
      if (!latest[r.indicadorIndex]) {
        latest[r.indicadorIndex] = r
      }
    }
    return latest
  }

  private async recalculateCallScores(callId: string): Promise<void> {
    const call = await this.callsRepo.findOne({ where: { id: callId } })
    if (!call || !call.analysisResult) return

    let indicadores: any[] = []
    try {
      const analysis = JSON.parse(call.analysisResult)
      indicadores = analysis?.indicadores_calidad ?? []
    } catch {
      return
    }

    if (indicadores.length === 0) return

    const latestReviews = await this.getLatestReviewsPerIndicator(callId)

    let scoreTotal = 0
    let scoreMax   = 0
    let indOk      = 0
    const indTotal = indicadores.length

    for (let i = 0; i < indicadores.length; i++) {
      const ind    = indicadores[i]
      const review = latestReviews[i]

      const cumple  = review ? review.valorNuevoCumple           : ind.cumple
      const puntaje = review ? Number(review.valorNuevoPuntaje)  : ind.puntaje_asignado
      const maxPts  = ind.Puntaje_Si_Hace ?? 0

      scoreTotal += puntaje
      scoreMax   += maxPts
      if (cumple) indOk++
    }

    await this.callsRepo.update(callId, {
      scoreTotal,
      scoreMax,
      indOk,
      indTotal,
    })
  }

  // ── Helper: calcular duración desde fechas cuando no viene el campo explícito ──

  private calcularDuracion(
    duracionSegundos:   number | undefined,
    fechaInicioLlamada: string | undefined,
    fechaFinLlamada:    string | undefined,
  ): number | null {
    // 1. Si viene el campo explícito, usarlo
    if (duracionSegundos != null && duracionSegundos > 0) {
      return duracionSegundos
    }
    // 2. Calcular desde fechas
    if (fechaInicioLlamada && fechaFinLlamada) {
      const inicio = new Date(fechaInicioLlamada).getTime()
      const fin    = new Date(fechaFinLlamada).getTime()
      if (!isNaN(inicio) && !isNaN(fin) && fin > inicio) {
        return Math.round((fin - inicio) / 1000)
      }
    }
    return null
  }

  private async registerAnalysisUsage(params: {
  callId:              string
  callNombreGrabacion: string | null
  campaignId:          string | null
  jobId:               string
  duracionSegundos:    number | null
  tokenUsage:          any
  modelo:              string | null
}): Promise<void> {
  try {
    const { callId, callNombreGrabacion, campaignId, jobId, duracionSegundos, tokenUsage, modelo } = params
 
    // Contar cuántos análisis previos tiene esta grabación
    const intentosPrevios = await this.usageRepo.count({ where: { callId } })
 
    const resumen    = tokenUsage?.resumen    ?? null
    const costoDetalle = tokenUsage?.costo_detalle ?? null
 
    const usage = this.usageRepo.create({
      callId,
      callNombreGrabacion,
      campaignId,
      jobId,
      intentoNumero:    intentosPrevios + 1,
      duracionSegundos: duracionSegundos ?? null,
      duracionMinutos:  duracionSegundos ? duracionSegundos / 60 : null,
      promptTokens:     resumen?.total_prompt_tokens     ?? null,
      candidatesTokens: resumen?.total_candidates_tokens ?? null,
      totalTokens:      resumen?.total_tokens            ?? null,
      costoUsd:         resumen?.costo_estimado_usd      ?? costoDetalle?.costo_total_usd ?? null,
      costoDetalle:     costoDetalle ? JSON.stringify(costoDetalle) : null,
      modelo,
    })
 
    await this.usageRepo.save(usage)
    this.logger.log(
      `[Usage] Registrado: call=${callId} intento=${usage.intentoNumero} ` +
      `dur=${duracionSegundos ?? 'n/a'}s costo=$${usage.costoUsd?.toFixed(4) ?? 'n/a'}`
    )
  } catch (err) {
    // No fallar el webhook por un error de registro contable
    this.logger.error(`[Usage] Error registrando uso: ${err}`)
  }
}
 
 
// ─────────────────────────────────────────────────────────────────────────────
// getUsageSummary — método público nuevo para el endpoint de facturación
// Devuelve el resumen de consumo y costo por campaña o global
// ─────────────────────────────────────────────────────────────────────────────
 
async getUsageSummary(filters?: {
  campaignId?: string
  desde?:      Date
  hasta?:      Date
}): Promise<{
  totalAnalisis:    number
  totalMinutos:     number
  totalCostoUsd:    number
  totalTokens:      number
  porCampania:      any[]
}> {
  let query = this.usageRepo
    .createQueryBuilder('u')
    .leftJoin('u.campaign', 'c')
    .select('u.campaignId',           'campaignId')
    .addSelect('c.name',              'campaignName')
    .addSelect('COUNT(*)',            'totalAnalisis')
    .addSelect('SUM(u.duracionMinutos)', 'totalMinutos')
    .addSelect('SUM(u.costoUsd)',     'totalCostoUsd')
    .addSelect('SUM(u.totalTokens)', 'totalTokens')
 
  if (filters?.campaignId) {
    query = query.where('u.campaignId = :cid', { cid: filters.campaignId })
  }
  if (filters?.desde) {
    query = query.andWhere('u.createdAt >= :desde', { desde: filters.desde })
  }
  if (filters?.hasta) {
    query = query.andWhere('u.createdAt <= :hasta', { hasta: filters.hasta })
  }
 
  const rows = await query.groupBy('u.campaignId').addGroupBy('c.name').getRawMany()
 
  const totalAnalisis = rows.reduce((a, r) => a + parseInt(r.totalAnalisis || '0'), 0)
  const totalMinutos  = rows.reduce((a, r) => a + parseFloat(r.totalMinutos  || '0'), 0)
  const totalCostoUsd = rows.reduce((a, r) => a + parseFloat(r.totalCostoUsd || '0'), 0)
  const totalTokens   = rows.reduce((a, r) => a + parseInt(r.totalTokens    || '0'), 0)
 
  return {
    totalAnalisis,
    totalMinutos:  parseFloat(totalMinutos.toFixed(2)),
    totalCostoUsd: parseFloat(totalCostoUsd.toFixed(4)),
    totalTokens,
    porCampania: rows.map(r => ({
      campaignId:    r.campaignId,
      campaignName:  r.campaignName,
      totalAnalisis: parseInt(r.totalAnalisis || '0'),
      totalMinutos:  parseFloat(parseFloat(r.totalMinutos  || '0').toFixed(2)),
      totalCostoUsd: parseFloat(parseFloat(r.totalCostoUsd || '0').toFixed(4)),
      totalTokens:   parseInt(r.totalTokens   || '0'),
    })),
  }
}
}