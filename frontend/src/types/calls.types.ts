export type CallStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'AUDITED'
  | 'ERROR'

export interface Call {
  id: string
  campaignId: string
  nombreGrabacion: string
  usuarioLlamada?: string
  fechaInicioLlamada?: string
  fechaFinLlamada?: string
  idLlamada?: string
  idContacto?: string
  duracionSegundos?: number
  audioUri?: string
  callId?: string
  analysisResult?: string
  scoreTotal?: number
  scoreMax?: number
  indOk?: number
  indTotal?: number
  status: CallStatus
  errorMessage?: string
  retryCount: number
  // ── Auditoría ──────────────────────────────────────────────────────────────
  auditadoPorNombre?: string | null
  auditadoPorUserId?: string | null
  auditadoAt?: string | null
  createdAt: string
  updatedAt: string
  audioTempPath: string
}

export interface CreateCallDto {
  campaignId: string
  nombreGrabacion: string
  usuarioLlamada?: string
  fechaInicioLlamada?: string
  fechaFinLlamada?: string
  idLlamada?: string
  idContacto?: string
  duracionSegundos?: number
}