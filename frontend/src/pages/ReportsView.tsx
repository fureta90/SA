import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  BarChart2, Calendar, CheckCircle, ChevronDown, Clock,
  Filter, LayoutGrid, LayoutList,
  Mic, RefreshCw, Search, TrendingUp, User, Users, X, Check,
  ArrowLeft,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { campaignsService } from '../services/campaigns.service'
import { callsService } from '../services/calls.service'
import { SpeechAnalyticsView } from './SpeechAnalyticsView'
import {
  toInputDate, getDefaultDateFrom, getDefaultDateTo,
  formatDisplayDate, formatDuration,
  DatePicker, MultiSelect, CallCard, CallRow,
} from '../components/CallShared'
import type { Call } from '../types/calls.types'
import type { Campaign } from '../types/campaigns.types'
import { WordCloud } from '../components/WordCloud'
// ─── SVG Icons for Excel & PDF ────────────────────────────────────────────────

const ExcelIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#185C37"/>
    <path d="M14 2V8H20L14 2Z" fill="#21A366"/>
    <path d="M8.5 13L10.3 16.5H10.35L12.2 13H13.8L11.25 17.5L13.9 22H12.25L10.35 18.5H10.3L8.4 22H6.8L9.45 17.5L6.85 13H8.5Z" fill="white"/>
  </svg>
)

const PdfIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#D32F2F"/>
    <path d="M14 2V8H20L14 2Z" fill="#F44336"/>
    <path d="M10.2 14.5C10.2 15.1 9.9 15.5 9.2 15.5H8.5V16.8H7.5V13.2H9.2C9.9 13.2 10.2 13.6 10.2 14.2V14.5ZM9.2 14.3C9.2 14.05 9.1 13.9 8.85 13.9H8.5V15H8.85C9.1 15 9.2 14.85 9.2 14.6V14.3ZM13.1 15.3C13.1 16.2 12.7 16.8 11.8 16.8H10.5V13.2H11.8C12.7 13.2 13.1 13.8 13.1 14.7V15.3ZM12.1 15.3V14.7C12.1 14.2 11.95 13.9 11.55 13.9H11.4V16.1H11.55C11.95 16.1 12.1 15.8 12.1 15.3ZM15.5 13.9V14.8H14.3V16.8H13.3V13.2H15.5V13.9Z" fill="white"/>
  </svg>
)

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'de','la','el','que','y','en','a','los','se','las','un','por','con','una','su','para',
  'es','al','lo','como','más','o','pero','sus','le','ya','fue','este','hay','ha',
  'yo','no','si','mi','te','me','ni','todo','muy','bien','puede','también',
  'cuando','sobre','ser','tiene','esta','eso','esto','sin','desde','hasta',
  'entonces','porque','después','antes','ahora','aquí','algo','así','entre',
  'solo','bien','quiero','voy','ver','hay','son','van','les','nos','del',
  'the','and','for','that','this','with','have','are','was','not','you','from',
  'they','we','his','her','it','be','been','would','could','should','will',
  'all','can','but','what','do','an','at','by','he','she','or','so','if',
])

// ─── Score bucket colors (red→orange→yellow→green) ───────────────────────────

const SCORE_BUCKET_COLORS = ['#dc2626', '#ea580c', '#d97706', '#f7be45', '#16a34a']

// ─── Chart colors ─────────────────────────────────────────────────────────────

const CHART_COLORS = ['#2c92e6','#4cc972','#7c3aed','#f59e0b','#dc2626','#0891b2','#db2777','#059669']
const SENTIMENT_COLORS: Record<string, string> = {
  positivo: '#16a34a', satisfecho: '#16a34a',
  neutral: '#f7be45',
  negativo: '#dc2626', insatisfecho: '#dc2626',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractWords = (calls: Call[]): Map<string, number> => {
  const map = new Map<string, number>()
  calls.forEach(call => {
    if (!call.analysisResult) return
    try {
      const parsed = JSON.parse(call.analysisResult)
      const trans = parsed?.resultado_general?.transcripcion_completa
      if (Array.isArray(trans)) {
        trans.forEach((turn: { TEXTO?: string }) => {
          if (!turn.TEXTO) return
          turn.TEXTO.toLowerCase()
            .replace(/[^a-záéíóúüñ\s]/gi, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !STOP_WORDS.has(w))
            .forEach(w => map.set(w, (map.get(w) ?? 0) + 1))
        })
      }
    } catch { /* ignore */ }
  })
  return map
}

const extractSentiment = (call: Call): string => {
  if (!call.analysisResult) return 'neutral'
  try {
    const parsed = JSON.parse(call.analysisResult)
    return parsed?.resultado_general?.sentimiento_cliente?.toLowerCase() ?? 'neutral'
  } catch { return 'neutral' }
}

// ─── SingleSelect (same style as MultiSelect / cf-multiselect__trigger) ───────

interface SingleSelectProps {
  label: string
  icon: React.ReactNode
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

const SingleSelect: React.FC<SingleSelectProps> = ({ label, icon, options, value, onChange, placeholder = 'Todos' }) => {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const ref        = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    setOpen(v => !v)
  }

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selectedLabel = value ? options.find(o => o.value === value)?.label ?? placeholder : placeholder
  const isActive = !!value

  return (
    <div className="cf-multiselect" ref={ref}>
      <p className="form-group__label">{label}</p>
      <button
        ref={triggerRef} type="button"
        className={`cf-multiselect__trigger ${open ? 'cf-multiselect__trigger--open' : ''} ${isActive ? 'cf-multiselect__trigger--active' : ''}`}
        onClick={handleOpen}
      >
        <span className="cf-multiselect__trigger-icon">{icon}</span>
        <span className="cf-multiselect__trigger-text">{selectedLabel}</span>
        {isActive && (
          <span
            className="cf-multiselect__badge"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            style={{ cursor: 'pointer' }}
            title="Limpiar"
          >
            <X size={10}/>
          </span>
        )}
        <ChevronDown size={13} className={`cf-multiselect__chevron ${open ? 'cf-multiselect__chevron--up' : ''}`}/>
      </button>

      {open && (
        <div className="cf-multiselect__dropdown"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: Math.max(dropPos.width, 200), zIndex: 9999 }}>
          {options.length > 6 && (
            <div className="cf-multiselect__search">
              <Search size={12}/>
              <input type="text" className="cf-multiselect__search-input" placeholder="Buscar..."
                value={search} onChange={e => setSearch(e.target.value)} autoFocus/>
              {search && <button className="cf-multiselect__search-clear" onClick={() => setSearch('')}><X size={10}/></button>}
            </div>
          )}

          <button type="button"
            className={`cf-multiselect__option cf-multiselect__option--all ${!value ? 'cf-multiselect__option--selected' : ''}`}
            onClick={() => { onChange(''); setOpen(false) }}>
            <span className="cf-multiselect__option-check">{!value && <Check size={11}/>}</span>
            <span>{placeholder}</span>
            <span className="cf-multiselect__option-count">{options.length}</span>
          </button>
          <div className="cf-multiselect__divider"/>

          {filtered.length === 0
            ? <p className="cf-multiselect__empty">Sin resultados</p>
            : filtered.map(opt => (
                <button key={opt.value} type="button"
                  className={`cf-multiselect__option ${value === opt.value ? 'cf-multiselect__option--selected' : ''}`}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch('') }}>
                  <span className="cf-multiselect__option-check">{value === opt.value && <Check size={11}/>}</span>
                  <span className="cf-multiselect__option-label">{opt.label}</span>
                </button>
              ))
          }
        </div>
      )}
    </div>
  )
}


