import React, { useEffect, useRef, useState } from 'react'
import {
  Upload, FileAudio, Mic, CheckCircle, XCircle,
  Clock, User, Headphones, BarChart2, AlertTriangle,
  ChevronRight, ArrowLeft, Play, Pause, ChevronDown,
  ChevronUp, Maximize2, Minimize2, RotateCcw, Pencil, X,
  ShieldCheck,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { AudioPlayer } from '../components/AudioPlayer'
import {
  speechAnalyticsService,
  type UploadAudioResponse,
  type AnalyzeAudioResponse,
  type AnalysisProgress,
} from '../services/speechanalytics.service'
import { callsService } from '../services/calls.service'
import { useLang } from '../context/LangContext'
import api from '../services/api'

// ─── Audio URL resolution ─────────────────────────────────────────────────────
// Ya no resolvemos rutas locales del servidor.
// Para calls guardadas, pedimos una Signed URL al backend.
// Para uploads manuales, usamos el blob URL local.

async function fetchSignedAudioUrl(callId: string): Promise<string | null> {
  try {
    const { data } = await api.get(`/calls/${callId}/playback-url`)
    return data.url ?? null
  } catch (err) {
    console.error('No se pudo obtener la URL de audio:', err)
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndicadorCalidad {
  INDICADOR: string
  Puntaje_Si_Hace: number
  Puntaje_No_Hace: number
  cumple: boolean
  puntaje_asignado: number
  evidencia_texto?: string
  timestamp_evidencia?: string
  aplica: boolean
}

interface ReviewData {
  indicadorNombre: string
  valorNuevoCumple: boolean
  valorNuevoPuntaje: number
  nota?: string
}

interface ReviewRecord {
  id: string
  indicadorIndex: number
  valorAnteriorCumple: boolean | null
  valorAnteriorPuntaje: number | null
  valorNuevoCumple: boolean
  valorNuevoPuntaje: number
  nota: string | null
  revisadoPorNombre: string
  createdAt: string
}

// ─── Sentiment ────────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  positivo:     { emoji: '😊', label: 'Positivo',     color: '#16a34a', bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.28)' },
  satisfecho:   { emoji: '😄', label: 'Satisfecho',   color: '#16a34a', bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.28)' },
  neutral:      { emoji: '😐', label: 'Neutral',      color: '#b45309', bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.30)' },
  negativo:     { emoji: '😟', label: 'Negativo',     color: '#dc2626', bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.28)' },
  insatisfecho: { emoji: '😠', label: 'Insatisfecho', color: '#dc2626', bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.28)' },
}

const SentimentPill: React.FC<{ value: string }> = ({ value }) => {
  const cfg = SENTIMENT_CONFIG[value?.toLowerCase()] ?? SENTIMENT_CONFIG.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.55rem', borderRadius: '999px',
      fontSize: '0.72rem', fontWeight: 600,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, marginTop: '0.1rem',
    }}>
      <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{cfg.emoji}</span>
      {cfg.label}
    </span>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

interface ReviewModalProps {
  ind: IndicadorCalidad
  index: number
  callId?: string
  existingReview?: ReviewRecord | null
  onClose: () => void
  onSaved?: (index: number, review: ReviewData) => void
}

const ReviewModal: React.FC<ReviewModalProps> = ({ ind, index, callId, existingReview, onClose, onSaved }) => {
  const [cumple, setCumple]   = useState<boolean>(existingReview?.valorNuevoCumple ?? ind.cumple)
  const [puntaje, setPuntaje] = useState<number>(existingReview?.valorNuevoPuntaje ?? ind.puntaje_asignado)
  const [nota, setNota]       = useState<string>(existingReview?.nota ?? '')
  const [saving, setSaving]   = useState(false)

  const handleCumpleChange = (val: boolean) => {
    setCumple(val)
    setPuntaje(val ? ind.Puntaje_Si_Hace : ind.Puntaje_No_Hace)
  }

  const handleSave = async () => {
    const reviewData: ReviewData = {
      indicadorNombre: ind.INDICADOR,
      valorNuevoCumple: cumple,
      valorNuevoPuntaje: puntaje,
      nota: nota.trim() || undefined,
    }
    if (!callId) {
      onSaved?.(index, reviewData)
      onClose()
      return
    }
    setSaving(true)
    try {
      await api.post(`/calls/${callId}/indicators/${index}/review`, reviewData)
      onSaved?.(index, reviewData)
      Swal.fire({ icon: 'success', title: 'Revisión guardada', timer: 2000, showConfirmButton: false })
      onClose()
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la revisión.', confirmButtonColor: '#dc2626' })
    } finally {
      setSaving(false)
    }
  }

  const { t } = useLang()
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg-card,#1e2130)', border: '1px solid var(--border-color,rgba(128,128,128,0.2))', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <Pencil size={13} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.speech.reviewIndicator}</span>
              {!callId && (
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(234,179,8,0.15)', color: '#b45309', border: '1px solid rgba(234,179,8,0.3)' }}>
                  {t.speech.previewOnly}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>{ind.INDICADOR}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}><X size={16} /></button>
        </div>

        {/* Valores originales */}
        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(128,128,128,0.06)', border: '1px solid rgba(128,128,128,0.15)' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.speech.gemini}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {ind.cumple ? <CheckCircle size={12} style={{ color: '#16a34a' }} /> : <XCircle size={12} style={{ color: '#dc2626' }} />}
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ind.cumple ? '#16a34a' : '#dc2626' }}>{ind.cumple ? t.speech.scriptMeets : t.speech.doesNotMeet}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.speech.originalScore}</div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ind.puntaje_asignado} / {ind.Puntaje_Si_Hace}</span>
          </div>
          {existingReview && (
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.speech.lastReview}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{existingReview.revisadoPorNombre}</span>
            </div>
          )}
        </div>

        {/* Evidencia */}
        {ind.evidencia_texto && ind.evidencia_texto !== t.speech.noEvidenceFound && (
          <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: 'rgba(128,128,128,0.04)', border: '1px solid rgba(128,128,128,0.12)', borderLeft: '3px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.speech.evidence}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
              "{ind.evidencia_texto}"
              {ind.timestamp_evidencia && ind.timestamp_evidencia !== '00:00' && (
                <code style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ind.timestamp_evidencia}</code>
              )}
            </p>
          </div>
        )}

        {/* Cumple toggle */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>{t.speech.meetsIndicator}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[true, false].map(val => (
              <button key={String(val)} onClick={() => handleCumpleChange(val)} style={{
                flex: 1, padding: '0.55rem', borderRadius: '8px', cursor: 'pointer',
                border: `2px solid ${cumple === val ? (val ? '#16a34a' : '#dc2626') : 'rgba(128,128,128,0.2)'}`,
                background: cumple === val ? (val ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)') : 'rgba(128,128,128,0.05)',
                color: cumple === val ? (val ? '#16a34a' : '#dc2626') : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', transition: 'all 0.15s',
              }}>
                {val ? <><CheckCircle size={13} /> {t.speech.meets}</> : <><XCircle size={13} /> {t.speech.doesNotMeet}</>}
              </button>
            ))}
          </div>
        </div>

        {/* Puntaje */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            {t.speech.assignedScore}
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
              ({t.speech.range}: {ind.Puntaje_No_Hace} a {ind.Puntaje_Si_Hace})
            </span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="number" value={puntaje}
              onChange={e => setPuntaje(Number(e.target.value))}
              min={ind.Puntaje_No_Hace} max={ind.Puntaje_Si_Hace} step={0.5}
              style={{ width: '80px', padding: '0.5rem 0.625rem', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.25)', background: 'rgba(128,128,128,0.06)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', outline: 'none' }}
            />
            <input
              type="range" value={puntaje}
              onChange={e => setPuntaje(Number(e.target.value))}
              min={ind.Puntaje_No_Hace} max={ind.Puntaje_Si_Hace} step={0.5}
              style={{ flex: 1, accentColor: 'var(--color-primary)' }}
            />
          </div>
        </div>

        {/* Nota */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            {t.speech.auditorNote} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({t.speech.optional})</span>
          </label>
          <textarea
            value={nota} onChange={e => setNota(e.target.value)}
            placeholder={t.speech.notePlaceholder}
            rows={3}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.25)', background: 'rgba(128,128,128,0.06)', color: 'var(--text-primary)', fontSize: '0.8rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(128,128,128,0.25)', background: 'rgba(128,128,128,0.06)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
            {t.actions.cancel}
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: saving ? 'wait' : 'pointer', border: 'none', background: saving ? 'rgba(99,102,241,0.5)' : 'var(--color-primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1 }}>
            {saving && <span className="sa-spinner" style={{ width: 12, height: 12 }} />}
            {callId ? t.speech.saveReview : t.speech.applyChanges}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpeechAnalyticsViewProps {
  analysisResult?: string | null
  callName?: string
  audioUrl?: string
  callId?: string
  duracionSegundos?: number | null
  onBack?: () => void
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const SpeechAnalyticsView: React.FC<SpeechAnalyticsViewProps> = ({
  analysisResult, callName, audioUrl, callId, onBack, duracionSegundos
}) => {
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const floatingAudioRef = useRef<HTMLAudioElement>(null)

  const { t } = useLang()

  const [uploadData, setUploadData]     = useState<UploadAudioResponse | null>(null)
  const [analyzeData, setAnalyzeData]   = useState<AnalyzeAudioResponse | null>(
    analysisResult ? (() => { try { return JSON.parse(analysisResult) } catch { return null } })() : null
  )
  const [isAnalyzing, setIsAnalyzing]   = useState(false)
  const [isUploading, setIsUploading]   = useState(false)  // solo upload standalone (no usado en flujo combinado)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null)

  const [playerOpen, setPlayerOpen]           = useState(false)
  const [isPlaying, setIsPlaying]             = useState(false)
  const [indicadoresOpen, setIndicadoresOpen] = useState(true)

  const [reviewModal, setReviewModal]   = useState<{ ind: IndicadorCalidad; index: number } | null>(null)
  const [reviews, setReviews]           = useState<Record<number, ReviewRecord>>({})
  const [localOverrides, setLocalOverrides] = useState<Record<number, { cumple: boolean; puntaje_asignado: number }>>({})

  // ── Signed URL desde GCS ──────────────────────────────────────────────────
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null)
  const [audioLoading, setAudioLoading]     = useState(false)

  const isReadOnly       = !!analysisResult
  const analysisComplete = !!analyzeData

  // Para calls de campaña: pedir la signed URL al backend
  useEffect(() => {
    if (!callId) return
    setAudioLoading(true)
    fetchSignedAudioUrl(callId)
      .then(url => setSignedAudioUrl(url))
      .finally(() => setAudioLoading(false))
  }, [callId])

  // URL efectiva: signed URL (campaña) o blob URL (upload manual, solo tras análisis)
  const effectiveAudioUrl = signedAudioUrl
    ?? (analysisComplete ? uploadedBlobUrl : null)
    ?? undefined

  // Cargar revisiones existentes
  useEffect(() => {
    if (!callId) return
    api.get(`/calls/${callId}/reviews/latest`).then(res => setReviews(res.data)).catch(() => {})
  }, [callId])

  // Sync play state
  useEffect(() => {
    const audio = floatingAudioRef.current
    if (!audio) return
    const onPlay  = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [effectiveAudioUrl])

  // Cleanup blob URL
  useEffect(() => () => { if (uploadedBlobUrl) URL.revokeObjectURL(uploadedBlobUrl) }, [uploadedBlobUrl])

  const [metaOpen, setMetaOpen] = useState(false)
  const [callStatus, setCallStatus]     = useState<string | null>(null)
  const [auditMeta, setAuditMeta]       = useState<{ nombre: string; at: string } | null>(null)
  const [isAuditing, setIsAuditing]     = useState(false)

  // Inicializar estado desde la llamada si viene de campaña
  useEffect(() => {
    if (!callId) return
    api.get(`/calls/${callId}`).then(res => {
      setCallStatus(res.data.status ?? null)
      if (res.data.auditadoPorNombre && res.data.auditadoAt) {
        setAuditMeta({ nombre: res.data.auditadoPorNombre, at: res.data.auditadoAt })
      }
    }).catch(() => {})
  }, [callId])

  const handleAudit = async () => {
    if (!callId) return
    const result = await Swal.fire({
      title: t.speech.markAsAudited ?? 'Marcar como auditada',
      text: '¿Confirmas que esta grabación fue auditada?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#db2777',
      cancelButtonColor: 'rgba(128,128,128,0.3)',
      confirmButtonText: t.speech.markAsAudited ?? 'Marcar como auditada',
      cancelButtonText: t.actions.cancel,
      background: 'var(--bg-card, #1e2130)',
      color: 'var(--text-primary, #fff)',
    })
    if (!result.isConfirmed) return
    setIsAuditing(true)
    try {
      const updated = await callsService.auditCall(callId)
      setCallStatus(updated.status)
      if (updated.auditadoPorNombre && updated.auditadoAt) {
        setAuditMeta({ nombre: updated.auditadoPorNombre, at: updated.auditadoAt })
      }
      Swal.fire({ icon: 'success', title: t.speech.audited ?? 'Auditada', timer: 1800, showConfirmButton: false, background: 'var(--bg-card, #1e2130)', color: 'var(--text-primary, #fff)' })
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: t.speech.auditError ?? 'No se pudo marcar como auditada', confirmButtonColor: '#dc2626' })
    } finally {
      setIsAuditing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      Swal.fire({ icon: 'error', title: 'Formato inválido', text: 'Solo se permiten archivos de audio', confirmButtonColor: '#dc2626' })
      return
    }
    if (uploadedBlobUrl) URL.revokeObjectURL(uploadedBlobUrl)
    setUploadedBlobUrl(URL.createObjectURL(file))
    setSelectedFile(file)
    setUploadData(null); setAnalyzeData(null); setLocalOverrides({}); setAnalysisProgress(null)
  }

  // Indicadores fijos para modo standalone (sin campaña)
  const INDICADORES_STANDALONE = [
    { INDICADOR: 'Saludo cordial',          Puntaje_Si_Hace: 10, Puntaje_No_Hace: 0 },
    { INDICADOR: 'Identificación personal', Puntaje_Si_Hace: 10, Puntaje_No_Hace: 0 },
    { INDICADOR: 'Escucha activa',          Puntaje_Si_Hace: 15, Puntaje_No_Hace: 0 },
    { INDICADOR: 'Ofrece soluciones',       Puntaje_Si_Hace: 20, Puntaje_No_Hace: 0 },
    { INDICADOR: 'Despedida profesional',   Puntaje_Si_Hace: 10, Puntaje_No_Hace: 0 },
  ]

  /**
   * Flujo combinado: un solo botón — sube + analiza.
   * 1. POST /upload  → gcs_uri
   * 2. POST /analyze → job_id  (respuesta inmediata, PENDING)
   * 3. Polling GET /status/{job_id} cada 4s hasta COMPLETED
   * 4. GET /result/{job_id} → muestra transcripción e indicadores
   */
  const handleAnalyze = async () => {
    if (!selectedFile) return
    setIsAnalyzing(true)
    setAnalysisProgress({ phase: 'uploading', message: 'Subiendo audio...' })

    try {
      const callId = `manual-${Date.now()}`

      const result = await speechAnalyticsService.analyzeAudio(
        selectedFile,
        callId,
        INDICADORES_STANDALONE,
        (progress) => setAnalysisProgress(progress),
      )

      setAnalyzeData(result)
      setAnalysisProgress(null)

    } catch (err: any) {
      setAnalysisProgress(null)
      Swal.fire({
        icon: 'error',
        title: 'Error al analizar',
        text: err?.message ?? 'No se pudo procesar el audio',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      const res = await speechAnalyticsService.uploadAudio(selectedFile)
      setUploadData(res)
    } catch {
      Swal.fire({ icon: 'error', title: 'Error al subir', text: 'No se pudo procesar el audio', confirmButtonColor: '#dc2626' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null); setUploadData(null); setAnalyzeData(null); setLocalOverrides({}); setAnalysisProgress(null)
    if (uploadedBlobUrl) { URL.revokeObjectURL(uploadedBlobUrl); setUploadedBlobUrl(null) }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleFloatingPlay = () => {
    const audio = floatingAudioRef.current
    if (!audio) return
    audio.paused
      ? audio.play().catch(() => setPlayerOpen(true))
      : audio.pause()
  }

  const handleReviewSaved = (index: number, reviewData: ReviewData) => {
    if (!callId) {
      setLocalOverrides(prev => ({ ...prev, [index]: { cumple: reviewData.valorNuevoCumple, puntaje_asignado: reviewData.valorNuevoPuntaje } }))
    } else {
      setReviews(prev => ({
        ...prev,
        [index]: {
          id: 'pending', indicadorIndex: index,
          valorAnteriorCumple: null, valorAnteriorPuntaje: null,
          valorNuevoCumple: reviewData.valorNuevoCumple,
          valorNuevoPuntaje: reviewData.valorNuevoPuntaje,
          nota: reviewData.nota ?? null,
          revisadoPorNombre: 'Tú',
          createdAt: new Date().toISOString(),
        },
      }))
    }
  }

  const getEffectiveInd = (ind: IndicadorCalidad, index: number): IndicadorCalidad => {
    const review = reviews[index]
    const local  = localOverrides[index]
    if (review) return { ...ind, cumple: review.valorNuevoCumple, puntaje_asignado: Number(review.valorNuevoPuntaje) }
    if (local)  return { ...ind, ...local }
    return ind
  }

  const formatBytes    = (b: number) => b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`
  const formatDuration = (secs: number) => { const m = Math.floor(secs/60), s = Math.floor(secs%60); return `${m}:${s.toString().padStart(2,'0')}` }

  const rg          = analyzeData?.resultado_general
  const indicadores = analyzeData?.indicadores_calidad ?? []
  const effectiveInds = indicadores.map((ind, i) => getEffectiveInd(ind, i))

  const puntajeTotal = effectiveInds.filter(i => i.aplica !== false).reduce((a, i) => a + i.puntaje_asignado, 0)
  const puntajeMax   = effectiveInds.filter(i => i.aplica !== false).reduce((a, i) => a + i.Puntaje_Si_Hace, 0)
  const scorePct     = puntajeMax > 0 ? Math.round((puntajeTotal / puntajeMax) * 100) : 0

  const indQueAplican = effectiveInds.filter(i => i.aplica)
  const indAplicanPos = indQueAplican.filter(i => i.puntaje_asignado > 0)
  const pctAplican    = indQueAplican.length > 0 ? Math.round((indAplicanPos.length / indQueAplican.length) * 100) : 0
  const pctColor      = pctAplican >= 70 ? '#16a34a' : pctAplican >= 40 ? '#b45309' : '#dc2626'

  const indOk   = effectiveInds.filter(i => i.cumple).length
  const indFail = effectiveInds.length - indOk

  // ── Mostrar player flotante solo cuando hay audio Y análisis completo ─────
  const showFloatingPlayer = !!effectiveAudioUrl && analysisComplete

  return (
    <div className={`sa-root${playerOpen ? ' sa-root--player-open' : ''}`}>

      {/* Header */}
      <div className="calls-header sa-header" style={{ marginBottom: '1rem' }}>
        <div className="calls-header__top">
          <div className="calls-header__left">
            {onBack && <button className="calls-header__back" onClick={onBack} {...{title: t.actions.close}}><ArrowLeft size={16} /></button>}
            <div>
              <h2 className="calls-header__title">{isReadOnly ? (callName || t.speech.analysisResult) : t.speech.title}</h2>
              {isReadOnly && <p className="calls-header__sub">{t.speech.analysisResult}</p>}
            </div>
          </div>
          <div className="sa-header__actions">
          {/* Botón auditar — solo visible en modo lectura con análisis completado */}
          {isReadOnly && analyzeData && callId && (() => {
            const isAudited = callStatus === 'AUDITED'
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <button
                  onClick={isAudited ? undefined : handleAudit}
                  disabled={isAuditing || isAudited}
                  title={isAudited && auditMeta ? `${t.speech.alreadyAudited ?? 'Auditada por'} ${auditMeta.nombre}` : (t.speech.markAsAudited ?? 'Marcar como auditada')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    border: isAudited ? '1px solid rgba(219,39,119,0.35)' : '1px solid rgba(219,39,119,0.5)',
                    background: isAudited ? 'rgba(219,39,119,0.15)' : 'rgba(219,39,119,0.10)',
                    color: '#db2777',
                    fontSize: '0.78rem', fontWeight: 700,
                    cursor: isAudited ? 'default' : isAuditing ? 'wait' : 'pointer',
                    opacity: isAuditing ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isAudited && !isAuditing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(219,39,119,0.22)' }}
                  onMouseLeave={e => { if (!isAudited && !isAuditing) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(219,39,119,0.10)' }}
                >
                  {isAuditing
                    ? <><span className="sa-spinner" style={{ width: 12, height: 12, borderColor: '#db2777', borderTopColor: 'transparent' }} /> Guardando...</>
                    : <><ShieldCheck size={14} /> {isAudited ? (t.speech.audited ?? 'Auditada') : (t.speech.markAsAudited ?? 'Marcar como auditada')}</>
                  }
                </button>
                {isAudited && auditMeta && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {auditMeta.nombre} · {new Date(auditMeta.at).toLocaleDateString()}
                  </span>
                )}
              </div>
            )
          })()}
          {!isReadOnly && analysisComplete && (
            <button className="btn btn-primary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <RotateCcw size={14} /> {t.speech.newAudio}
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Modo upload */}
      {!isReadOnly && !analysisComplete && (
        <div className="card mb-6">
          <h3 className="card-title mb-4">{t.speech.title}</h3>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="sa-file-input" />
          <div className={`sa-dropzone ${selectedFile ? 'sa-dropzone--loaded' : ''}`} onClick={() => fileInputRef.current?.click()}>
            {selectedFile ? (
              <><FileAudio size={32} className="sa-dropzone__icon sa-dropzone__icon--loaded" /><p className="sa-dropzone__filename">{selectedFile.name}</p><p className="sa-dropzone__meta">{formatBytes(selectedFile.size)}</p></>
            ) : (
              <><Upload size={32} className="sa-dropzone__icon" /><p className="sa-dropzone__text">{t.speech.selectAudio}</p><p className="sa-dropzone__meta">{t.speech.audioFormats}</p></>
            )}
          </div>

          <div className="sa-actions">
            {/* Un solo botón: sube el audio y lanza el análisis asíncrono */}
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing}>
              {isAnalyzing
                ? <><span className="sa-spinner" /> {analysisProgress?.message ?? 'Analizando...'}</>
                : <><Mic size={16} /> Analizar grabación</>}
            </button>
          </div>

          {/* Barra de progreso del análisis asíncrono */}
          {isAnalyzing && analysisProgress && (
            <div style={{
              marginTop: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span className="sa-spinner" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {analysisProgress.message}
                </div>
                {analysisProgress.jobId && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Job ID: {analysisProgress.jobId}
                  </div>
                )}
                <div style={{
                  marginTop: '0.4rem',
                  height: '3px',
                  borderRadius: '999px',
                  background: 'rgba(99,102,241,0.15)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                    animation: 'sa-progress-indeterminate 1.4s ease-in-out infinite',
                    width: '40%',
                  }} />
                </div>
              </div>
              <div style={{
                fontSize: '0.65rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: 'rgba(99,102,241,0.15)',
                color: '#818cf8',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {analysisProgress.phase === 'uploading'   && 'Subiendo'}
                {analysisProgress.phase === 'queued'      && 'En cola'}
                {analysisProgress.phase === 'processing'  && 'Procesando'}
                {analysisProgress.phase === 'fetching'    && 'Cargando'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sin análisis */}
      {isReadOnly && !analyzeData && (
        <div className="empty-state">
          <BarChart2 size={48} className="empty-state__icon" />
          <h4 className="empty-state__title">{t.speech.analysisResult}</h4>
          <p className="empty-state__description">{t.speech.analyzing}</p>
        </div>
      )}

      {/* Resultados */}
      {analyzeData && rg && (
        <div className="sa-two-col">

          {/* Columna izquierda */}
          <div className="sa-left-col">

            <div className="card sa-summary-card">
              <div className="sa-persons">
                <div className="sa-persons__half">
                  <div className="sa-persons__role"><User size={11} /><span>CL</span></div>
                  <span className="sa-persons__name">{rg.nombrecliente}</span>
                  <SentimentPill value={rg.sentimiento_cliente} />
                </div>
                <div className="sa-persons__sep" />
                <div className="sa-persons__half">
                  <div className="sa-persons__role"><Headphones size={11} /><span>AG</span></div>
                  <span className="sa-persons__name">{rg.nombreagente}</span>
                  <SentimentPill value={rg.sentimiento_agente} />
                </div>
              </div>

              <div className="sa-stats">
                <div className="sa-stats__item">
                  <span className="sa-stats__lbl">{t.speech.score}</span>
                  <span className="sa-stats__val sa-stats__val--score">
                    {scorePct}<small>%</small>
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{puntajeTotal}/{puntajeMax} {t.speech.points}</div>
                  <div className="sa-stats__bar"><div className="sa-stats__bar-fill" style={{ width: `${scorePct}%` }} /></div>
                </div>
                <div className="sa-stats__divider" />
                <div className="sa-stats__item">
                  <span className="sa-stats__lbl">{t.speech.applyOk}</span>
                  <span className="sa-stats__val sa-stats__val--score" style={{ color: pctColor }}>{pctAplican}<small>%</small></span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{indAplicanPos.length}/{indQueAplican.length} {t.indicatorForm.titleSing.toLowerCase()}.</div>
                  <div className="sa-stats__bar"><div className="sa-stats__bar-fill" style={{ width: `${pctAplican}%`, background: pctColor }} /></div>
                </div>
                <div className="sa-stats__divider" />
                <div className="sa-stats__item">
                  <span className="sa-stats__lbl">{t.speech.duration}</span>
                  <span className="sa-stats__val">{formatDuration(duracionSegundos ?? rg.duracion_llamada_segundos ?? 0)}</span>
                </div>
                <div className="sa-stats__divider" />
                <div className="sa-stats__item">
                  <span className="sa-stats__lbl">{t.speech.resolution}</span>
                  <span className="sa-stats__val sa-stats__val">
                    <span className={`badge ${rg.resolucion_lograda ? 'badge-success' : 'badge-danger'}`}>
                      {rg.resolucion_lograda ? t.speech.resolved : t.speech.noResolution}
                    </span>
                  </span>
                </div>
              </div>

            </div>

            {/* ── Resumen — acordeón colapsable con scroll ── */}
            <div className={`card sa-ind-card sa-summary-accordion${metaOpen ? ' sa-ind-card--open' : ''}`}>
              <button className="sa-ind-card__toggle" onClick={() => setMetaOpen(v => !v)}>
                <div className="sa-ind-card__toggle-left" style={{ gap: '0.5rem' }}>
                  <ChevronRight size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span className="sa-ind-card__toggle-title">{t.speech.summary}</span>

                  {/* Pills de estado — mismo estilo uniforme */}
                  <SentimentPill value={rg.conformidad_cliente} />

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.2rem 0.55rem', borderRadius: '999px',
                    fontSize: '0.72rem', fontWeight: 600, flexShrink: 0,
                    background: rg.cumple_script ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                    border: `1px solid ${rg.cumple_script ? 'rgba(22,163,74,0.28)' : 'rgba(220,38,38,0.28)'}`,
                    color: rg.cumple_script ? '#16a34a' : '#dc2626',
                  }}>
                    {rg.cumple_script ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    Script {rg.cumple_script ? `${rg.cumplimiento_porcentaje}%` : '✗'}
                  </span>

                  {rg.errores_graves?.length > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.2rem 0.55rem', borderRadius: '999px',
                      fontSize: '0.72rem', fontWeight: 600, flexShrink: 0,
                      background: 'rgba(217,119,6,0.10)',
                      border: '1px solid rgba(217,119,6,0.28)',
                      color: '#d97706',
                    }}>
                      <AlertTriangle size={11} />
                      {rg.errores_graves.length} {rg.errores_graves.length === 1 ? 'error' : 'errori'}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {metaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {metaOpen && (
                <div className="sa-summary-accordion__body">
                  <div className="sa-meta-list" style={{ padding: '0.5rem 0.75rem 0.75rem' }}>
                    <div className="sa-meta-list__row">
                      <ChevronRight size={11} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                      <span className="sa-meta-list__key">{t.speech.summary}</span>
                      <span className="sa-meta-list__val">{rg.motivo_contacto}</span>
                    </div>
                    <div className="sa-meta-list__row">
                      <span style={{ flexShrink: 0, width: 11, height: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', lineHeight: 1 }}>
                        {SENTIMENT_CONFIG[rg.conformidad_cliente?.toLowerCase()]?.emoji ?? '😐'}
                      </span>
                      <span className="sa-meta-list__key">{t.speech.conformity}</span>
                      <span className="sa-meta-list__val" style={{ color: SENTIMENT_CONFIG[rg.conformidad_cliente?.toLowerCase()]?.color ?? '#b45309', fontWeight: 600 }}>
                        {SENTIMENT_CONFIG[rg.conformidad_cliente?.toLowerCase()]?.label ?? rg.conformidad_cliente}
                      </span>
                    </div>
                    <div className="sa-meta-list__row">
                      <CheckCircle size={11} style={{ flexShrink: 0, color: rg.cumple_script ? '#16a34a' : '#dc2626' }} />
                      <span className="sa-meta-list__key">{t.speech.script}</span>
                      <span className="sa-meta-list__val">{rg.cumple_script ? `${t.speech.scriptMeets} (${rg.cumplimiento_porcentaje}%)` : t.speech.scriptFails}</span>
                    </div>
                    {rg.errores_graves?.length > 0 && (
                      <>
                        <div className="sa-meta-list__row" style={{ alignItems: 'flex-start' }}>
                          <AlertTriangle size={11} style={{ flexShrink: 0, color: '#d97706', marginTop: '0.15rem' }} />
                          <span className="sa-meta-list__key">{t.speech.errors}</span>
                        </div>
                        {rg.errores_graves.map((err: string, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', paddingLeft: '1.4rem', paddingTop: '0.25rem' }}>
                            <span style={{ color: '#dc2626', fontSize: '0.7rem', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{err}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Indicadores */}
            <div className={`card sa-ind-card${indicadoresOpen ? ' sa-ind-card--open' : ''}`}>
              <button className="sa-ind-card__toggle" onClick={() => setIndicadoresOpen(v => !v)}>
                <div className="sa-ind-card__toggle-left">
                  <BarChart2 size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span className="sa-ind-card__toggle-title">{t.speech.qualityIndicators}</span>
                  <span className="sa-ind-badge sa-ind-badge--ok">{indOk}✓</span>
                  {indFail > 0 && <span className="sa-ind-badge sa-ind-badge--fail">{indFail}✗</span>}
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {indicadoresOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {indicadoresOpen && (
                <div className="sa-ind-list">
                  {indicadores.map((ind, i) => {
                    const eff       = getEffectiveInd(ind, i)
                    const hasReview = !!(reviews[i] || localOverrides[i])
                    return (
                      <div key={i} className={`sa-ind-row ${eff.cumple ? 'sa-ind-row--ok' : 'sa-ind-row--fail'}`}>
                        <div className="sa-ind-row__top">
                          {eff.cumple ? <CheckCircle size={13} className="sa-ind-row__icon-ok" /> : <XCircle size={13} className="sa-ind-row__icon-fail" />}
                          <span className="sa-ind-row__name">{ind.INDICADOR}</span>
                          <span className="sa-ind-row__pts" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {hasReview && (
                              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '999px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600 }}>
                                revisado
                              </span>
                            )}
                            {eff.puntaje_asignado}/{eff.Puntaje_Si_Hace}
                            {callStatus !== 'AUDITED' && (
                              <button
                                onClick={() => setReviewModal({ ind, index: i })}
                                title="Revisar indicador"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: '4px', transition: 'color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                              >
                                <Pencil size={11} />
                              </button>
                            )}
                          </span>
                        </div>
                        {eff.evidencia_texto && eff.evidencia_texto !== 'No se encontró evidencia en el audio' && (
                          <p className="sa-ind-row__ev">"{eff.evidencia_texto}"</p>
                        )}
                        {eff.timestamp_evidencia && eff.timestamp_evidencia !== '00:00' && (
                          <code className="sa-ind-row__ts">{eff.timestamp_evidencia}</code>
                        )}
                        {reviews[i]?.nota && (
                          <p style={{ fontSize: '0.72rem', color: '#818cf8', marginTop: '0.3rem', fontStyle: 'italic', paddingLeft: '0.25rem', borderLeft: '2px solid rgba(99,102,241,0.4)' }}>
                            💬 {reviews[i].nota}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha */}
          <div className="sa-right-col">
            <div className="card sa-transcript-card">
              <h3 className="card-title mb-3">{t.speech.transcription}</h3>
              <div className="sa-chat">
                {rg.transcripcion_completa.map((turn, i) => {
                  const isAgente = turn.ORADOR === 'Agente'
                  return (
                    <div key={i} className={`sa-chat__row ${isAgente ? 'sa-chat__row--ag' : 'sa-chat__row--cl'}`}>
                      <span className={`sa-chat__avatar ${isAgente ? 'sa-chat__avatar--ag' : 'sa-chat__avatar--cl'}`}>{isAgente ? 'AG' : 'CL'}</span>
                      <p className={`sa-chat__bubble ${isAgente ? 'sa-chat__bubble--ag' : 'sa-chat__bubble--cl'}`}>{turn.TEXTO}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB + Drawer — solo visible cuando hay análisis completo */}
      {showFloatingPlayer && (
        <>
          <audio ref={floatingAudioRef} src={effectiveAudioUrl} preload="none" />
          <div className={`sa-player-drawer ${playerOpen ? 'sa-player-drawer--open' : ''}`}>
            <AudioPlayer
              src={effectiveAudioUrl}
              title={callName || selectedFile?.name || 'Grabación'}
              onClose={() => setPlayerOpen(false)}
              audioRef={floatingAudioRef}
            />
          </div>
          <div className={`sa-fab${playerOpen ? ' sa-fab--hidden' : ''}`}>
            <button className={`sa-fab__play ${isPlaying ? 'sa-fab__play--on' : ''}`} onClick={toggleFloatingPlay} title={isPlaying ? 'Pausar' : 'Reproducir'}>
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button className={`sa-fab__expand ${playerOpen ? 'sa-fab__expand--on' : ''}`} onClick={() => setPlayerOpen(v => !v)} title={playerOpen ? 'Cerrar reproductor' : 'Reproductor completo'}>
              {playerOpen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </>
      )}

      {/* Modal de revisión */}
      {reviewModal && (
        <ReviewModal
          ind={reviewModal.ind}
          index={reviewModal.index}
          callId={callId}
          existingReview={reviews[reviewModal.index] ?? null}
          onClose={() => setReviewModal(null)}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  )
}