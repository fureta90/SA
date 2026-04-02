import api from './api'
import type { Campaign, CreateCampaignDto, MinutesSummary, UpdateCampaignDto } from '../types/campaigns.types'

export const campaignsService = {
  async findAll(): Promise<Campaign[]> {
    const res = await api.get<Campaign[]>('/campaigns')
    return res.data
  },

  async findOne(id: string): Promise<Campaign> {
    const res = await api.get<Campaign>(`/campaigns/${id}`)
    return res.data
  },

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    const res = await api.post<Campaign>('/campaigns', dto)
    return res.data
  },

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const res = await api.patch<Campaign>(`/campaigns/${id}`, dto)
    return res.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`)
  },

  async getMinutesSummary(id: string): Promise<MinutesSummary> {
    const res = await api.get<MinutesSummary>(`/campaigns/${id}/minutes-summary`)
    return res.data
  },
}