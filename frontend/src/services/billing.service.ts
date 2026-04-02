import api from './api'

export interface CampaignBillingRow {
  campaignId:          string
  campaignName:        string
  isActive:            boolean
  minutesConsumed:     number
  minutesLimit:        number | null
  minutesLimitEnabled: boolean
  limitPct:            number | null
  pricePerMinute:      number | null
  geminiCost:          number
  clientPrice:         number | null
  margin:              number | null
  marginPct:           number | null
  periodStartDate:     string | null
  periodDays:          number
  nextRenewalDate:     string | null
  daysUntilRenewal:    number | null
  currentPeriodLabel:  string | null
}

export interface BillingAdminSummary {
  totalMinutes:     number
  totalGeminiCost:  number
  totalClientPrice: number
  totalMargin:      number
  marginPct:        number
  geminiCostPerMin: number
  campaigns:        CampaignBillingRow[]
}

export interface BillingClientRow {
  campaignId:         string
  campaignName:       string
  isActive:           boolean
  minutesConsumed:    number
  minutesLimit:       number | null
  limitPct:           number | null
  pricePerMinute:     number | null
  subtotal:           number | null
  currentPeriodLabel: string | null
  daysUntilRenewal:   number | null
}

export interface BillingClientSummary {
  totalMinutes: number
  totalPrice:   number | null
  campaigns:    BillingClientRow[]
}

export const billingService = {
  // Admin
  async getAdminSummary(): Promise<BillingAdminSummary> {
    const res = await api.get<BillingAdminSummary>('/billing/admin/summary')
    return res.data
  },

  async setCampaignConfig(
    campaignId:      string,
    pricePerMinute:  number | null,
    periodStartDate: string | null,
    periodDays:      number,
  ): Promise<void> {
    await api.patch(`/billing/admin/campaign/${campaignId}/config`, {
      pricePerMinute,
      periodStartDate,
      periodDays,
    })
  },

  async renewCampaign(campaignId: string): Promise<{ discarded: number; reactivated: boolean }> {
    const res = await api.post(`/billing/admin/campaign/${campaignId}/renew`, {})
    return res.data
  },

  // Cliente
  async getMyBilling(): Promise<BillingClientSummary> {
    const res = await api.get<BillingClientSummary>('/billing/me')
    return res.data
  },
}