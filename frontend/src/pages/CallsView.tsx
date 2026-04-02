import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, BarChart2, Calendar, ChevronDown,
  Filter, LayoutGrid, LayoutList,
  Mic, Phone, PhoneCall, PhoneIncoming, Plus, RefreshCw, X, Search, User
} from 'lucide-react'
import {
  toInputDate, getDefaultDateFrom, getDefaultDateTo, formatDisplayDate,
  formatDuration, formatDate, scoreColor, ScoreBar,
  STATUS_CLASSES, getStatusConfig,
  DatePicker, MultiSelect, CallCard, CallRow,
} from '../components/CallShared'
import Swal from 'sweetalert2'
import { callsService } from '../services/calls.service'
import { CallUploadForm } from '../components/CallUploadForm'
import { SpeechAnalyticsView } from './SpeechAnalyticsView'
import { useAdminContext } from '../context/AdminContext'
import type { Call, CallStatus } from '../types/calls.types'
import { useLang } from '../context/LangContext'

interface CallsViewProps {
  campaignId:   string
  campaignName: string
  onBack:       () => void
  openCallId?:  string
}

// Estados que corresponden a "EN PROGRESO"
const IN_PROGRESS_STATUSES = new Set(['PENDING', 'UPLOADING', 'UPLOADED', 'ANALYZING'])
const ALL_STATUSES = new Set(['PENDING', 'UPLOADING', 'UPLOADED', 'ANALYZING', 'ANALYZED', 'AUDITED', 'ERROR'])

// Lee el filtro guardado por el Dashboard en sessionStorage y lo limpia.
// Devuelve el Set de estados a mostrar, o null si no había filtro (= mostrar todos).
function consumeStatusFilter(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem('calls_status_filter')
    if (!raw) return null
    sessionStorage.removeItem('calls_status_filter')
    if (raw === 'ALL')         return new Set(ALL_STATUSES)
    if (raw === 'IN_PROGRESS') return new Set(IN_PROGRESS_STATUSES)
    return new Set([raw])
  } catch {
    return null
  }
}

// ─── Main View ─────────────────────────────────────────────────────────────────

