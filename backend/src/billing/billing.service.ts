import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Campaign } from '../campaigns/entities/campaign.entity'

const GEMINI_COST_PER_MINUTE = parseFloat(process.env.GEMINI_COST_PER_MINUTE ?? '0.02')

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface CampaignBillingRow {
  campaignId:          string
  campaignName:        string
  isActive:            boolean
  // Minutos
  minutesConsumed:     number
  minutesLimit:        number | null
  minutesLimitEnabled: boolean
  limitPct:            number | null
  // Facturación
  pricePerMinute:      number | null
  geminiCost:          number
  clientPrice:         number | null
  margin:              number | null
  marginPct:           number | null
  // Período
  periodStartDate:     string | null
  periodDays:          number
  nextRenewalDate:     string | null
  daysUntilRenewal:    number | null
  currentPeriodLabel:  string | null
}

export interface BillingAdminSummary {
  totalMinutes:      number
  totalGeminiCost:   number
  totalClientPrice:  number
  totalMargin:       number
  marginPct:         number
  geminiCostPerMin:  number
  campaigns:         CampaignBillingRow[]
}

export interface BillingClientRow {
  campaignId:      string
  campaignName:    string
  isActive:        boolean
  minutesConsumed: number
  minutesLimit:    number | null
  limitPct:        number | null
  pricePerMinute:  number | null
  subtotal:        number | null
  // Período
  currentPeriodLabel: string | null
  daysUntilRenewal:   number | null
}

