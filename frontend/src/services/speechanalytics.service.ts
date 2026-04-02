// ─── Interfaces ───────────────────────────────────────────────────────────────

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

// Respuesta inmediata del POST /analyze
export interface SubmitAnalysisResponse {
  job_id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'
  message: string
  poll_url: string
}

// Estado del job — GET /status/{job_id}
export interface JobStatusResponse {
  job_id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'
  created_at?: string
  updated_at?: string
  processing_time_seconds?: number
  result_gcs_uri?: string
  error?: string
}

// Mensaje de progreso para mostrar en la UI
export interface AnalysisProgress {
  phase: 'uploading' | 'queued' | 'processing' | 'fetching' | 'done' | 'error'
  message: string
  jobId?: string
}

// ─── Configuración ────────────────────────────────────────────────────────────

// ── Proxy a través del backend — nunca directo al producer externo ──
const PROXY_BASE = '/api-backend/speech'
const UPLOAD_URL   = `${PROXY_BASE}/upload`
const ANALYZE_URL  = `${PROXY_BASE}/analyze`
const STATUS_URL   = (jobId: string) => `${PROXY_BASE}/status/${jobId}`
const RESULT_URL   = (jobId: string) => `${PROXY_BASE}/result/${jobId}`


const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Helper de polling ────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function pollUntilDone(
  jobId: string,
  onProgress: (p: AnalysisProgress) => void,
  intervalMs = 4_000,
  timeoutMs  = 10 * 60 * 1000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await sleep(intervalMs)

    const res = await fetch(STATUS_URL(jobId), { headers: authHeader() })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Error al consultar estado: ${err}`)
    }

    const data: JobStatusResponse = await res.json()

    switch (data.status) {
      case 'PENDING':
        onProgress({ phase: 'queued',      message: 'En cola, esperando procesamiento...', jobId })
        break
      case 'PROCESSING':
        onProgress({ phase: 'processing',  message: 'Analizando audio con IA...', jobId })
        break
      case 'COMPLETED':
      case 'PARTIAL':
        onProgress({ phase: 'fetching',    message: 'Análisis completado, cargando resultado...', jobId })
        return   // ← sale del loop, el caller llama a /result
      case 'FAILED':
        throw new Error(`El análisis falló: ${data.error ?? 'error desconocido'}`)
    }
  }

  throw new Error(`Timeout: el job ${jobId} no terminó en ${timeoutMs / 60000} minutos`)
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const speechAnalyticsService = {

  /**
   * 1. Sube el audio al Producer.
   *    POST /upload → devuelve gcs_uri
   */
  async uploadAudio(
    file: File,
    callId: string = 'CALL-001',
    onProgress?: (p: AnalysisProgress) => void,
  ): Promise<UploadAudioResponse> {
    onProgress?.({ phase: 'uploading', message: 'Subiendo audio...' })

    const form = new FormData()
    form.append('file', file)
    form.append('call_id', callId)

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: authHeader(),
      body: form,
    })

    if (!res.ok) throw new Error(`Error al subir el audio: ${await res.text()}`)
    return res.json()
  },

  /**
   * 2. Encola el análisis.
   *    POST /analyze → devuelve { job_id, status: "PENDING", ... } de inmediato
   */
  async submitAnalysis(
    audioUri: string,
    callId: string,
    indicadores: any[],
    extraMetadata?: Record<string, any>,
  ): Promise<SubmitAnalysisResponse> {
    const res = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_uri:            audioUri,
        transcription_engine: 'gemini',
        call_id:              callId,
        indicadores,
        metadata: extraMetadata ?? {},
        // sin webhook_url — usamos polling directo desde el frontend
      }),
    })

    if (!res.ok) throw new Error(`Error al encolar el análisis: ${await res.text()}`)
    return res.json()
    // { job_id: "57e84997-...", status: "PENDING", message: "Job encolado", poll_url: "/status/..." }
  },

  /**
   * 3. Obtiene el resultado completo de un job terminado.
   *    GET /result/{job_id}
   */
  async getJobResult(jobId: string): Promise<AnalyzeAudioResponse> {
    const res = await fetch(RESULT_URL(jobId), { headers: authHeader() })
    if (!res.ok) throw new Error(`Error al obtener resultado: ${await res.text()}`)
    return res.json()
  },

  /**
   * Flujo completo para la SpeechAnalyticsView (upload manual):
   *   uploadAudio → submitAnalysis → polling hasta COMPLETED → getJobResult
   *
   * onProgress recibe actualizaciones en cada fase para mostrar en la UI.
   */
  async analyzeAudio(
    file: File,
    callId: string,
    indicadores: any[],
    onProgress: (p: AnalysisProgress) => void,
  ): Promise<AnalyzeAudioResponse> {

    // Paso 1: subir audio
    const uploadResult = await speechAnalyticsService.uploadAudio(file, callId, onProgress)

    // Paso 2: encolar análisis
    onProgress({ phase: 'queued', message: 'Encolando análisis...' })
    const submitted = await speechAnalyticsService.submitAnalysis(
      uploadResult.gcs_uri,
      callId,
      indicadores,
    )
    onProgress({ phase: 'queued', message: 'Job encolado, esperando procesamiento...', jobId: submitted.job_id })

    // Paso 3: polling hasta COMPLETED
    await pollUntilDone(submitted.job_id, onProgress)

    // Paso 4: obtener resultado
    onProgress({ phase: 'fetching', message: 'Descargando resultado...', jobId: submitted.job_id })
    const result = await speechAnalyticsService.getJobResult(submitted.job_id)

    onProgress({ phase: 'done', message: 'Análisis completado', jobId: submitted.job_id })
    return result
  },
}