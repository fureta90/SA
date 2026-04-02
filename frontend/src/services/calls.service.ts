import api from './api'
import type { Call, CreateCallDto } from '../types/calls.types'

export const callsService = {
  findByCampaign: (campaignId: string): Promise<Call[]> =>
    api.get(`/calls/campaign/${campaignId}`).then(r => r.data),

  findOne: (id: string): Promise<Call> =>
    api.get(`/calls/${id}`).then(r => r.data),

  create: (dto: CreateCallDto, audioFile: File): Promise<Call> => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    })
    return api.post('/calls', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  remove: (id: string): Promise<void> =>
    api.delete(`/calls/${id}`).then(r => r.data),

  retry: (id: string): Promise<void> =>
    api.post(`/calls/${id}/retry`).then(r => r.data),

  auditCall: (id: string): Promise<Call> =>
    api.patch(`/calls/${id}/audit`).then(r => r.data),

  getDashboardStats: (): Promise<any> =>
    api.get('/calls/stats/dashboard').then(r => r.data),

  /**
   * Consulta el estado del job de análisis asíncrono para una llamada.
   * Útil para hacer polling desde la UI cuando el análisis está en curso.
   */
  getJobStatus: (callId: string): Promise<{
    callId: string
    status: string
    analysisJobId: string | null
    hasResult: boolean
  }> =>
    api.get(`/calls/${callId}/job-status`).then(r => r.data),
}