export interface BillingClientSummary {
  totalMinutes:  number
  totalPrice:    number | null
  campaigns:     BillingClientRow[]
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Campaign)
    private campaignsRepo: Repository<Campaign>,
  ) {}

  // ── Admin: resumen global de todas las campañas ──────────────────────────

  async getAdminSummary(): Promise<BillingAdminSummary> {
    const campaigns = await this.campaignsRepo.find()

    const rows: CampaignBillingRow[] = campaigns.map(c => this.toCampaignRow(c))

    const totalMinutes     = rows.reduce((s, r) => s + r.minutesConsumed, 0)
    const totalGeminiCost  = rows.reduce((s, r) => s + r.geminiCost, 0)
    const totalClientPrice = rows.reduce((s, r) => s + (r.clientPrice ?? 0), 0)
    const totalMargin      = totalClientPrice - totalGeminiCost
    const marginPct        = totalClientPrice > 0 ? Math.round((totalMargin / totalClientPrice) * 100) : 0

    return {
      totalMinutes:     parseFloat(totalMinutes.toFixed(2)),
      totalGeminiCost:  parseFloat(totalGeminiCost.toFixed(4)),
      totalClientPrice: parseFloat(totalClientPrice.toFixed(4)),
      totalMargin:      parseFloat(totalMargin.toFixed(4)),
      marginPct,
      geminiCostPerMin: GEMINI_COST_PER_MINUTE,
      campaigns:        rows,
    }
  }

  // ── Admin: configurar precio y período de una campaña ───────────────────

  async setCampaignBillingConfig(
    campaignId:     string,
    pricePerMinute: number | null,
    periodStartDate: Date | null,
    periodDays:     number,
  ): Promise<void> {
    const campaign = await this.campaignsRepo.findOne({ where: { id: campaignId } })
    if (!campaign) throw new NotFoundException(`Campaña ${campaignId} no encontrada`)
    await this.campaignsRepo.update(campaignId, { pricePerMinute, periodStartDate, periodDays })
  }

  // ── Cliente: sus campañas asignadas ─────────────────────────────────────

  async getClientSummary(campaignIds: string[]): Promise<BillingClientSummary> {
    if (campaignIds.length === 0) {
      return { totalMinutes: 0, totalPrice: null, campaigns: [] }
    }

    const campaigns = await this.campaignsRepo
      .createQueryBuilder('c')
      .where('c.id IN (:...ids)', { ids: campaignIds })
      .getMany()

    const rows: BillingClientRow[] = campaigns.map(c => {
      const mins       = c.minutesConsumed ?? 0
      const limitPct   = c.minutesLimitEnabled && c.minutesLimit
        ? Math.min(100, Math.round((mins / c.minutesLimit) * 100))
        : null
      const subtotal   = c.pricePerMinute != null ? parseFloat((mins * c.pricePerMinute).toFixed(4)) : null
      const period     = this.computePeriodInfo(c)

      return {
        campaignId:         c.id,
        campaignName:       c.name,
        isActive:           c.isActive,
        minutesConsumed:    parseFloat(mins.toFixed(2)),
        minutesLimit:       c.minutesLimit,
        limitPct,
        pricePerMinute:     c.pricePerMinute,
        subtotal,
        currentPeriodLabel: period.currentPeriodLabel,
        daysUntilRenewal:   period.daysUntilRenewal,
      }
    })

    const totalMinutes = rows.reduce((s, r) => s + r.minutesConsumed, 0)
    const hasPrice     = rows.some(r => r.pricePerMinute != null)
    const totalPrice   = hasPrice
      ? parseFloat(rows.reduce((s, r) => s + (r.subtotal ?? 0), 0).toFixed(4))
      : null

    return { totalMinutes: parseFloat(totalMinutes.toFixed(2)), totalPrice, campaigns: rows }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  toCampaignRow(c: Campaign): CampaignBillingRow {
    const mins       = c.minutesConsumed ?? 0
    const geminiCost = parseFloat((mins * GEMINI_COST_PER_MINUTE).toFixed(4))
    const clientPrice = c.pricePerMinute != null
      ? parseFloat((mins * c.pricePerMinute).toFixed(4))
      : null
    const margin    = clientPrice != null ? parseFloat((clientPrice - geminiCost).toFixed(4)) : null
    const marginPct = clientPrice != null && clientPrice > 0
      ? Math.round((margin! / clientPrice) * 100)
      : null
    const limitPct  = c.minutesLimitEnabled && c.minutesLimit
      ? Math.min(100, Math.round((mins / c.minutesLimit) * 100))
      : null
    const period    = this.computePeriodInfo(c)

    return {
      campaignId:          c.id,
      campaignName:        c.name,
      isActive:            c.isActive,
      minutesConsumed:     parseFloat(mins.toFixed(2)),
      minutesLimit:        c.minutesLimit,
      minutesLimitEnabled: c.minutesLimitEnabled,
      limitPct,
      pricePerMinute:      c.pricePerMinute,
      geminiCost,
      clientPrice,
      margin,
      marginPct,
      periodStartDate:     period.periodStartDate?.toISOString() ?? null,
      periodDays:          period.periodDays,
      nextRenewalDate:     period.nextRenewalDate?.toISOString() ?? null,
      daysUntilRenewal:    period.daysUntilRenewal,
      currentPeriodLabel:  period.currentPeriodLabel,
    }
  }

  computePeriodInfo(c: Campaign): {
    periodStartDate:    Date | null
    periodDays:         number
    nextRenewalDate:    Date | null
    daysUntilRenewal:   number | null
    currentPeriodLabel: string | null
  } {
    const days = c.periodDays ?? 30
    if (!c.periodStartDate) {
      return { periodStartDate: null, periodDays: days, nextRenewalDate: null, daysUntilRenewal: null, currentPeriodLabel: null }
    }

    const start     = new Date(c.periodStartDate)
    const now       = new Date()
    const msPeriod  = days * 864e5
    const elapsed   = now.getTime() - start.getTime()
    const periods   = Math.floor(elapsed / msPeriod)
    const curStart  = new Date(start.getTime() + periods * msPeriod)
    const nextRen   = new Date(start.getTime() + (periods + 1) * msPeriod)
    const daysLeft  = Math.max(0, Math.ceil((nextRen.getTime() - now.getTime()) / 864e5))
    const fmt       = (d: Date) =>
      `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    const periodEnd = new Date(nextRen); periodEnd.setDate(periodEnd.getDate() - 1)

    return {
      periodStartDate:    c.periodStartDate,
      periodDays:         days,
      nextRenewalDate:    nextRen,
      daysUntilRenewal:   daysLeft,
      currentPeriodLabel: `${fmt(curStart)} – ${fmt(periodEnd)}`,
    }
  }
}