export const CallsView: React.FC<CallsViewProps> = ({ campaignId, campaignName, onBack, openCallId }) => {
  const { isAdmin, hasPermission } = useAdminContext()
  const { t } = useLang()
  const [calls, setCalls]               = useState<Call[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showUpload, setShowUpload]     = useState(false)
  const [analysisCall, setAnalysisCall] = useState<Call | null>(null)
  const [viewMode, setViewMode]         = useState<'grid'|'list'>(
    () => (localStorage.getItem('calls-view-mode') as 'grid'|'list') ?? 'grid'
  )

  // Inicializar activeFilters: si el Dashboard dejó un filtro en sessionStorage lo usamos,
  // si no, mostramos todos los estados.
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    () => consumeStatusFilter() ?? new Set(ALL_STATUSES)
  )

  const [sortBy, setSortBy] = useState<'date' | 'score' | 'ind'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [showFilters,    setShowFilters]    = useState(false)
  const [selNames,       setSelNames]       = useState<Set<string>>(new Set())
  const [selUsers,       setSelUsers]       = useState<Set<string>>(new Set())
  const [selCallIds,     setSelCallIds]     = useState<Set<string>>(new Set())
  const [selContacts,    setSelContacts]    = useState<Set<string>>(new Set())
  const [dateFrom,       setDateFrom]       = useState(getDefaultDateFrom)
  const [dateTo,         setDateTo]         = useState(getDefaultDateTo)

  const [tmpNames,    setTmpNames]    = useState<Set<string>>(new Set())
  const [tmpUsers,    setTmpUsers]    = useState<Set<string>>(new Set())
  const [tmpCallIds,  setTmpCallIds]  = useState<Set<string>>(new Set())
  const [tmpContacts, setTmpContacts] = useState<Set<string>>(new Set())
  const [tmpDateFrom, setTmpDateFrom] = useState(getDefaultDateFrom)
  const [tmpDateTo,   setTmpDateTo]   = useState(getDefaultDateTo)
  const [openPicker,  setOpenPicker]  = useState<'from'|'to'|null>(null)

  // ── Consumir openCallId solo una vez ──────────────────────────────────────
  const openCallConsumed = useRef(false)

  const defined = (arr: (string | undefined)[]): string[] => arr.filter((v): v is string => !!v)
  const optNames    = useMemo(() => [...new Set(defined(calls.map(c => c.nombreGrabacion)))].sort(), [calls])
  const optUsers    = useMemo(() => [...new Set(defined(calls.map(c => c.usuarioLlamada)))].sort(), [calls])
  const optCallIds  = useMemo(() => [...new Set(defined(calls.map(c => c.idLlamada)))].sort(), [calls])
  const optContacts = useMemo(() => [...new Set(defined(calls.map(c => c.idContacto)))].sort(), [calls])

  const hasActiveSearch = selNames.size > 0 || selUsers.size > 0 || selCallIds.size > 0 || selContacts.size > 0
    || dateFrom !== getDefaultDateFrom() || dateTo !== getDefaultDateTo()

  const openModal = () => {
    setTmpNames(new Set(selNames)); setTmpUsers(new Set(selUsers))
    setTmpCallIds(new Set(selCallIds)); setTmpContacts(new Set(selContacts))
    setTmpDateFrom(dateFrom); setTmpDateTo(dateTo)
    setOpenPicker(null)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setSelNames(tmpNames); setSelUsers(tmpUsers)
    setSelCallIds(tmpCallIds); setSelContacts(tmpContacts)
    setDateFrom(tmpDateFrom); setDateTo(tmpDateTo)
    setShowFilters(false); setOpenPicker(null)
  }

  const clearTmp = () => {
    setTmpNames(new Set()); setTmpUsers(new Set())
    setTmpCallIds(new Set()); setTmpContacts(new Set())
    setTmpDateFrom(getDefaultDateFrom()); setTmpDateTo(getDefaultDateTo())
    setShowFilters(false); 
    setOpenPicker(null)
  }

  const clearApplied = () => {
    setSelNames(new Set()); setSelUsers(new Set())
    setSelCallIds(new Set()); setSelContacts(new Set())
    setDateFrom(getDefaultDateFrom()); setDateTo(getDefaultDateTo())
  }

  const toggleFilter = (status: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  const loadCalls = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true); else setIsRefreshing(true)
    try {
      const data = await callsService.findByCampaign(campaignId)
      setCalls(data)

      // Deep-link: abrir una call específica solo la primera vez
      if (openCallId && !openCallConsumed.current) {
        openCallConsumed.current = true
        const target = data.find((c: Call) => c.id === openCallId)
        if (target?.status === 'ANALYZED' || target?.status === 'AUDITED') setAnalysisCall(target)
      }
    } catch {
      Swal.fire({ icon: 'error', title: t.errors.generic, text: t.labels.noRecordings, confirmButtonColor: '#dc2626' })
    } finally { setIsLoading(false); setIsRefreshing(false) }
  }, [campaignId, openCallId])

  useEffect(() => { loadCalls() }, [loadCalls])

  useEffect(() => {
    const hasInProgress = calls.some(c => ['PENDING','UPLOADING','UPLOADED','ANALYZING'].includes(c.status))
    if (!hasInProgress) return
    const interval = setInterval(() => loadCalls(true), 5_000)
    return () => clearInterval(interval)
  }, [calls, loadCalls])

  const handleDelete = async (call: Call) => {
    const result = await Swal.fire({
      title: t.actions.delete, text: t.actions.delete + ' ' + `${call.nombreGrabacion}`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280',
      confirmButtonText: t.actions.delete, 
      cancelButtonText: t.actions.cancel,
    })
    if (!result.isConfirmed) return
    try { await callsService.remove(call.id); await loadCalls() }
    catch { Swal.fire({ icon: 'error', title: t.errors.generic, text: t.errors.generic, confirmButtonColor: '#dc2626' }) }
  }

  const handleRetry = async (call: Call) => {
    if (call.status === 'ANALYZED' || call.status === 'AUDITED') {
      const result = await Swal.fire({
        icon: 'warning',
        title: t.speech.Reanalyze,
        text: t.actions.reanalyzeText,
        showCancelButton: true,
        confirmButtonText: t.actions.confirm,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#6b7280',
      })
      if (!result.isConfirmed) return
    }
    try { await callsService.retry(call.id); await loadCalls() }
    catch { Swal.fire({ icon: 'error', title: t.errors.generic, text: t.errors.generic, confirmButtonColor: '#dc2626' }) }
  }

  const statusCounts = calls.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1; return acc
  }, {} as Record<string, number>)

  const filteredCalls = calls.filter(c => {
    if (activeFilters.size > 0 && !activeFilters.has(c.status)) return false
    if (selNames.size > 0    && !selNames.has(c.nombreGrabacion ?? ''))  return false
    if (selUsers.size > 0    && !selUsers.has(c.usuarioLlamada ?? ''))   return false
    if (selCallIds.size > 0  && !selCallIds.has(c.idLlamada ?? ''))      return false
    if (selContacts.size > 0 && !selContacts.has(c.idContacto ?? ''))    return false
    const refDate = c.fechaInicioLlamada || c.createdAt
    if (refDate) {
      const d = new Date(refDate)
      if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false
      if (dateTo   && d > new Date(dateTo   + 'T23:59:59')) return false
    }
    return true
  })

  // ── Ordenamiento ────────────────────────────────────────────────────────────
  const sortedCalls = [...filteredCalls].sort((a, b) => {
    let diff = 0
    if (sortBy === 'score') {
      const pctA = a.scoreMax ? (a.scoreTotal ?? 0) / a.scoreMax : 0
      const pctB = b.scoreMax ? (b.scoreTotal ?? 0) / b.scoreMax : 0
      diff = pctA - pctB
    } else if (sortBy === 'ind') {
      const ratioA = a.indTotal ? (a.indOk ?? 0) / a.indTotal : 0
      const ratioB = b.indTotal ? (b.indOk ?? 0) / b.indTotal : 0
      diff = ratioA - ratioB
    } else {
      const dA = new Date(a.fechaInicioLlamada || a.createdAt).getTime()
      const dB = new Date(b.fechaInicioLlamada || b.createdAt).getTime()
      diff = dA - dB
    }
    return sortDir === 'desc' ? -diff : diff
  })

  if (analysisCall) {
    return (
      <SpeechAnalyticsView
        analysisResult={analysisCall.analysisResult}
        callName={analysisCall.nombreGrabacion}
        audioUrl={analysisCall.audioTempPath ?? undefined}
        callId={analysisCall.id}
        onBack={() => { setAnalysisCall(null); loadCalls(true) }}
      />
    )
  }

  return (
    <div className="calls-page">

      {/* Header */}
      <div className="calls-header">
        <div className="calls-header__top">
          <div className="calls-header__left">
            <button className="calls-header__back" onClick={onBack} title={t.actions.close}><ArrowLeft size={16}/></button>
            <div>
              <h2 className="calls-header__title">{campaignName}</h2>
              <p className="calls-header__sub">{filteredCalls.length} de {calls.length} grabación{calls.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>
          {(isAdmin || hasPermission('add_campaigns')) && (
            <button className="btn btn-primary calls-header__new-btn" onClick={() => setShowUpload(true)}>
              <Plus size={16}/> {t.speech.newAudio}
            </button>
          )}
        </div>
      </div>

      {/* Modal de filtros */}
      {showFilters && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowFilters(false); setOpenPicker(null) } }}>
          <div className="modal modal--lg calls-filter-modal">
            <div className="modal__header">
              <h3 className="modal__title">{t.actions.search}</h3>
              <button className="modal__close" onClick={() => { setShowFilters(false); setOpenPicker(null) }}><X size={18}/></button>
            </div>
            <div className="modal__body">
              <div className="calls-filter-section">
                <p className="calls-filter-section__label">{t.actions.search}</p>
                <div className="calls-filter-dates">
                  <div className="calls-search-field calls-search-field--date"
                    onClick={() => setOpenPicker(p => p==='from' ? null : 'from')}>
                    <Calendar size={13} className="calls-search-field__icon"/>
                    <span className="calls-search-field__date-value">
                      {formatDisplayDate(tmpDateFrom) || <span className="calls-search-field__date-value--placeholder">Desde...</span>}
                    </span>
                    {openPicker === 'from' && (
                      <DatePicker value={tmpDateFrom} onChange={v => { setTmpDateFrom(v); setOpenPicker(null) }}
                        maxDate={tmpDateTo || toInputDate(new Date())} onClose={() => setOpenPicker(null)}/>
                    )}
                  </div>
                  <span className="calls-filter-dates__sep">—</span>
                  <div className="calls-search-field calls-search-field--date"
                    onClick={() => setOpenPicker(p => p==='to' ? null : 'to')}>
                    <Calendar size={13} className="calls-search-field__icon"/>
                    <span className="calls-search-field__date-value">
                      {formatDisplayDate(tmpDateTo) || <span className="calls-search-field__date-value--placeholder">Hasta...</span>}
                    </span>
                    {openPicker === 'to' && (
                      <DatePicker value={tmpDateTo} onChange={v => { setTmpDateTo(v); setOpenPicker(null) }}
                        minDate={tmpDateFrom} maxDate={toInputDate(new Date())} onClose={() => setOpenPicker(null)}/>
                    )}
                  </div>
                </div>
              </div>
              <div className="calls-filter-section">
                <p className="calls-filter-section__label">{t.actions.search}</p>
                <div className="calls-filter-grid">
                  <MultiSelect label="Grabación" icon={<Mic size={13}/>} options={optNames} selected={tmpNames} onChange={setTmpNames} placeholder="Todas"/>
                  <MultiSelect label="Usuario" icon={<User size={13}/>} options={optUsers} selected={tmpUsers} onChange={setTmpUsers} placeholder="Todos"/>
                  <MultiSelect label="ID Llamada" icon={<Phone size={13}/>} options={optCallIds} selected={tmpCallIds} onChange={setTmpCallIds} placeholder="Todos"/>
                  <MultiSelect label="ID Contacto" icon={<PhoneIncoming size={13}/>} options={optContacts} selected={tmpContacts} onChange={setTmpContacts} placeholder="Todos"/>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <span className="calls-filter-modal__count">
                {filteredCalls.length} resultado{filteredCalls.length !== 1 ? 's' : ''}
              </span>
              <button className="btn btn-secondary" onClick={clearTmp}>{t.actions.cancel}</button>
              <button className="btn btn-primary" onClick={applyFilters}>{t.actions.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fila controles + estados */}
      {calls.length > 0 && (
        <div className="calls-controls-row">
          <div className="calls-header__right">
            <button className="calls-header__icon-btn" onClick={() => loadCalls(true)} disabled={isRefreshing} title={t.actions.loading}>
              <RefreshCw size={15} className={isRefreshing ? 'spin' : ''}/>
            </button>
            <button
              className={`calls-header__icon-btn${hasActiveSearch ? ' calls-header__icon-btn--active' : ''}`}
              onClick={openModal} title={t.actions.search}
            >
              <Filter size={15}/>
              {hasActiveSearch && <span className="calls-header__filter-dot"/>}
            </button>
            {/* Sort controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.2rem' }}>
              {([
                { key: 'date',  label: 'Fecha' },
                { key: 'score', label: '% Score' },
                { key: 'ind',   label: 'Ind.' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (sortBy === opt.key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                    else { setSortBy(opt.key); setSortDir('desc') }
                  }}
                  style={{
                    padding: '0.25rem 0.6rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 600,
                    background: sortBy === opt.key ? 'var(--color-primary)' : 'transparent',
                    color: sortBy === opt.key ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: '0.2rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                  {sortBy === opt.key && (
                    <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="calls-view-toggle">
              <button className={`calls-view-toggle__btn ${viewMode==='grid'?'calls-view-toggle__btn--active':''}`}
                onClick={() => { setViewMode('grid'); localStorage.setItem('calls-view-mode','grid') }}
                title="Vista cards"><LayoutGrid size={14}/></button>
              <button className={`calls-view-toggle__btn ${viewMode==='list'?'calls-view-toggle__btn--active':''}`}
                onClick={() => { setViewMode('list'); localStorage.setItem('calls-view-mode','list') }}
                title="Vista lista"><LayoutList size={14}/></button>
            </div>
          </div>
          <div className="calls-filters">
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = getStatusConfig(t)[status as CallStatus]
              const isActive = activeFilters.has(status)
              return (
                <button key={status}
                  className={`call-filter-btn call-filter-btn--${status.toLowerCase()} ${isActive?'call-filter-btn--active':''}`}
                  onClick={() => toggleFilter(status)}>
                  {['UPLOADING','ANALYZING'].includes(status) && isActive && <span className="call-status__spinner"/>}
                  <span>{count}</span><span>{cfg.label}</span>
                </button>
              )
            })}
            {activeFilters.size > 0 && (
              <button className="call-filter-clear" onClick={() => setActiveFilters(new Set())}>{t.actions.filters}</button>
            )}
          </div>
        </div>
      )}

      <CallUploadForm isOpen={showUpload} onClose={() => setShowUpload(false)}
        campaignId={campaignId} onSuccess={() => loadCalls()}/>

      {hasActiveSearch && !isLoading && calls.length > 0 && (
        <div className="calls-active-filters-banner">
          <span className="calls-active-filters-banner__text">
            <Filter size={13}/>
            {filteredCalls.length} / {calls.length}
          </span>
          <button className="calls-active-filters-banner__btn" onClick={clearApplied}>
            <X size={12}/> Limpiar filtros
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="empty-state"><p className="empty-state__description">{t.actions.loading}</p></div>
      ) : calls.length === 0 ? (
        <div className="empty-state">
          <PhoneCall size={48} className="empty-state__icon"/>
          <h4 className="empty-state__title">{t.labels.noRecordings}</h4>
          <p className="empty-state__description">{t.speech.selectAudio}</p>
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="empty-state">
          <Search size={36} className="empty-state__icon" style={{ opacity: 0.3 }}/>
          <p className="empty-state__description">{t.actions.search}</p>
          <button className="btn btn-secondary btn--sm" style={{ marginTop: '0.5rem' }}
            onClick={() => { clearApplied(); setActiveFilters(new Set()) }}>
            {t.actions.cancel}
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'calls-grid' : 'calls-list'}>
          {sortedCalls.map(call => viewMode === 'grid' ? (
            <CallCard key={call.id} call={call}
              onDelete={() => handleDelete(call)}
              onViewAnalysis={() => setAnalysisCall(call)}
              onRetry={() => handleRetry(call)}/>
          ) : (
            <CallRow key={call.id} call={call}
              onDelete={() => handleDelete(call)}
              onViewAnalysis={() => setAnalysisCall(call)}
              onRetry={() => handleRetry(call)}/>
          ))}
        </div>
      )}
    </div>
  )
}