// ─── Chart card wrapper ───────────────────────────────────────────────────────

const ChartCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; extra?: React.ReactNode }> = ({ icon, title, children, extra }) => (
  <div className="card" style={{ padding: '1.25rem' }}>
    <div className="reports-card-header">
      {icon}
      <h3 className="reports-card-title">{title}</h3>
      {extra}
    </div>
    {children}
  </div>
)

// ─── Filter Modal ─────────────────────────────────────────────────────────────

interface FilterModalProps {
  onClose: () => void
  onApply: () => void
  onClear: () => void
  tmpCampaign: string
  setTmpCampaign: (v: string) => void
  tmpUser: Set<string>
  setTmpUser: (v: Set<string>) => void
  tmpDateFrom: string
  setTmpDateFrom: (v: string) => void
  tmpDateTo: string
  setTmpDateTo: (v: string) => void
  campaignOptions: { value: string; label: string }[]
  uniqueUsers: string[]
  t: any
}

const FilterModal: React.FC<FilterModalProps> = ({
  onClose, onApply, onClear,
  tmpCampaign, setTmpCampaign,
  tmpUser, setTmpUser,
  tmpDateFrom, setTmpDateFrom,
  tmpDateTo, setTmpDateTo,
  campaignOptions, uniqueUsers, t,
}) => {
  const [openPicker, setOpenPicker] = useState<'from' | 'to' | null>(null)

  const handleApply = () => { onApply(); onClose() }
  const handleClear = () => { onClear(); onClose() }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card, #1e2130)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        borderRadius: '14px', width: '100%', maxWidth: '560px',
        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        maxHeight: '90vh', overflow: 'visible',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.reports.filtersTitle}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Dates */}
        <div>
          <p style={{
            fontSize: '0.78rem', fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: '0.5rem',
          }}>
            {t.reports.dateFrom} — {t.reports.dateTo}
          </p>
          <div className="calls-filter-dates">
            <div
              className="calls-search-field calls-search-field--date"
              onClick={() => setOpenPicker(p => p === 'from' ? null : 'from')}
            >
              <Calendar size={13} className="calls-search-field__icon" />
              <span className="calls-search-field__date-value">
                {formatDisplayDate(tmpDateFrom) || (
                  <span className="calls-search-field__date-value--placeholder">
                    {t.reports.dateFrom}...
                  </span>
                )}
              </span>
              {openPicker === 'from' && (
                <DatePicker
                  value={tmpDateFrom}
                  onChange={v => { setTmpDateFrom(v); setOpenPicker(null) }}
                  maxDate={tmpDateTo || toInputDate(new Date())}
                  onClose={() => setOpenPicker(null)}
                />
              )}
            </div>
            <span className="calls-filter-dates__sep">—</span>
            <div
              className="calls-search-field calls-search-field--date"
              onClick={() => setOpenPicker(p => p === 'to' ? null : 'to')}
            >
              <Calendar size={13} className="calls-search-field__icon" />
              <span className="calls-search-field__date-value">
                {formatDisplayDate(tmpDateTo) || (
                  <span className="calls-search-field__date-value--placeholder">
                    {t.reports.dateTo}...
                  </span>
                )}
              </span>
              {openPicker === 'to' && (
                <DatePicker
                  value={tmpDateTo}
                  onChange={v => { setTmpDateTo(v); setOpenPicker(null) }}
                  minDate={tmpDateFrom}
                  maxDate={toInputDate(new Date())}
                  onClose={() => setOpenPicker(null)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Campaign + User */}
        <div className="calls-filter-grid">
          <SingleSelect
            label={t.reports.campaign}
            icon={<BarChart2 size={13} />}
            options={campaignOptions}
            value={tmpCampaign}
            onChange={setTmpCampaign}
            placeholder={t.reports.allCampaigns}
          />
          <MultiSelect
            label={t.reports.user}
            icon={<User size={13} />}
            options={uniqueUsers}
            selected={tmpUser}
            onChange={setTmpUser}
            placeholder={t.reports.allUsers}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClear}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <X size={13} /> {t.reports.clearFilters}
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer',
              border: 'none', background: 'var(--color-primary)',
              color: '#fff', fontSize: '0.8rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}
          >
            <Filter size={13} /> {t.reports.apply}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ReportsViewProps {
  onBack?: () => void
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBack }) => {
  const { t } = useLang()
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate('/'))

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [allCalls,  setAllCalls]  = useState<Call[]>([])
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null)

  const [filtersOpen, setFiltersOpen] = useState(false)

  // Temp (editing)
  const [tmpCampaign, setTmpCampaign] = useState('')
  const [tmpUser,     setTmpUser]     = useState<Set<string>>(new Set())
  const [tmpDateFrom, setTmpDateFrom] = useState(getDefaultDateFrom())
  const [tmpDateTo,   setTmpDateTo]   = useState(getDefaultDateTo())

  // Applied
  const [campaign, setCampaign] = useState('')
  const [user,     setUser]     = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom())
  const [dateTo,   setDateTo]   = useState(getDefaultDateTo())

  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('list')
  const [analysisCall, setAnalysisCall] = useState<Call | null>(null)

  const reportContentRef = useRef<HTMLDivElement>(null)

  // ─── Load ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const camps = await campaignsService.findAll()
      setCampaigns(camps)
      const results = await Promise.all(
        camps.map(c => callsService.findByCampaign(c.id).catch(() => [] as Call[]))
      )
      setAllCalls(results.flat())
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Filter actions ───────────────────────────────────────────────────────
  const applyFilters = () => {
    setCampaign(tmpCampaign); setUser(tmpUser)
    setDateFrom(tmpDateFrom); setDateTo(tmpDateTo)
  }

  const clearFilters = () => {
    const df = getDefaultDateFrom(), dt = getDefaultDateTo()
    setTmpCampaign(''); setTmpUser(new Set()); setTmpDateFrom(df); setTmpDateTo(dt)
    setCampaign('');    setUser(new Set());    setDateFrom(df);    setDateTo(dt)
  }

  const hasActiveFilters = campaign !== '' || user.size > 0 ||
    dateFrom !== getDefaultDateFrom() || dateTo !== getDefaultDateTo()

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredCalls = useMemo(() => allCalls.filter(call => {
    if (campaign && call.campaignId !== campaign) return false
    if (user.size > 0 && !user.has(call.usuarioLlamada ?? '')) return false
    const refDate = (call.fechaInicioLlamada || call.createdAt || '').split('T')[0]
    if (refDate) {
      if (dateFrom && refDate < dateFrom) return false
      if (dateTo   && refDate > dateTo)   return false
    }
    return true
  }), [allCalls, campaign, user, dateFrom, dateTo])

  const analyzedCalls = useMemo(() =>
    filteredCalls.filter(c => (c.status === 'ANALYZED' || c.status === 'AUDITED') && c.scoreTotal != null),
    [filteredCalls]
  )

  const avgScore = useMemo(() => {
    const scored = analyzedCalls.filter(c => c.scoreMax && c.scoreMax > 0)
    if (!scored.length) return null
    return (scored.reduce((s, c) => s + (c.scoreTotal! / c.scoreMax!) * 100, 0) / scored.length).toFixed(1)
  }, [analyzedCalls])

  const avgDuration = useMemo(() => {
    const w = filteredCalls.filter(c => c.duracionSegundos && c.duracionSegundos > 0)
    if (!w.length) return null
    return formatDuration(Math.round(w.reduce((s, c) => s + (c.duracionSegundos ?? 0), 0) / w.length))
  }, [filteredCalls])

  // Chart data
  const scoreDistData = useMemo(() => {
    const buckets = [
      { range: '0-20', count: 0 }, { range: '20-40', count: 0 },
      { range: '40-60', count: 0 }, { range: '60-80', count: 0 },
      { range: '80-100', count: 0 },
    ]
    analyzedCalls.forEach(c => {
      if (!c.scoreMax || c.scoreMax <= 0 || c.scoreTotal == null) return
      const pct = (c.scoreTotal / c.scoreMax) * 100
      if (!isFinite(pct)) return
      const idx = Math.min(Math.floor(Math.max(0, Math.min(100, pct)) / 20), 4)
      buckets[idx].count++
    })
    return buckets
  }, [analyzedCalls])

  const callsOverTimeData = useMemo(() => {
    const map = new Map<string, { date: string; total: number; analyzed: number; audited: number }>()
    filteredCalls.forEach(c => {
      const d = (c.fechaInicioLlamada || c.createdAt || '').split('T')[0]
      if (!d) return
      const ex = map.get(d) ?? { date: d, total: 0, analyzed: 0, audited: 0 }
      ex.total++
      if (c.status === 'ANALYZED') ex.analyzed++
      if (c.status === 'AUDITED')  ex.audited++
      map.set(d, ex)
    })
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, date: formatDisplayDate(d.date) }))
  }, [filteredCalls])

  const callsByUserData = useMemo(() => {
    const map = new Map<string, { total: number; analyzed: number; audited: number }>()
    filteredCalls.forEach(c => {
      const u = c.usuarioLlamada || '(sin usuario)'
      const ex = map.get(u) ?? { total: 0, analyzed: 0, audited: 0 }
      ex.total++
      if (c.status === 'ANALYZED') ex.analyzed++
      if (c.status === 'AUDITED')  ex.audited++
      map.set(u, ex)
    })
    return Array.from(map.entries())
      .map(([user, d]) => ({ user, ...d }))
      .sort((a, b) => b.total - a.total)
  }, [filteredCalls])

  // Status distribution pie chart
  const statusDistData = useMemo(() => {
    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'Pendiente', UPLOADING: 'Subiendo', UPLOADED: 'Subida',
      ANALYZING: 'Analizando', ANALYZED: 'Analizada', AUDITED: 'Auditada', ERROR: 'Error',
    }
    const STATUS_COLORS_PIE: Record<string, string> = {
      PENDING: '#9ca3af', UPLOADING: '#d97706', UPLOADED: '#0891b2',
      ANALYZING: '#7c3aed', ANALYZED: '#059669', AUDITED: '#db2777', ERROR: '#dc2626',
    }
    const map = new Map<string, number>()
    filteredCalls.forEach(c => map.set(c.status, (map.get(c.status) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] ?? status,
        value: count,
        color: STATUS_COLORS_PIE[status] ?? '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredCalls])

  const callsByCampaignData = useMemo(() => {
    const map = new Map<string, number>()
    filteredCalls.forEach(c => {
      const name = campaigns.find(camp => camp.id === c.campaignId)?.name ?? c.campaignId
      map.set(name, (map.get(name) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredCalls, campaigns])

  const sentimentData = useMemo(() => {
    const map = new Map<string, number>()
    analyzedCalls.forEach(c => {
      const s = extractSentiment(c)
      map.set(s, (map.get(s) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [analyzedCalls])

  const wordMap  = useMemo(() => extractWords(analyzedCalls), [analyzedCalls])

  // ── Indicator ranking: average score per indicator across all analyzed calls ──
  const indicatorRankingData = useMemo(() => {
    const map = new Map<string, { name: string; totalPct: number; count: number; okCount: number }>()
    analyzedCalls.forEach(call => {
      if (!call.analysisResult) return
      try {
        const parsed = JSON.parse(call.analysisResult)
        const inds = parsed?.indicadores_calidad ?? []
        inds.forEach((ind: any) => {
          const name = ind.INDICADOR ?? `Indicador ${ind.index}`
          const existing = map.get(name) ?? { name, totalPct: 0, count: 0, okCount: 0 }
          const max = ind.Puntaje_Si_Hace ?? 0
          const pct = max > 0 ? (ind.puntaje_asignado / max) * 100 : 0
          existing.totalPct += pct
          existing.count++
          if (ind.cumple) existing.okCount++
          map.set(name, existing)
        })
      } catch { /* ignore */ }
    })
    return Array.from(map.values())
      .map(d => ({
        name: d.name.length > 40 ? d.name.substring(0, 38) + '…' : d.name,
        fullName: d.name,
        avgPct: Math.round(d.totalPct / d.count),
        compliance: Math.round((d.okCount / d.count) * 100),
        count: d.count,
      }))
      .sort((a, b) => a.avgPct - b.avgPct) // worst to best
  }, [analyzedCalls])

  const uniqueUsers = useMemo(() =>
    [...new Set(allCalls.map(c => c.usuarioLlamada).filter(Boolean) as string[])].sort(),
    [allCalls]
  )
  const campaignOptions = useMemo(() =>
    campaigns.map(c => ({ value: c.id, label: c.name })),
    [campaigns]
  )

  // ─── Redirect to SpeechAnalytics ─────────────────────────────────────────
  if (analysisCall) {
    return (
      <SpeechAnalyticsView
        analysisResult={analysisCall.analysisResult}
        callName={analysisCall.nombreGrabacion}
        audioUrl={analysisCall.audioTempPath ?? undefined}
        callId={analysisCall.id}
        onBack={() => { setAnalysisCall(null); loadData() }}
      />
    )
  }

  // ─── Exports ─────────────────────────────────────────────────────────────
  const handleExportXlsx = async () => {
    setExporting('xlsx')
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs' as any)
      const wb   = XLSX.utils.book_new()
      const campName  = campaign ? (campaigns.find(c => c.id === campaign)?.name ?? campaign) : t.reports.allCampaigns
      const userLabel = user.size > 0 ? [...user].join(', ') : t.reports.allUsers
      const wsSummary = XLSX.utils.aoa_to_sheet([
        [t.reports.reportTitle],
        [`${t.reports.generatedOn}: ${new Date().toLocaleDateString()}`],
        [],
        [t.reports.campaign + ':', campName],
        [t.reports.user + ':',     userLabel],
        [t.reports.dateFrom + ':', formatDisplayDate(dateFrom)],
        [t.reports.dateTo + ':',   formatDisplayDate(dateTo)],
        [],
        [t.reports.totalCalls + ':',    filteredCalls.length],
        [t.reports.analyzedCalls + ':', analyzedCalls.length],
        [t.reports.avgScore + ':',      avgScore ? `${avgScore}%` : '—'],
        [t.reports.avgDuration + ':',   avgDuration ?? '—'],
      ])
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, t.reports.summary)
      const wsDetail = XLSX.utils.aoa_to_sheet([
        [t.reports.callName, t.reports.campaignLabel, t.reports.userLabel, t.reports.date, t.reports.status, t.reports.score, t.reports.duration],
        ...filteredCalls.map(c => [
          c.nombreGrabacion,
          campaigns.find(x => x.id === c.campaignId)?.name ?? '',
          c.usuarioLlamada ?? '',
          formatDisplayDate((c.fechaInicioLlamada || c.createdAt || '').split('T')[0]),
          c.status,
          c.scoreMax ? `${((c.scoreTotal ?? 0) / c.scoreMax * 100).toFixed(1)}%` : '—',
          formatDuration(c.duracionSegundos),
        ]),
      ])
      wsDetail['!cols'] = [{ wch:30 }, { wch:20 }, { wch:20 }, { wch:12 }, { wch:12 }, { wch:10 }, { wch:10 }]
      XLSX.utils.book_append_sheet(wb, wsDetail, t.reports.callDetail)
      XLSX.writeFile(wb, `reporte_${new Date().toISOString().split('T')[0]}.xlsx`)
      Swal.fire({ icon:'success', title:t.reports.exportSuccess, timer:2000, showConfirmButton:false })
    } catch (e) {
      console.error(e)
      Swal.fire({ icon:'error', title:t.reports.exportError, confirmButtonColor:'#dc2626' })
    } finally { setExporting(null) }
  }

  const handleExportPdf = async () => {
    if (!reportContentRef.current) return
    setExporting('pdf')
    try {
      const campName  = campaign ? (campaigns.find(c => c.id === campaign)?.name ?? campaign) : t.reports.allCampaigns
      const dateRange = `${formatDisplayDate(dateFrom)} — ${formatDisplayDate(dateTo)}`
      const userLbl   = user.size > 0 ? [...user].join(', ') : t.reports.allUsers
      const involvedCampaigns = campaign
        ? campaigns.filter(c => c.id === campaign)
        : campaigns.filter(c => filteredCalls.some(call => call.campaignId === c.id))

      // ── Capture each chart card as a PNG via html2canvas ─────────────────
      // Dynamically load html2canvas
      let html2canvas: any
      try {
        const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js' as any)
        html2canvas = mod.default ?? mod
      } catch {
        html2canvas = null
      }

      const captureCard = async (card: HTMLElement): Promise<string> => {
        if (!html2canvas) return ''
        try {
          const canvas = await html2canvas(card, {
            backgroundColor: '#f8fafc',
            scale: 1.5,
            useCORS: true,
            logging: false,
            removeContainer: true,
          })
          return canvas.toDataURL('image/png')
        } catch { return '' }
      }

      // Identify chart cards by their title
      const CHART_TITLES_SMALL = [
        t.reports.scoreDistribution,
        t.reports.callsOverTime,
        t.reports.sentimentDistribution,
        'Distribución por estado',
        t.reports.callsByCampaign,
      ]

      interface ChartImg { title: string; img: string; wide?: boolean }
      const chartImgs: ChartImg[] = []

      if (html2canvas && reportContentRef.current) {
        const allCards = Array.from(reportContentRef.current.querySelectorAll('.card')) as HTMLElement[]

        for (const title of CHART_TITLES_SMALL) {
          const card = allCards.find(c => c.querySelector('.reports-card-title')?.textContent?.trim() === title)
          if (card) {
            const img = await captureCard(card)
            if (img) chartImgs.push({ title, img })
          }
        }

        // User chart — wide
        const userCard = allCards.find(c =>
          c.querySelector('.reports-card-title')?.textContent?.includes(t.reports.callsByUser)
        )
        if (userCard) {
          const img = await captureCard(userCard)
          if (img) chartImgs.push({ title: t.reports.callsByUser, img, wide: true })
        }
      }

      // Build charts HTML
      const smallCharts = chartImgs.filter(c => !c.wide)
      const wideCharts  = chartImgs.filter(c => c.wide)

      const chartsGridHtml = smallCharts.length > 0
        ? `<div class="charts-grid">${smallCharts.map(ch =>
            `<div class="chart-card">
              <div class="chart-title">${ch.title}</div>
              <img src="${ch.img}" style="width:100%;height:auto;display:block;border-radius:4px" />
            </div>`
          ).join('')}</div>`
        : ''

      const wideChartsHtml = wideCharts.map(ch =>
        `<div class="chart-card chart-card--wide" style="margin-bottom:12px">
          <div class="chart-title">${ch.title}</div>
          <img src="${ch.img}" style="width:100%;height:auto;display:block;border-radius:4px" />
        </div>`
      ).join('')

      // ── Indicator ranking rows ────────────────────────────────────────────
      const indRankRows = indicatorRankingData.map(d =>
        `<tr>
          <td style="white-space:normal;max-width:320px">${d.fullName}</td>
          <td style="text-align:center">
            <span style="display:inline-block;padding:2px 10px;border-radius:4px;font-weight:700;font-size:10px;color:#fff;background:${d.avgPct >= 60 ? '#059669' : d.avgPct >= 30 ? '#d97706' : '#dc2626'}">${d.avgPct}%</span>
          </td>
          <td style="text-align:center">${d.compliance}%</td>
          <td style="text-align:center;color:#64748b">${d.count}</td>
        </tr>`
      ).join('')

      // ── Call detail rows ──────────────────────────────────────────────────
      const callRows = filteredCalls.map(c => {
        const cl = campaigns.find(x => x.id === c.campaignId)?.name ?? ''
        const sp = c.scoreMax && c.scoreMax > 0 ? ((c.scoreTotal ?? 0) / c.scoreMax * 100).toFixed(1) : null
        const sc = sp ? (Number(sp) >= 60 ? '#059669' : Number(sp) >= 30 ? '#d97706' : '#dc2626') : '#94a3b8'
        const il = c.indTotal ? `${c.indOk ?? 0}/${c.indTotal}` : '—'
        const ds = formatDisplayDate((c.fechaInicioLlamada || c.createdAt || '').split('T')[0])
        return `<tr>
          <td>${c.nombreGrabacion || ''}</td>
          <td>${cl}</td>
          <td>${c.usuarioLlamada ?? ''}</td>
          <td style="text-align:center">${ds}</td>
          <td style="text-align:center"><span style="font-weight:700;color:${sc}">${sp ? sp + '%' : '—'}</span></td>
          <td style="text-align:center">${il}</td>
          <td style="text-align:center">${formatDuration(c.duracionSegundos)}</td>
        </tr>`
      }).join('')

      // ── HTML document ─────────────────────────────────────────────────────
      const html = `<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8">
<title>${t.reports.reportTitle}</title>
<style>
@page { size: A4 landscape; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; font-size: 10px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact }

/* ── Header — full bleed gradient ── */
.header {
  background: linear-gradient(135deg, #312e81 0%, #4f46e5 30%, #7c3aed 65%, #2c92e6 100%);
  color: #fff;
  padding: 18px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 0;
}
.header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; text-shadow: 0 2px 6px rgba(0,0,0,0.3) }
.header-sub { font-size: 11px; opacity: 0.75; margin-top: 2px; font-weight: 400 }
.header-right { text-align: right }
.header-right .date-range { font-size: 12px; font-weight: 700; opacity: 0.95 }
.header-right .gen { font-size: 9px; opacity: 0.6; margin-top: 3px }

/* ── Content wrapper (adds margins since @page is 0 for full-bleed header) ── */
.content { padding: 14px 12mm 12mm 12mm }

/* ── Info + KPI ── */
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px }
.info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px }
.info-card h3 { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-bottom: 6px }
.info-card p { font-size: 10px; color: #334155; margin: 2px 0 }
.camp-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px }
.camp-pill { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 600 }

.kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px }
.kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; page-break-inside: avoid }
.kpi--blue   { border-left: 4px solid #2c92e6 }
.kpi--green  { border-left: 4px solid #059669 }
.kpi--cyan   { border-left: 4px solid #0891b2 }
.kpi--orange { border-left: 4px solid #d97706 }
.kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em }
.kpi-value { font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 3px }

/* ── Charts ── */
.charts-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 12px }
.chart-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; page-break-inside: avoid; overflow: hidden }
.chart-card--wide { grid-column: 1/-1 }
.chart-title { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0 }

/* ── Section title ── */
.stitle { font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 2px solid #7c3aed; display: inline-block }

/* ── Tables ── */
table { width: 100%; border-collapse: collapse; font-size: 9px }
thead th { background: linear-gradient(90deg, #312e81, #4f46e5); color: #fff; padding: 7px 9px; text-align: left; font-weight: 600; white-space: nowrap }
tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; overflow: hidden; text-overflow: ellipsis; max-width: 250px }
tbody tr:nth-child(even) { background: #f8fafc }

/* ── Page breaks ── */
.page-break { page-break-before: always; padding-top: 14px }
</style>
</head><body>

<!-- Header -->
<div class="header">
  <div>
    <h1>${t.reports.reportTitle}</h1>
    <div class="header-sub">${campName} · ${userLbl}</div>
  </div>
  <div class="header-right">
    <div class="date-range">${dateRange}</div>
    <div class="gen">${t.reports.generatedOn}: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
  </div>
</div>

<div class="content">
<!-- Info grid -->
<div class="info-grid">
  <div class="info-card">
    <h3>${t.reports.appliedFilters}</h3>
    <p><strong>${t.reports.campaign}:</strong> ${campName}</p>
    <p><strong>${t.reports.user}:</strong> ${userLbl}</p>
    <p><strong>${t.reports.periodFrom}:</strong> ${formatDisplayDate(dateFrom)} <strong>${t.reports.periodTo}</strong> ${formatDisplayDate(dateTo)}</p>
  </div>
  <div class="info-card">
    <h3>${t.sidebar?.campaigns ?? 'Campañas'} (${involvedCampaigns.length})</h3>
    <div class="camp-list">${involvedCampaigns.map(c => `<span class="camp-pill">${c.name}</span>`).join('')}</div>
  </div>
</div>

<!-- KPIs -->
<div class="kpi-grid">
  <div class="kpi kpi--blue"><div class="kpi-label">${t.reports.totalCalls}</div><div class="kpi-value">${filteredCalls.length}</div></div>
  <div class="kpi kpi--green"><div class="kpi-label">${t.reports.analyzedCalls}</div><div class="kpi-value">${analyzedCalls.length}</div></div>
  <div class="kpi kpi--cyan"><div class="kpi-label">${t.reports.avgScore}</div><div class="kpi-value">${avgScore ? avgScore + '%' : '—'}</div></div>
  <div class="kpi kpi--orange"><div class="kpi-label">${t.reports.avgDuration}</div><div class="kpi-value">${avgDuration ?? '—'}</div></div>
</div>

<!-- Charts (small 2-col grid) -->
${chartsGridHtml}

<!-- Wide charts (by user) -->
${wideChartsHtml}

<!-- Indicator Ranking — new page -->
${indicatorRankingData.length > 0 ? `
<div class="page-break">
  <h2 class="stitle">${t.reports.indicatorRanking}</h2>
  <table>
    <thead><tr>
      <th style="width:55%">${t.reports.indicator}</th>
      <th style="text-align:center;width:15%">${t.reports.avgScore}</th>
      <th style="text-align:center;width:15%">${t.reports.compliance}</th>
      <th style="text-align:center;width:15%">${t.reports.analyzedCalls}</th>
    </tr></thead>
    <tbody>${indRankRows}</tbody>
  </table>
</div>` : ''}

<!-- Call detail — new page -->
<div class="page-break">
  <h2 class="stitle">${t.reports.callDetail} (${filteredCalls.length})</h2>
  <table>
    <thead><tr>
      <th>${t.reports.callName}</th>
      <th>${t.reports.campaignLabel}</th>
      <th>${t.reports.userLabel}</th>
      <th style="text-align:center">${t.reports.date}</th>
      <th style="text-align:center">${t.reports.score}</th>
      <th style="text-align:center">Ind.</th>
      <th style="text-align:center">${t.reports.duration}</th>
    </tr></thead>
    <tbody>${callRows}</tbody>
  </table>
</div>

</div><!-- /content -->

</body></html>`

      const pw = window.open('', 'report_print', 'width=1280,height=900')
      if (!pw) {
        Swal.fire({ icon: 'warning', title: t.reports.exportError, text: 'Habilitá las ventanas emergentes.', confirmButtonColor: '#2c92e6' })
        setExporting(null)
        return
      }
      pw.document.open()
      pw.document.write(html)
      pw.document.close()
      pw.onload = () => {
        setTimeout(() => {
          pw.focus()
          pw.print()
          setTimeout(() => pw.close(), 2000)
        }, 800)
      }
      Swal.fire({ icon: 'success', title: t.reports.exportSuccess, text: 'Seleccioná "Guardar como PDF" en el diálogo de impresión.', timer: 4000, showConfirmButton: false })
    } catch (e) {
      console.error(e)
      Swal.fire({ icon: 'error', title: t.reports.exportError, confirmButtonColor: '#dc2626' })
    } finally { setExporting(null) }
  }

  const tooltipStyle = { background:'var(--bg-card)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, fontSize:12, color:'--text-primary', boxShadow:'0 4px 16px rgba(0,0,0,0.4)' }
  const tooltipLabelStyle = { color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, marginBottom: 2 }
  const tooltipItemStyle  = { color: 'var(--text-primary)', fontSize: 12 }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="reports-page">

      {/* ── Header ── */}
      <div className="calls-header" style={{ marginBottom: '1rem' }}>
        {/* Fila 1: título */}
        <div className="calls-header__top">
          <div className="calls-header__left">
            <button className="calls-header__back" onClick={handleBack} title={t.actions.close}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="calls-header__title">{t.reports.title}</h2>
              <p className="calls-header__sub">{t.reports.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Fila 2: controles centrados */}
        <div className="calls-header__right">
          {/* Refresh */}
          <button
            className="calls-header__icon-btn"
            onClick={loadData}
            disabled={loading}
            title={loading ? t.actions.loading : t.actions.search}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>

          {/* Filter */}
          <button
            className={`calls-header__icon-btn${hasActiveFilters ? ' calls-header__icon-btn--active' : ''}`}
            onClick={() => setFiltersOpen(true)}
            title={t.reports.filtersTitle}
            style={{ position: 'relative' }}
          >
            <Filter size={15} />
            {hasActiveFilters && <span className="calls-header__filter-dot"/>}
          </button>

          {/* Export Excel */}
          <button
            className="calls-header__icon-btn"
            onClick={handleExportXlsx}
            disabled={exporting !== null || filteredCalls.length === 0}
            title={exporting === 'xlsx' ? t.reports.exporting : t.reports.exportXlsx}
            style={{ opacity: (exporting !== null || filteredCalls.length === 0) ? 0.4 : 1 }}
          >
            {exporting === 'xlsx'
              ? <span className="sa-spinner" style={{ width: 14, height: 14 }} />
              : <ExcelIcon size={17} />
            }
          </button>

          {/* Export PDF */}
          <button
            className="calls-header__icon-btn"
            onClick={handleExportPdf}
            disabled={exporting !== null || filteredCalls.length === 0}
            title={exporting === 'pdf' ? t.reports.exporting : t.reports.exportPdf}
            style={{ opacity: (exporting !== null || filteredCalls.length === 0) ? 0.4 : 1 }}
          >
            {exporting === 'pdf'
              ? <span className="sa-spinner" style={{ width: 14, height: 14 }} />
              : <PdfIcon size={17} />
            }
          </button>

          {/* View toggle */}
          <div className="calls-view-toggle">
            <button
              className={`calls-view-toggle__btn ${viewMode === 'grid' ? 'calls-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista cards"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              className={`calls-view-toggle__btn ${viewMode === 'list' ? 'calls-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >
              <LayoutList size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Active filters pills ── */}
      <div ref={reportContentRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          {campaign && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.55rem', borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(44,146,230,0.12)', border: '1px solid rgba(44,146,230,0.3)',
              color: '#2c92e6',
            }}>
              <BarChart2 size={10} />
              {campaigns.find(c => c.id === campaign)?.name ?? campaign}
              <X size={10} style={{ cursor: 'pointer', marginLeft: '0.15rem' }}
                onClick={() => { setCampaign(''); setTmpCampaign('') }} />
            </span>
          )}
          {user.size > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.55rem', borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(76,201,114,0.12)', border: '1px solid rgba(76,201,114,0.3)',
              color: '#4cc972',
            }}>
              <User size={10} />
              {user.size === 1 ? [...user][0] : `${user.size} usuarios`}
              <X size={10} style={{ cursor: 'pointer', marginLeft: '0.15rem' }}
                onClick={() => { setUser(new Set()); setTmpUser(new Set()) }} />
            </span>
          )}
          {(dateFrom !== getDefaultDateFrom() || dateTo !== getDefaultDateTo()) && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.55rem', borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 600,
              background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#7c3aed',
            }}>
              <Calendar size={10} />
              {formatDisplayDate(dateFrom)} — {formatDisplayDate(dateTo)}
            </span>
          )}
          <button
            onClick={clearFilters}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.2rem 0.4rem', borderRadius: '6px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={11} /> {t.reports.clearFilters}
          </button>
        </div>
      )}

      {/* ── Filter Modal ── */}
      {filtersOpen && (
        <FilterModal
          onClose={() => setFiltersOpen(false)}
          onApply={applyFilters}
          onClear={clearFilters}
          tmpCampaign={tmpCampaign}
          setTmpCampaign={setTmpCampaign}
          tmpUser={tmpUser}
          setTmpUser={setTmpUser}
          tmpDateFrom={tmpDateFrom}
          setTmpDateFrom={setTmpDateFrom}
          tmpDateTo={tmpDateTo}
          setTmpDateTo={setTmpDateTo}
          campaignOptions={campaignOptions}
          uniqueUsers={uniqueUsers}
          t={t}
        />
      )}

      {/* ── Empty state ── */}
      {!loading && filteredCalls.length === 0 && (
        <div className="empty-state">
          <BarChart2 size={48} className="empty-state__icon"/>
          <h4 className="empty-state__title">{t.reports.noData}</h4>
          <p className="empty-state__description">{t.reports.noDataDesc}</p>
        </div>
      )}

      {(loading || filteredCalls.length > 0) && (<>

        {/* ── KPI Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem' }}>
          {[
            { label:t.reports.totalCalls,    value:filteredCalls.length, icon:<Mic size={20} style={{ color:'var(--color-primary)' }}/>, cls:'stat-card--blue'   },
            { label:t.reports.analyzedCalls, value:analyzedCalls.length, icon:<CheckCircle size={20} style={{ color:'#059669' }}/>,      cls:'stat-card--green'  },
            { label:t.reports.avgScore,      value:avgScore?`${avgScore}%`:'—', icon:<TrendingUp size={20} style={{ color:'#0891b2' }}/>, cls:'stat-card--cyan'  },
            { label:t.reports.avgDuration,   value:avgDuration??'—',     icon:<Clock size={20} style={{ color:'#d97706' }}/>,             cls:'stat-card--orange' },
          ].map(({ label, value, icon, cls }) => (
            <div key={label} className={`stat-card ${cls}`}>
              <div className="dashboard-admin__stat-card">
                <div>
                  <p className="dashboard-admin__stat-label">{label}</p>
                  <p className="dashboard-admin__stat-value">
                    {loading ? <span style={{ opacity:0.3 }}>…</span> : value}
                  </p>
                </div>
                <div className="dashboard-admin__stat-icon">{icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts 3-col grid ── */}
        <div className="reports-charts-3col">

          {/* Score distribution — colored buckets */}
          {scoreDistData.some(d => d.count > 0) && (
            <ChartCard icon={<BarChart2 size={15} style={{ color:'var(--color-primary)' }}/>} title={t.reports.scoreDistribution}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistData} margin={{ top:4, right:8, left:-20, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                  <XAxis dataKey="range" tick={{ fontSize:11, fill:'var(--text-muted)' }}/>
                  <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} allowDecimals={false}/>
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v:any) => [v, t.reports.countLabel] as any}
                    cursor={{ fill:'rgba(253, 253, 253, 0.04)' }}
                  />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {scoreDistData.map((_,i) => (
                      <Cell key={i} fill={SCORE_BUCKET_COLORS[i]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.5rem', justifyContent:'center' }}>
                {scoreDistData.map((b, i) => (
                  <span key={b.range} style={{ display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.7rem', color:'var(--text-muted)' }}>
                    <span style={{ width:10, height:10, borderRadius:2, background:SCORE_BUCKET_COLORS[i], flexShrink:0 }}/>
                    {b.range}
                  </span>
                ))}
              </div>
            </ChartCard>
          )}

          {/* Calls over time */}
          {callsOverTimeData.length > 0 && (
            <ChartCard icon={<TrendingUp size={15} style={{ color:'#7c3aed' }}/>} title={t.reports.callsOverTime}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={callsOverTimeData} margin={{ top:4, right:8, left:-20, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-muted)' }}/>
                  <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} allowDecimals={false}/>
                  <Tooltip contentStyle={tooltipStyle}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <Line type="monotone" dataKey="total"    stroke="#2c92e6" strokeWidth={2} dot={false} name={t.reports.totalCalls}/>
                  <Line type="monotone" dataKey="analyzed" stroke="#4cc972" strokeWidth={2} dot={false} name={t.reports.analyzedCalls}/>
                  <Line type="monotone" dataKey="audited"  stroke="#db2777" strokeWidth={2} dot={false} name={t.speech?.audited ?? 'Auditadas'}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Sentiment — with proper dark tooltip */}
          {sentimentData.length > 0 && (
            <ChartCard icon={<CheckCircle size={15} style={{ color:'#d97706' }}/>} title={t.reports.sentimentDistribution}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sentimentData} cx="50%" cy="50%" outerRadius={50}
                    dataKey="value"
                    label={(props: any) => {
                      const { name, percent } = props
                      return percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }}
                    labelLine
                    fontSize={8} 
                  >
                    {sentimentData.map((e, i) => (
                      <Cell key={i} fill={SENTIMENT_COLORS[e.name] ?? CHART_COLORS[i%CHART_COLORS.length]}
                        stroke="var(--bg-card)" strokeWidth={2}/>
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v:any, n:any) => [v, n] as any}
                  />
                  <Legend
                    wrapperStyle={{ fontSize:11 }}
                    formatter={(value: string) => <span style={{color:'var(--text-secondary)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Status distribution pie */}
          {statusDistData.length > 0 && (
            <ChartCard icon={<BarChart2 size={15} style={{ color:'#0891b2' }}/>} title="Distribución por estado">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusDistData} cx="50%" cy="50%" outerRadius={65}
                    dataKey="value"
                    label={(props: any) => {
                      const { name, percent } = props
                      return percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }}
                    labelLine fontSize={8}
                  >
                    {statusDistData.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="var(--bg-card)" strokeWidth={2}/>
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v:any, n:any) => [v, n] as any}
                  />
                  <Legend
                    wrapperStyle={{ fontSize:11 }}
                    formatter={(value: string) => <span style={{ color:'var(--text-secondary)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Calls by Campaign */}
          {callsByCampaignData.length > 0 && (
            <ChartCard icon={<BarChart2 size={15} style={{ color:'#0891b2' }}/>} title={t.reports.callsByCampaign}>
              <ResponsiveContainer width="100%" height={Math.max(160, callsByCampaignData.length * 32)}>
                <BarChart data={callsByCampaignData} layout="vertical" margin={{ top:4, right:30, left:5, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                  <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} allowDecimals={false}/>
                  <YAxis dataKey="campaign" type="category" tick={{ fontSize:11, fill:'var(--text-muted)' }} width={85}/>
                  <Tooltip contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}/>
                  <Bar dataKey="count" radius={[0,4,4,0]} name={t.reports.totalCalls}>
                    {callsByCampaignData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Word Cloud — 1 col slot */}
          {wordMap.size > 0 && (
            <ChartCard
              icon={<BarChart2 size={15} style={{ color:'#db2777' }}/>}
              title={t.reports.wordCloud}
              extra={<span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'var(--text-muted)' }}>{Math.min(wordMap.size, 50)} palabras</span>}
            >
              <WordCloud words={wordMap}/>
            </ChartCard>
          )}

        </div>

        {/* ── Indicator Ranking — full width ── */}
        {indicatorRankingData.length > 0 && (
          <ChartCard icon={<BarChart2 size={15} style={{ color:'#7c3aed' }}/>} title={t.reports.indicatorRanking}>
            <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'4px 0' }}>
              {[...indicatorRankingData]
                .sort((a, b) => a.avgPct - b.avgPct)
                .map((item, index) => {
                  const total = indicatorRankingData.length
                  // Color gradient: red (low) → yellow → green (high)
                  const ratio = index / Math.max(total - 1, 1)
                  const r = Math.round(220 - ratio * 160)
                  const g = Math.round(60 + ratio * 150)
                  const barColor = `rgb(${r},${g},80)`

                  return (
                    <div
                      key={item.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                      {/* Name + progress bar */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: 4,
                        }}>
                          {item.fullName ?? item.name}
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${item.avgPct}%`,
                            borderRadius: 2,
                            background: barColor,
                            transition: 'width 0.6s ease',
                          }}/>
                        </div>
                      </div>

                      {/* Compliance badge */}
                      <div style={{
                        fontSize: 11,
                        color: '#0891b2',
                        background: 'rgba(8,145,178,0.12)',
                        padding: '2px 7px',
                        borderRadius: 99,
                        whiteSpace: 'nowrap',
                      }}>
                        {item.compliance}% {t.reports.compliance ?? 'Cumpl.'}
                      </div>

                      {/* Score */}
                      <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: barColor,
                        minWidth: 42,
                        textAlign: 'right',
                      }}>
                        {item.avgPct}%
                      </div>
                    </div>
                  )
                })}
            </div>
          </ChartCard>
        )}
        
        {/* ── Calls by User — full width ── */}
        {callsByUserData.length > 0 && (
          <ChartCard icon={<Users size={15} style={{ color:'#059669' }}/>} title={t.reports.callsByUser}>
            <ResponsiveContainer width="100%" height={Math.max(200, callsByUserData.length * 38)}>
              <BarChart data={callsByUserData} layout="vertical" margin={{ top:4, right:50, left:10, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} allowDecimals={false}/>
                <YAxis dataKey="user" type="category" tick={{ fontSize:12, fill:'var(--text-secondary)' }} width={130}/>
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                <Bar dataKey="total"    fill="#2c92e6" radius={[0,4,4,0]} name={t.reports.totalCalls}/>
                <Bar dataKey="analyzed" fill="#4cc972" radius={[0,4,4,0]} name={t.reports.analyzedCalls}/>
                <Bar dataKey="audited"  fill="#db2777" radius={[0,4,4,0]} name={t.speech?.audited ?? 'Auditadas'}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Call list ── */}
        {filteredCalls.length > 0 && (
          <div className="card" style={{ padding:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap' }}>
              <Mic size={15} style={{ color:'var(--color-primary)', flexShrink:0 }}/>
              <h3 className="reports-card-title">{t.reports.callDetail}</h3>
              <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                {filteredCalls.length > 50 ? `50 / ${filteredCalls.length}` : filteredCalls.length}
              </span>
            </div>

            <div className={viewMode === 'grid' ? 'calls-grid' : 'calls-list'}>
              {filteredCalls.slice(0, 50).map(call => (
                viewMode === 'grid' ? (
                  <CallCard key={call.id} call={call} onViewAnalysis={() => setAnalysisCall(call)}/>
                ) : (
                  <CallRow key={call.id} call={call} onViewAnalysis={() => setAnalysisCall(call)}/>
                )
              ))}
            </div>

            {filteredCalls.length > 50 && (
              <p style={{ textAlign:'center', padding:'0.75rem 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>
                Mostrando 50 de {filteredCalls.length} · Exportá para ver todos
              </p>
            )}
          </div>
        )}

      </>)}
      </div>{/* close reportContentRef */}
    </div>
  )
}