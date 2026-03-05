/**
 * callShared.tsx
 * Componentes y utilidades compartidos entre CallsView y ReportsView.
 * Se exportan todos los elementos para reutilización.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  BarChart2, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Mic, Phone, PhoneIncoming, RefreshCw, Search, Trash2, User, X,
} from 'lucide-react'
import { useLang } from '../context/LangContext'
import type { Call, CallStatus } from '../types/calls.types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

export const toInputDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const getDefaultDateFrom = () => {
  const d = new Date()
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1))
}
export const getDefaultDateTo = () => toInputDate(new Date())
export const formatDisplayDate = (iso: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
export const formatDuration = (seconds?: number) => {
  if (!seconds) return '—'
  const totalSecs = Math.round(seconds)
  const m = Math.floor(totalSecs / 60), s = totalSecs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
export const formatDate = (date?: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

export const scoreColor = (pct: number) =>
  pct >= 70 ? '#16a34a' : pct >= 40 ? '#b45309' : '#dc2626'

export const ScoreBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div style={{ marginTop: '0.35rem', height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
    <div style={{
      height: '100%', borderRadius: '999px',
      width: `${Math.min(100, pct)}%`,
      background: scoreColor(pct),
      transition: 'width 0.4s ease',
    }} />
  </div>
)

// ─── Status config ─────────────────────────────────────────────────────────────

export const STATUS_CLASSES: Record<CallStatus, string> = {
  PENDING:   'call-status--pending',
  UPLOADING: 'call-status--uploading',
  UPLOADED:  'call-status--uploaded',
  ANALYZING: 'call-status--analyzing',
  ANALYZED:  'call-status--analyzed',
  AUDITED:   'call-status--audited',
  ERROR:     'call-status--error',
}

export const getStatusConfig = (t: any): Record<CallStatus, { label: string; className: string }> => ({
  PENDING:   { label: t.actions.loading,       className: STATUS_CLASSES.PENDING   },
  UPLOADING: { label: t.speech.upload,         className: STATUS_CLASSES.UPLOADING },
  UPLOADED:  { label: t.actions.loading,       className: STATUS_CLASSES.UPLOADED  },
  ANALYZING: { label: t.speech.analyzing,      className: STATUS_CLASSES.ANALYZING },
  ANALYZED:  { label: t.speech.audioProcessed, className: STATUS_CLASSES.ANALYZED  },
  AUDITED:   { label: t.speech.audited ?? 'Auditada', className: STATUS_CLASSES.AUDITED },
  ERROR:     { label: t.errors.generic,        className: STATUS_CLASSES.ERROR     },
})

// ─── DatePicker ────────────────────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

export interface DatePickerProps {
  value: string; onChange: (v: string) => void
  minDate?: string; maxDate?: string; onClose: () => void
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, minDate, maxDate, onClose }) => {
  const today   = new Date()
  const initial = value ? new Date(value + 'T12:00:00') : today
  const [viewYear,  setViewYear]  = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const prevMonth = () => viewMonth === 0  ? (setViewMonth(11), setViewYear(y => y-1)) : setViewMonth(m => m-1)
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y+1)) : setViewMonth(m => m+1)
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr    = toInputDate(today)
  const isDisabled  = (day: number) => {
    const str = toInputDate(new Date(viewYear, viewMonth, day))
    if (minDate && str < minDate) return true
    if (maxDate && str > maxDate) return true
    return false
  }

  return (
    <div className="date-picker-popover" ref={ref} onClick={e => e.stopPropagation()}>
      <div className="date-picker__header">
        <button className="date-picker__nav" onClick={e => { e.stopPropagation(); prevMonth() }} type="button"><ChevronLeft size={14}/></button>
        <span className="date-picker__month-label">{MONTHS_ES[viewMonth]} {viewYear}</span>
        <button className="date-picker__nav" onClick={e => { e.stopPropagation(); nextMonth() }} type="button"><ChevronRight size={14}/></button>
      </div>
      <div className="date-picker__weekdays">
        {DAYS_ES.map(d => <span key={d} className="date-picker__weekday">{d}</span>)}
      </div>
      <div className="date-picker__days">
        {Array.from({ length: firstDow }).map((_,i) => <span key={`e${i}`} className="date-picker__day date-picker__day--empty"/>)}
        {Array.from({ length: daysInMonth }).map((_,i) => {
          const day = i + 1
          const str = toInputDate(new Date(viewYear, viewMonth, day))
          const disabled = isDisabled(day)
          return (
            <button key={day} type="button" disabled={disabled}
              className={['date-picker__day', str===value?'date-picker__day--selected':'', str===todayStr&&str!==value?'date-picker__day--today':'', disabled?'date-picker__day--disabled':''].join(' ')}
              onClick={e => { e.stopPropagation(); onChange(str); onClose() }}
            >{day}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── MultiSelect ───────────────────────────────────────────────────────────────

export interface MultiSelectProps {
  label: string; icon: React.ReactNode; options: string[]
  selected: Set<string>; onChange: (next: Set<string>) => void
  placeholder?: string
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, icon, options, selected, onChange, placeholder = 'Todos' }) => {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const ref        = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { t } = useLang()

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

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
  const allSelected = selected.size === 0 || selected.size === options.length
  const toggle = (val: string) => {
    const next = new Set(selected)
    next.has(val) ? next.delete(val) : next.add(val)
    if (next.size === options.length || next.size === 0) onChange(new Set())
    else onChange(next)
  }
  const toggleAll = () => onChange(new Set())
  const triggerLabel = selected.size === 0 ? placeholder : selected.size === 1 ? [...selected][0] : `${selected.size} seleccionados`

  return (
    <div className="cf-multiselect" ref={ref}>
      <p className="form-group__label">{label}</p>
      <button
        ref={triggerRef} type="button"
        className={`cf-multiselect__trigger ${open ? 'cf-multiselect__trigger--open' : ''} ${selected.size > 0 ? 'cf-multiselect__trigger--active' : ''}`}
        onClick={handleOpen}
      >
        <span className="cf-multiselect__trigger-icon">{icon}</span>
        <span className="cf-multiselect__trigger-text">{triggerLabel}</span>
        {selected.size > 0 && <span className="cf-multiselect__badge">{selected.size}</span>}
        <ChevronDown size={13} className={`cf-multiselect__chevron ${open ? 'cf-multiselect__chevron--up' : ''}`}/>
      </button>
      {open && (
        <div className="cf-multiselect__dropdown"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}>
          {options.length > 6 && (
            <div className="cf-multiselect__search">
              <Search size={12}/>
              <input type="text" className="cf-multiselect__search-input" placeholder="Buscar..."
                value={search} onChange={e => setSearch(e.target.value)} autoFocus/>
              {search && <button className="cf-multiselect__search-clear" onClick={() => setSearch('')}><X size={10}/></button>}
            </div>
          )}
          <button type="button"
            className={`cf-multiselect__option cf-multiselect__option--all ${allSelected ? 'cf-multiselect__option--selected' : ''}`}
            onClick={toggleAll}>
            <span className="cf-multiselect__option-check">{allSelected && <Check size={11}/>}</span>
            <span>{t.actions.filters}</span>
            <span className="cf-multiselect__option-count">{options.length}</span>
          </button>
          <div className="cf-multiselect__divider"/>
          {filtered.length === 0
            ? <p className="cf-multiselect__empty">{t.errors.notFound}</p>
            : filtered.map(opt => {
                const isSel = selected.has(opt)
                return (
                  <button key={opt} type="button"
                    className={`cf-multiselect__option ${isSel ? 'cf-multiselect__option--selected' : ''}`}
                    onClick={() => toggle(opt)}>
                    <span className="cf-multiselect__option-check">{isSel && <Check size={11}/>}</span>
                    <span className="cf-multiselect__option-label">{opt}</span>
                  </button>
                )
              })
          }
        </div>
      )}
    </div>
  )
}

// ─── CallCard ─────────────────────────────────────────────────────────────────

export interface CallCardProps { call: Call; onDelete?: () => void; onViewAnalysis: () => void; onRetry?: () => void }

export const CallCard: React.FC<CallCardProps> = ({ call, onDelete, onViewAnalysis, onRetry }) => {
  const { t } = useLang()
  const { label, className } = getStatusConfig(t)[call.status]
  const isAnalyzed = call.status === 'ANALYZED' || call.status === 'AUDITED'
  const pct = call.scoreMax ? Math.round((call.scoreTotal! / call.scoreMax) * 100) : null

  return (
    <div className="call-card">
      <div className="call-card__header">
        <div className="call-card__icon"><Mic size={18}/></div>
        <div className="call-card__title-group">
          <h4 className="call-card__name" title={call.nombreGrabacion}>{call.nombreGrabacion}</h4>
          {call.idLlamada && <span className="call-card__id">#{call.idLlamada}</span>}
        </div>
        <span className={`call-status ${className}`}>
          {['UPLOADING','ANALYZING'].includes(call.status) && <span className="call-status__spinner"/>}
          {label}
        </span>
      </div>
      <div className="call-card__meta">
        {call.usuarioLlamada     && <div className="call-card__meta-item"><User size={12}/><span>{call.usuarioLlamada}</span></div>}
        {call.duracionSegundos   && <div className="call-card__meta-item"><Clock size={12}/><span>{formatDuration(call.duracionSegundos)}</span></div>}
        {call.fechaInicioLlamada && <div className="call-card__meta-item"><PhoneIncoming size={12}/><span>{formatDate(call.fechaInicioLlamada)}</span></div>}
        {call.idContacto         && <div className="call-card__meta-item"><Phone size={12}/><span>{call.idContacto}</span></div>}
      </div>
      {isAnalyzed && call.scoreTotal !== undefined && call.scoreTotal !== null && (
        <div className="call-card__score">
          <span className="call-card__score-label">{t.speech.score}</span>
          {pct !== null && (
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: scoreColor(pct), lineHeight: 1, margin: '0.2rem 0' }}>
              {pct}<span style={{ fontSize: '0.9rem', fontWeight: 600 }}>%</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{call.scoreTotal.toFixed(1)}{call.scoreMax ? `/${call.scoreMax.toFixed(1)} pts` : ' pts'}</span>
            {call.indTotal ? <><span style={{ opacity: 0.4 }}>·</span><span>{call.indOk ?? 0}/{call.indTotal} ind.</span></> : null}
          </div>
          {pct !== null && <ScoreBar pct={pct} />}
        </div>
      )}
      {call.status === 'ERROR' && call.errorMessage && <p className="call-card__error">{call.errorMessage}</p>}
      <div className="call-card__footer">
        <span className="call-card__date">{formatDate(call.createdAt)}</span>
        <div className="call-card__footer-actions">
          {isAnalyzed && <button className="call-card__icon-btn call-card__icon-btn--analyze" onClick={onViewAnalysis} title={t.speech.analysisResult}><BarChart2 size={14}/></button>}
          {call.status === 'ERROR' && onRetry && <button className="call-card__icon-btn call-card__icon-btn--retry" onClick={onRetry} title={t.actions.confirm}><RefreshCw size={14}/></button>}
          {onDelete && <button className="call-card__icon-btn call-card__icon-btn--delete" onClick={onDelete} title={t.actions.delete}><Trash2 size={14}/></button>}
        </div>
      </div>
    </div>
  )
}

// ─── CallRow ──────────────────────────────────────────────────────────────────

export const CallRow: React.FC<CallCardProps> = ({ call, onDelete, onViewAnalysis, onRetry }) => {
  const { t } = useLang()
  const { label, className } = getStatusConfig(t)[call.status]
  const isAnalyzed = call.status === 'ANALYZED' || call.status === 'AUDITED'
  const pct = call.scoreMax && call.scoreTotal !== undefined && call.scoreTotal !== null
    ? Math.round((call.scoreTotal / call.scoreMax) * 100)
    : null

  return (
    <div className={`call-row ${isAnalyzed ? 'call-row--clickable' : ''}`} onClick={isAnalyzed ? onViewAnalysis : undefined}>
      <div className="call-row__icon"><Mic size={14}/></div>
      <div className="call-row__name">
        <span className="call-row__title" title={call.nombreGrabacion}>{call.nombreGrabacion}</span>
        {call.idLlamada && <span className="call-row__id">#{call.idLlamada}</span>}
      </div>
      <div className="call-row__meta">
        {call.usuarioLlamada     && <span className="call-row__meta-item"><User size={11}/>{call.usuarioLlamada}</span>}
        {call.duracionSegundos   && <span className="call-row__meta-item"><Clock size={11}/>{formatDuration(call.duracionSegundos)}</span>}
        {call.fechaInicioLlamada && <span className="call-row__meta-item"><PhoneIncoming size={11}/>{formatDate(call.fechaInicioLlamada)}</span>}
      </div>
      {isAnalyzed && call.scoreTotal !== undefined && call.scoreTotal !== null ? (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          {pct !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '70px' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: scoreColor(pct), lineHeight: 1 }}>
                {pct}<span style={{ fontSize: '0.65em', fontWeight: 600 }}>%</span>
              </span>
              <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: scoreColor(pct), transition: 'width 0.4s' }} />
              </div>
            </div>
          )}
          {pct !== null && call.indTotal ? <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} /> : null}
          {call.indTotal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '54px' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ind.</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {call.indOk ?? 0}<span style={{ fontSize: '0.65em', fontWeight: 400, opacity: 0.45 }}>/{call.indTotal}</span>
              </span>
              <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(((call.indOk ?? 0) / call.indTotal) * 100)}%`, borderRadius: '999px', background: scoreColor(Math.round(((call.indOk ?? 0) / call.indTotal) * 100)), transition: 'width 0.4s' }} />
              </div>
            </div>
          ) : null}
        </div>
      ) : <span className="call-row__score call-row__score--empty">—</span>}
      <span className={`call-status ${className} call-row__status`}>
        {['UPLOADING','ANALYZING'].includes(call.status) && <span className="call-status__spinner"/>}
        {label}
      </span>
      <div className="call-row__actions" onClick={e => e.stopPropagation()}>
        {isAnalyzed && <button className="call-card__icon-btn call-card__icon-btn--analyze" onClick={onViewAnalysis}><BarChart2 size={13}/></button>}
        {call.status === 'ERROR' && onRetry && <button className="call-card__icon-btn call-card__icon-btn--retry" onClick={onRetry}><RefreshCw size={13}/></button>}
        {onDelete && <button className="call-card__icon-btn call-card__icon-btn--delete" onClick={onDelete}><Trash2 size={13}/></button>}
      </div>
    </div>
  )
}