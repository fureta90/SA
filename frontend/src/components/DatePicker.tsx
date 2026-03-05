import React, { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const toInputDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const formatDisplayDate = (iso: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Do','Lu','Ma','Mi','Ju','Vi','Sá']

// ─── DatePicker ───────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  minDate?: string
  maxDate?: string
  onClose: () => void
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

  const prevMonth = () => viewMonth === 0  ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1)
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y + 1)) : setViewMonth(m => m + 1)

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr    = toInputDate(today)

  const isDisabled = (day: number) => {
    const str = toInputDate(new Date(viewYear, viewMonth, day))
    if (minDate && str < minDate) return true
    if (maxDate && str > maxDate) return true
    return false
  }

  return (
    <div className="date-picker-popover" ref={ref} onClick={e => e.stopPropagation()}>
      <div className="date-picker__header">
        <button className="date-picker__nav" type="button"
          onClick={e => { e.stopPropagation(); prevMonth() }}>
          <ChevronLeft size={14}/>
        </button>
        <span className="date-picker__month-label">{MONTHS_ES[viewMonth]} {viewYear}</span>
        <button className="date-picker__nav" type="button"
          onClick={e => { e.stopPropagation(); nextMonth() }}>
          <ChevronRight size={14}/>
        </button>
      </div>

      <div className="date-picker__weekdays">
        {DAYS_ES.map(d => <span key={d} className="date-picker__weekday">{d}</span>)}
      </div>

      <div className="date-picker__days">
        {Array.from({ length: firstDow }).map((_, i) => (
          <span key={`e${i}`} className="date-picker__day date-picker__day--empty"/>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const str = toInputDate(new Date(viewYear, viewMonth, day))
          const disabled = isDisabled(day)
          return (
            <button key={day} type="button" disabled={disabled}
              className={[
                'date-picker__day',
                str === value       ? 'date-picker__day--selected' : '',
                str === todayStr && str !== value ? 'date-picker__day--today' : '',
                disabled            ? 'date-picker__day--disabled' : '',
              ].join(' ')}
              onClick={e => { e.stopPropagation(); onChange(str); onClose() }}
            >{day}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── DateTimeField ────────────────────────────────────────────────────────────
// Campo completo: ícono + fecha clickeable + separador + hora
// value / onChange usan formato ISO "YYYY-MM-DDTHH:mm" (igual que datetime-local)

interface DateTimeFieldProps {
  label: string
  value: string            // "YYYY-MM-DDTHH:mm" o ""
  onChange: (v: string) => void
  maxDate?: string
  minDate?: string
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label, value, onChange, maxDate, minDate,
}) => {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerPos,  setPickerPos]  = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const datePart = value ? value.split('T')[0] : ''
  const timePart = value ? (value.split('T')[1] ?? '').slice(0, 5) : ''

  const handleDateChange = (newDate: string) => {
    const time = timePart || '00:00'
    onChange(`${newDate}T${time}`)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    const date = datePart || toInputDate(new Date())
    onChange(`${date}T${newTime}`)
  }

  const handleTogglePicker = () => {
    if (!showPicker && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + 6, left: rect.left })
    }
    setShowPicker(v => !v)
  }

  return (
    <div className="form-group">
      <label className="form-group__label">{label}</label>

      <div className="dtfield">
        {/* Bloque fecha */}
        <div
          ref={triggerRef}
          className={`dtfield__date ${showPicker ? 'dtfield__date--open' : ''}`}
          onClick={handleTogglePicker}
        >
          <Calendar size={16} className="dtfield__icon"/>
          <span className={`dtfield__date-text ${!datePart ? 'dtfield__date-text--placeholder' : ''}`}>
            {datePart ? formatDisplayDate(datePart) : 'dd/mm/aaaa'}
          </span>
        </div>

        {/* Separador */}
        <span className="dtfield__sep"/>

        {/* Bloque hora */}
        <div className="dtfield__time">
          <Clock size={14} className="dtfield__icon dtfield__icon--sm"/>
          <input
            type="time"
            className="dtfield__time-input"
            value={timePart}
            onChange={handleTimeChange}
          />
        </div>

        {/* DatePicker — position fixed para escapar del overflow del modal */}
        {showPicker && (
          <div style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}>
            <DatePicker
              value={datePart}
              onChange={v => { handleDateChange(v); setShowPicker(false) }}
              minDate={minDate}
              maxDate={maxDate}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>

      <div className="form-group__line"/>
    </div>
  )
}