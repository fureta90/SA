export interface UploadAudioResponse {
  success: boolean
  gcs_uri: string
  original_filename: string
  processed_filename: string
  file_size_bytes: number
  duration_seconds: number
  sample_rate: number
  channels: number
  format: string
  processing_time_seconds: number
  improvements_applied: string[]
}

export interface TranscriptionTurn {
  ORADOR: string
  TEXTO: string
}

export interface IndicadorCalidad {
  INDICADOR: string
  Puntaje_Si_Hace: number
  Puntaje_No_Hace: number
  cumple: boolean
  puntaje_asignado: number
  evidencia_texto: string
  timestamp_evidencia: string
  aplica: boolean
  motivo_no_aplica: string | null
  requiere_revision_analista: boolean
  nota_revision: string | null
}

export interface AnalyzeAudioResponse {
  resultado_general: {
    transcripcion_completa: TranscriptionTurn[]
    contexto_llamada: Record<string, boolean | string>
    cumple_script: boolean
    cumplimiento_porcentaje: number
    requirio_transferencia: boolean
    resolucion_lograda: boolean
    nombrecliente: string
    nombreagente: string
    errores_graves: string[]
    motivo_contacto: string
    sentimiento_cliente: string
    sentimiento_agente: string
    conformidad_cliente: string
    duracion_llamada_segundos: number
  }
  indicadores_calidad: IndicadorCalidad[]
  metadata: {
    call_id: string
    audio_uri: string
    timestamp: string
    processing_time_seconds: number
    model: string
    total_indicadores: number
    indicadores_evaluados: number
    indicadores_que_aplican: number
    indicadores_no_aplican: number
    requieren_revision_analista: number
    intentos_realizados: number
    campaña: string
    equipo: string
  }
}

// ─── Configuración ───────────────────────────────────────────────────────────

const UPLOAD_URL = 'https://audio-processor-788612607917.us-central1.run.app/process'
const UPLOAD_TOKEN = '15555fa26720a601cd964bf4d6e5cbfbc6fa5422be2f7c5eed7dd9aac4367856'

const ANALYZE_URL = 'https://speech-analytics-788612607917.us-central1.run.app/analyze'
const ANALYZE_TOKEN = '0x00CFA7084BEDE74B87F2FAF95CA2D322020000007CA361A782BAF7E77D9293470D7221EE9B616F5280CDBCAFB1FEC8D3434D795AF6B726DF466C9F89DF3E66D65ED042EC24BCAE58726658FC647E92D164AC01C94782ADB2361B93D304EC48299B3DB1BB76982D9C24A3DB9C06CA699DCEF5E2CC'

// ─── Indicadores fijos ───────────────────────────────────────────────────────

const INDICADORES_BASE = [
  {
    INDICADOR: 'Saludo cordial',
    Puntaje_Si_Hace: 10,
    Puntaje_No_Hace: 0,
    descripcion: 'El agente saluda de manera cordial',
  },
  {
    INDICADOR: 'Identificación personal',
    Puntaje_Si_Hace: 10,
    Puntaje_No_Hace: 0,
    descripcion: 'Se identifica con nombre y empresa',
  },
  {
    INDICADOR: 'Escucha activa',
    Puntaje_Si_Hace: 15,
    Puntaje_No_Hace: 0,
    descripcion: 'Demuestra que escucha al cliente',
  },
  {
    INDICADOR: 'Ofrece soluciones',
    Puntaje_Si_Hace: 20,
    Puntaje_No_Hace: 0,
    descripcion: 'Propone soluciones al problema',
  },
  {
    INDICADOR: 'Despedida profesional',
    Puntaje_Si_Hace: 10,
    Puntaje_No_Hace: 0,
    descripcion: 'Se despide correctamente',
  },
]

// ─── Servicio ────────────────────────────────────────────────────────────────

export const speechAnalyticsService = {
  async uploadAudio(file: File, callId: string = 'CALL-001'): Promise<UploadAudioResponse> {
    const form = new FormData()
    form.append('file', file)
    form.append('call_id', callId)
    form.append('target_sample_rate', '16000')
    form.append('apply_filters', 'true')

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPLOAD_TOKEN}`,
      },
      body: form,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Error al subir el audio: ${err}`)
    }

    return res.json()
  },

  async analyzeAudio(
    audioUri: string,
    callId: string = 'call-12345'
  ): Promise<AnalyzeAudioResponse> {
    const res = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANALYZE_TOKEN}`,
      },
      body: JSON.stringify({
        audio_uri: audioUri,
        call_id: callId,
        indicadores: INDICADORES_BASE,
        metadata: {
          campaña: 'atencion_al_cliente',
          equipo: 'team_1',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Error al analizar el audio: ${err}`)
    }

    return res.json()
  },
}