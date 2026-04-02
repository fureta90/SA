import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, IsNull } from 'typeorm'
import { Campaign } from '../campaigns/entities/campaign.entity'
import { Call, CallStatus } from '../calls/entities/call.entity'

@Injectable()
export class BillingPeriodService {
  private readonly logger = new Logger(BillingPeriodService.name)

  constructor(
    @InjectRepository(Campaign)
    private campaignsRepo: Repository<Campaign>,
    @InjectRepository(Call)
    private callsRepo: Repository<Call>,
  ) {}

  // ── Cron nocturno: 02:00 AM ───────────────────────────────────────────────

  @Cron('0 2 * * *', { name: 'billing-period-renewal' })
  async checkAndRenewPeriods(): Promise<void> {
    this.logger.log('[BillingPeriod] Iniciando verificación de períodos...')

    const campaigns = await this.campaignsRepo.find({
      where: { periodStartDate: Not(IsNull()) },
    })

    let renewed = 0
    const now   = new Date()

    for (const campaign of campaigns) {
      try {
        const nextRenewal = this.getNextRenewalDate(campaign.periodStartDate!, campaign.periodDays)
        if (now >= nextRenewal) {
          await this.renewCampaign(campaign, nextRenewal)
          renewed++
        }
      } catch (err: any) {
        this.logger.error(`[BillingPeriod] Error renovando campaña ${campaign.id}: ${err.message}`)
      }
    }

    this.logger.log(`[BillingPeriod] Verificación completa — ${renewed} campaña(s) renovada(s)`)
  }

  // ── Renovación manual desde el panel ─────────────────────────────────────

  async renewCampaignManual(campaignId: string): Promise<{ discarded: number; reactivated: boolean }> {
    const campaign = await this.campaignsRepo.findOne({ where: { id: campaignId } })
    if (!campaign || !campaign.periodStartDate) {
      throw new Error('La campaña no tiene período configurado')
    }
    const nextRenewal = this.getNextRenewalDate(campaign.periodStartDate, campaign.periodDays)
    return this.renewCampaign(campaign, nextRenewal)
  }

  // ── Helper: renovar una campaña ───────────────────────────────────────────

  private async renewCampaign(
    campaign: Campaign,
    nextRenewal: Date,
  ): Promise<{ discarded: number; reactivated: boolean }> {
    this.logger.log(`[BillingPeriod] Renovando campaña "${campaign.name}" (${campaign.id})`)

    // 1. Descartar grabaciones PENDING acumuladas durante la inactividad
    const discarded = await this.discardPendingCalls(campaign.id)
    if (discarded > 0) {
      this.logger.warn(`[BillingPeriod] Descartadas ${discarded} grabaciones PENDING de "${campaign.name}"`)
    }

    const update: Partial<Campaign> = {
      minutesConsumed: 0,
      periodStartDate: nextRenewal,  // avanzar al inicio del nuevo período
    }

    // 2. Reactivar solo si fue inactivada automáticamente por límite
    let reactivated = false
    if (!campaign.isActive && campaign.inactivatedByLimit) {
      update.isActive           = true
      update.inactivatedByLimit = false
      reactivated               = true
      this.logger.log(`[BillingPeriod] Campaña "${campaign.name}" reactivada automáticamente`)
    }

    await this.campaignsRepo.update(campaign.id, update)
    this.logger.log(
      `[BillingPeriod] ✓ "${campaign.name}": minutos reseteados, próximo período: ${nextRenewal.toISOString()}`,
    )

    return { discarded, reactivated }
  }

  // ── Descartar PENDING huérfanos ───────────────────────────────────────────

  private async discardPendingCalls(campaignId: string): Promise<number> {
    const pending = await this.callsRepo.find({
      where: { campaignId, status: CallStatus.PENDING },
    })

    for (const call of pending) {
      const fs = await import('fs')
      if (call.audioTempPath && fs.existsSync(call.audioTempPath)) {
        try { fs.unlinkSync(call.audioTempPath) } catch {}
      }
      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: 'Grabación descartada: recibida mientras la campaña estaba inactiva. El período se renovó.',
      })
    }

    return pending.length
  }

  // ── Cálculo de fechas ─────────────────────────────────────────────────────

  getNextRenewalDate(periodStartDate: Date, periodDays: number): Date {
    const start    = new Date(periodStartDate)
    const now      = new Date()
    const msPeriod = periodDays * 864e5
    const elapsed  = now.getTime() - start.getTime()
    const periods  = Math.floor(elapsed / msPeriod)
    return new Date(start.getTime() + (periods + 1) * msPeriod)
  }
}