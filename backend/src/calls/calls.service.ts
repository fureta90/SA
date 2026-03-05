import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { join } from 'path'
import * as fs from 'fs'
import { Call, CallStatus } from './entities/call.entity'
import { CallIndicatorReview } from './entities/call-indicator-review.entity'
import { CreateCallDto } from './dto/create-call.dto'
import { CreateIndicatorReviewDto } from './dto/create-indicator-review.dto'
import { Campaign } from '../campaigns/entities/campaign.entity'

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private callsRepo: Repository<Call>,
    @InjectRepository(Campaign)
    private campaignsRepo: Repository<Campaign>,
    @InjectRepository(CallIndicatorReview)
    private reviewsRepo: Repository<CallIndicatorReview>,
  ) {}

  async create(dto: CreateCallDto, audioFile: Express.Multer.File): Promise<Call> {
    const campaign = await this.campaignsRepo.findOne({ where: { id: dto.campaignId } })
    if (!campaign) throw new BadRequestException('Campaña no encontrada')

    const call = new Call()
    call.campaignId         = dto.campaignId
    call.nombreGrabacion    = dto.nombreGrabacion
    call.usuarioLlamada     = dto.usuarioLlamada ?? null
    call.fechaInicioLlamada = dto.fechaInicioLlamada ? new Date(dto.fechaInicioLlamada) : null
    call.fechaFinLlamada    = dto.fechaFinLlamada    ? new Date(dto.fechaFinLlamada)    : null
    call.idLlamada          = dto.idLlamada ?? null
    call.idContacto         = dto.idContacto ?? null
    call.duracionSegundos   = dto.duracionSegundos ?? null
    call.audioTempPath      = audioFile.path
    call.status             = CallStatus.PENDING
    call.retryCount         = 0

    return this.callsRepo.save(call)
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
    // Si se proporcionan IDs, filtrar solo esas campañas
    const hasCampaignFilter = allowedCampaignIds && allowedCampaignIds.length > 0

    // ── Counts por status (filtrado por campañas permitidas) ──
    let countsQuery = this.callsRepo
      .createQueryBuilder('call')
      .select('call.status', 'status')
      .addSelect('COUNT(*)', 'count')

    if (hasCampaignFilter) {
      countsQuery = countsQuery.where('call.campaignId IN (:...ids)', { ids: allowedCampaignIds })
    }

    const counts = await countsQuery.groupBy('call.status').getRawMany()

    // ── Recientes analizadas ──
    let recentQuery = this.callsRepo
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.campaign', 'campaign')
      .where('call.status = :status', { status: CallStatus.ANALYZED })

    if (hasCampaignFilter) {
      recentQuery = recentQuery.andWhere('call.campaignId IN (:...ids)', { ids: allowedCampaignIds })
    }

    const recent = await recentQuery
      .orderBy('call.updatedAt', 'DESC')
      .take(8)
      .getMany()

    // ── Campañas ──
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

    // ── Stats por campaña ──
    let callStatsQuery = this.callsRepo
      .createQueryBuilder('call')
      .leftJoin('call.campaign', 'campaign')
      .select('campaign.id',   'campaignId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN call.status = 'ANALYZED' THEN 1 ELSE 0 END)`, 'analyzed')
      .addSelect(`SUM(CASE WHEN call.status = 'ERROR'    THEN 1 ELSE 0 END)`, 'errors')
      .addSelect(`AVG(CASE WHEN call.status = 'ANALYZED' THEN call.scoreTotal ELSE NULL END)`, 'avgScore')

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
        errors:       cs ? parseInt(cs.errors   || '0')                              : 0,
        avgScore:     cs?.avgScore ? parseFloat(parseFloat(cs.avgScore).toFixed(1))  : null,
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
      errors:       statusMap['ERROR']     || 0,
      recentCalls: recent.map(c => ({
        id:         c.id,
        name:       c.nombreGrabacion,
        score:      c.scoreTotal,
        campaign:   c.campaign?.name,
        campaignId: c.campaign?.id,
        date:       c.updatedAt,
      })),
      campaignStats,
    }
  }

  async retryCall(id: string): Promise<void> {
    const call = await this.findOne(id)
    if (call.status !== CallStatus.ERROR) {
      throw new BadRequestException('Solo se pueden reintentar llamadas con estado ERROR')
    }
    await this.callsRepo.update(id, {
      status: CallStatus.PENDING,
      errorMessage: null,
    })
  }

  // ── AUDITORÍA DE LLAMADA ─────────────────────────────────────────────────────

  /**
   * Marca una llamada como AUDITED.
   * Solo puede auditarse una llamada en estado ANALYZED o AUDITED (toggle back no aplica aquí).
   */
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

  /**
   * Guarda una revisión de auditor para un indicador específico.
   * Puede llamarse múltiples veces: cada llamada genera un nuevo registro en el historial.
   */
  async saveIndicatorReview(
    callId: string,
    indicadorIndex: number,
    dto: CreateIndicatorReviewDto,
    auditor: { userId: string; nombre: string },
  ): Promise<CallIndicatorReview> {
    // Verificar que la llamada existe y está analizada o auditada
    const call = await this.findOne(callId)
    if (call.status !== CallStatus.ANALYZED && call.status !== CallStatus.AUDITED) {
      throw new BadRequestException('Solo se pueden revisar llamadas con estado ANALYZED o AUDITED')
    }

    // Parsear el JSON del análisis para obtener los valores anteriores
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
      } catch {
        // Si no se puede parsear, continuamos sin valores anteriores
      }
    }

    // Si ya hay una revisión previa, los "valores anteriores" son los de la última revisión
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

    // Recalcular scores de la llamada con las revisiones aplicadas
    await this.recalculateCallScores(callId)

    return saved
  }

  /**
   * Obtiene todas las revisiones de una llamada, ordenadas por fecha descendente.
   * Útil para mostrar el historial completo de auditoría.
   */
  async getIndicatorReviews(callId: string): Promise<CallIndicatorReview[]> {
    await this.findOne(callId) // valida que existe
    return this.reviewsRepo.find({
      where: { callId },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * Obtiene la revisión más reciente de cada indicador para una llamada.
   * Útil para saber el estado actual revisado de cada indicador.
   */
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

  /**
   * Recalcula scoreTotal, scoreMax, indOk e indTotal en la entidad Call
   * teniendo en cuenta las revisiones del auditor.
   */
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

    // Obtener la última revisión por cada indicador
    const latestReviews = await this.getLatestReviewsPerIndicator(callId)

    // Recalcular aplicando las revisiones sobre los datos originales
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
}