import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart2, Calendar, Clock, DollarSign,
  Edit, RefreshCw, Save, X, Filter,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { useAdminContext } from '../context/AdminContext'
import {
  billingService,
  type BillingAdminSummary,
  type BillingClientSummary,
  type CampaignBillingRow,
} from '../services/billing.service'
import { useLang } from '../context/LangContext'
import { CARD_GRADIENTS, getCampaignColor } from './CampaignsView'
import {
  DatePicker,
  MultiSelect,
  toInputDate,
  getDefaultDateFrom,
  getDefaultDateTo,
  formatDisplayDate,
} from '../components/CallShared'

// ── Normaliza shape de cliente al de admin ────────────────────────────────────
function normalizeClientSummary(c: BillingClientSummary): BillingAdminSummary {
  return {
    totalMinutes:     c.totalMinutes,
    totalGeminiCost:  0,
    totalClientPrice: c.totalPrice ?? 0,
    totalMargin:      0,
    marginPct:        0,
    geminiCostPerMin: 0,
    campaigns: c.campaigns.map(camp => ({
      campaignId:          camp.campaignId,
      campaignName:        camp.campaignName,
      isActive:            camp.isActive,
      minutesConsumed:     camp.minutesConsumed,
      minutesLimit:        camp.minutesLimit ?? null,
      minutesLimitEnabled: camp.minutesLimit != null,
      limitPct:            camp.limitPct ?? null,
      pricePerMinute:      camp.pricePerMinute ?? null,
      geminiCost:          0,
      clientPrice:         camp.subtotal ?? null,
      margin:              null,
      marginPct:           null,
      periodStartDate:     null,
      periodDays:          30,
      nextRenewalDate:     null,
      daysUntilRenewal:    camp.daysUntilRenewal ?? null,
      currentPeriodLabel:  camp.currentPeriodLabel ?? null,
    })),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, dec = 2) =>
  n == null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtMin = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const getInitials = (name: string) => {
  const uppers = name.match(/[A-ZÁÉÍÓÚÑÜ]/g)
  if (!uppers || uppers.length === 0) return name.slice(0, 2).toUpperCase()
  return uppers.slice(0, 3).join('')
}

// ── Mini progress bar ─────────────────────────────────────────────────────────

const MiniBar: React.FC<{ pct: number | null }> = ({ pct }) => {
  if (pct == null) return null
  const color = pct >= 90 ? 'var(--color-danger)' : pct >= 70 ? 'var(--color-warning,#f59e0b)' : 'var(--color-primary)'
  return (
    <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden', marginTop: 4, minWidth: 40 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .3s' }} />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; sub?: string; colorClass: string; icon: React.ReactNode }> = ({
  label, value, sub, colorClass, icon,
}) => (
  <div className={`stat-card ${colorClass}`}>
    <div className="dashboard-admin__stat-card">
      <div>
        <p className="dashboard-admin__stat-label">{label}</p>
        <p className="dashboard-admin__stat-value">{value}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <div className="dashboard-admin__stat-icon">{icon}</div>
    </div>
  </div>
)

// ── Avatar campaña ────────────────────────────────────────────────────────────

const CampaignAvatar: React.FC<{ name: string; colorIdx: number }> = ({ name, colorIdx }) => {
  const gradient    = CARD_GRADIENTS[colorIdx % CARD_GRADIENTS.length]
  const accentColor = getCampaignColor(colorIdx)
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.68rem', fontWeight: 900,
      color: 'rgba(255,255,255,0.95)',
      letterSpacing: '0.04em',
      boxShadow: `0 2px 8px color-mix(in srgb, ${accentColor} 35%, transparent)`,
    }}>
      {getInitials(name)}
    </div>
  )
}

// ── Config editor — usa Modal para que el DatePicker no quede clippeado ───────

interface CampaignConfigEditorProps {
  row:     CampaignBillingRow
  onSaved: () => void
  onRenew: () => void
  t:       any
}

const CampaignConfigEditor: React.FC<CampaignConfigEditorProps> = ({ row, onSaved, onRenew, t }) => {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [price,      setPrice]      = useState('')
  const [pStart,     setPStart]     = useState('')
  const [pDays,      setPDays]      = useState('30')
  const [saving,     setSaving]     = useState(false)
  const [renewing,   setRenewing]   = useState(false)
  const [openPicker, setOpenPicker] = useState(false)

  const handleEdit = () => {
    setPrice(row.pricePerMinute  != null ? String(row.pricePerMinute)  : '')
    setPStart(row.periodStartDate ? row.periodStartDate.slice(0, 10)   : '')
    setPDays(String(row.periodDays || 30))
    setOpenPicker(false)
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await billingService.setCampaignConfig(
        row.campaignId,
        price  !== '' ? parseFloat(price)              : null,
        pStart !== '' ? new Date(pStart).toISOString() : null,
        parseInt(pDays, 10) || 30,
      )
      onSaved()
      setModalOpen(false)
    } finally { setSaving(false) }
  }

  const handleRenew = async () => {
    const result = await Swal.fire({
      title: t.billing?.renewConfirmTitle ?? '¿Renovar período?',
      html: `<b>${row.campaignName}</b><br><small style="color:#9ca3af">${
        t.billing?.renewConfirmText ??
        'Los minutos se resetearán y la campaña se reactivará si estaba inactiva por límite.'
      }</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2c92e6',
      cancelButtonColor:  '#6b7280',
      confirmButtonText: t.billing?.renewNow ?? 'Renovar ahora',
      cancelButtonText:  t.actions?.cancel   ?? 'Cancelar',
    })
    if (!result.isConfirmed) return
    setRenewing(true)
    try {
      const res = await billingService.renewCampaign(row.campaignId)
      await Swal.fire({
        icon: 'success',
        title: t.billing?.renewedTitle ?? 'Período renovado',
        ...(res.reactivated && { html: `<small>${t.billing?.reactivated ?? 'Campaña reactivada.'}</small>` }),
        confirmButtonColor: '#2c92e6',
        timer: 2500,
        showConfirmButton: false,
      })
      onRenew()
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', confirmButtonColor: '#dc2626' })
    } finally { setRenewing(false) }
  }

  const daysColor = row.daysUntilRenewal != null
    ? (row.daysUntilRenewal <= 3 ? 'var(--color-danger)' : row.daysUntilRenewal <= 7 ? 'var(--color-warning,#f59e0b)' : 'var(--color-success)')
    : 'var(--text-muted)'

  return (
    <>
      {/* Fila compacta */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        <span>
          <span style={{ color: 'var(--text-muted)' }}>{t.billing?.pricePerMin ?? 'Precio/min'}: </span>
          <strong style={{ color: row.pricePerMinute != null ? 'var(--color-primary)' : 'var(--text-muted)' }}>
            {row.pricePerMinute != null ? `$${fmt(row.pricePerMinute, 3)}` : t.billing?.notConfigured ?? 'No config.'}
          </strong>
        </span>
        <span>
          <span style={{ color: 'var(--text-muted)' }}>{t.billing?.period ?? 'Período'}: </span>
          <strong style={{ color: row.currentPeriodLabel ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {row.currentPeriodLabel ?? (t.billing?.periodNotSet ?? 'No configurado')}
          </strong>
        </span>
        {row.daysUntilRenewal != null && (
          <span style={{
            padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
            background: `color-mix(in srgb, ${daysColor} 15%, transparent)`,
            color: daysColor,
            border: `1px solid color-mix(in srgb, ${daysColor} 30%, transparent)`,
          }}>
            {(t.billing?.renewsIn ?? 'Renueva en {n}d').replace('{n}', row.daysUntilRenewal)}
          </span>
        )}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={handleEdit} className="campaign-card__icon-btn" title={t.actions?.edit ?? 'Editar'}>
            <Edit size={14} />
          </button>
          {row.currentPeriodLabel && (
            <button onClick={handleRenew} disabled={renewing} className="campaign-card__icon-btn" title={t.billing?.renewNow ?? 'Renovar ahora'}>
              <RefreshCw size={14} className={renewing ? 'spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Modal de edición — inline para poder agregar overflow:visible y que el DatePicker no quede clippeado */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="modal modal--md" style={{ overflow: 'visible' }}>
            <div className="modal__header">
              <h3 className="modal__title">{t.billing?.configTitle ?? 'Configurar'} — {row.campaignName}</h3>
              <button type="button" className="modal__close" onClick={() => setModalOpen(false)}><X size={22} /></button>
            </div>
            <div className="modal__body" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group form-group--no-margin">
            <label className="form-group__label">
              <DollarSign size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {t.billing?.pricePerMin ?? 'Precio / min'}
            </label>
            <input
              type="number" min={0} step={0.001} placeholder="0.050"
              value={price} onChange={e => setPrice(e.target.value)}
              className="form-group__input" autoFocus style={{ paddingLeft: 0 }}
            />
            <div className="form-group__line" />
          </div>

          <div className="form-group form-group--no-margin">
            <label className="form-group__label">
              <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {t.billing?.periodStart ?? 'Inicio del período'}
            </label>
            <div
              className="calls-search-field calls-search-field--date"
              onClick={() => setOpenPicker(p => !p)}
              style={{ border: 'none', borderBottom: '1.5px solid var(--border-color)', borderRadius: 0, paddingBottom: 4, cursor: 'pointer', position: 'relative' }}
            >
              <Calendar size={13} className="calls-search-field__icon" />
              <span className={`calls-search-field__date-value${!pStart ? ' calls-search-field__date-value--placeholder' : ''}`}>
                {formatDisplayDate(pStart) || (t.billing?.selectDate ?? 'Seleccionar...')}
              </span>
              {pStart && (
                <button className="calls-search-field__clear" onClick={e => { e.stopPropagation(); setPStart('') }}>
                  <X size={9} />
                </button>
              )}
              {openPicker && (
                <DatePicker
                  value={pStart}
                  onChange={v => { setPStart(v); setOpenPicker(false) }}
                  maxDate={toInputDate(new Date())}
                  onClose={() => setOpenPicker(false)}
                />
              )}
            </div>
          </div>

          <div className="form-group form-group--no-margin">
            <label className="form-group__label">
              <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {t.billing?.days ?? 'Días'}
            </label>
            <input
              type="number" min={1} max={365} step={1}
              value={pDays} onChange={e => setPDays(e.target.value)}
              className="form-group__input" style={{ paddingLeft: 0 }}
            />
            <div className="form-group__line" />
          </div>
        </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                {t.actions?.cancel ?? 'Cancelar'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} />
                {saving ? (t.actions?.saving ?? 'Guardando...') : (t.actions?.save ?? 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Row de campaña ────────────────────────────────────────────────────────────

interface CampaignRowProps {
  row:       CampaignBillingRow
  colorIdx:  number
  isAdmin:   boolean
  onRefresh: () => void
  t:         any
}

const CampaignRow: React.FC<CampaignRowProps> = ({ row, colorIdx, isAdmin, onRefresh, t }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)',
      flexWrap: 'wrap', rowGap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
        <CampaignAvatar name={row.campaignName} colorIdx={colorIdx} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.campaignName}
          </p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: row.isActive ? 'var(--color-success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {row.isActive ? (t.labels?.active ?? 'Activa') : (t.labels?.inactive ?? 'Inactiva')}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right', minWidth: 72 }}>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.billing?.minutes ?? 'Minutos'}</p>
          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>
            {fmtMin(row.minutesConsumed)}
            {row.minutesLimit != null && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}> / {fmtMin(row.minutesLimit)}</span>}
          </p>
          {row.limitPct != null && <MiniBar pct={row.limitPct} />}
        </div>
        {isAdmin && (
          <>
            <div style={{ textAlign: 'right', minWidth: 72 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.billing?.geminiCost ?? 'Costo Gemini'}</p>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-danger)' }}>${fmt(row.geminiCost, 4)}</p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 72 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.billing?.clientPrice ?? 'A facturar'}</p>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-primary)' }}>{row.clientPrice != null ? `$${fmt(row.clientPrice)}` : '—'}</p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 56 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.billing?.margin ?? 'Margen'}</p>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-success)' }}>{row.marginPct != null ? `${row.marginPct}%` : '—'}</p>
            </div>
          </>
        )}
        {!isAdmin && row.clientPrice != null && (
          <div style={{ textAlign: 'right', minWidth: 72 }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.billing?.subtotal ?? 'Subtotal'}</p>
            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-primary)' }}>${fmt(row.clientPrice)}</p>
          </div>
        )}
      </div>
    </div>
    <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(128,128,128,0.025)' }}>
      {isAdmin ? (
        <CampaignConfigEditor row={row} onSaved={onRefresh} onRenew={onRefresh} t={t} />
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>{t.billing?.period ?? 'Período'}: </span>
            <strong style={{ color: row.currentPeriodLabel ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {row.currentPeriodLabel ?? (t.billing?.periodNotSet ?? 'No configurado')}
            </strong>
          </span>
          {row.daysUntilRenewal != null && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
              background: row.daysUntilRenewal <= 3 ? 'rgba(220,38,38,0.1)' : 'rgba(100,116,139,0.08)',
              color: row.daysUntilRenewal <= 3 ? 'var(--color-danger)' : 'var(--text-muted)',
              border: `1px solid ${row.daysUntilRenewal <= 3 ? 'rgba(220,38,38,0.2)' : 'var(--border-color)'}`,
            }}>
              {(t.billing?.renewsIn ?? 'Renueva en {n}d').replace('{n}', row.daysUntilRenewal)}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
)

// ── Modal de filtros ──────────────────────────────────────────────────────────
// MultiSelect con la misma lógica que CallsView:
// selected = Set vacío → "Todos" (sin filtro activo), igual que selNames/selUsers allí.
// t.actions.filters es el label del "select all / limpiar" dentro del dropdown.

interface BillingFilterModalProps {
  campaigns:    { campaignId: string; campaignName: string }[]
  dateFrom:     string
  dateTo:       string
  selCampaigns: Set<string>
  onApply:      (from: string, to: string, camps: Set<string>) => void
  onClear:      () => void
  hasFilter:    boolean
  t:            any
}

const BillingFilterModal: React.FC<BillingFilterModalProps> = ({
  campaigns, dateFrom, dateTo, selCampaigns, onApply, onClear, hasFilter, t,
}) => {
  const [open,       setOpen]       = useState(false)
  const [tmpFrom,    setTmpFrom]    = useState(dateFrom)
  const [tmpTo,      setTmpTo]      = useState(dateTo)
  const [tmpCamps,   setTmpCamps]   = useState<Set<string>>(new Set(selCampaigns))
  const [openPicker, setOpenPicker] = useState<'from' | 'to' | null>(null)

  const handleOpen = () => {
    // Defaults: primer día del mes → hoy (getDefaultDateFrom/To de CallShared)
    setTmpFrom(dateFrom || getDefaultDateFrom())
    setTmpTo(dateTo     || getDefaultDateTo())
    setTmpCamps(new Set(selCampaigns))
    setOpenPicker(null)
    setOpen(true)
  }

  const handleApply = () => { onApply(tmpFrom, tmpTo, tmpCamps); setOpen(false) }
  const handleClear = () => { onClear(); setOpen(false) }

  const campaignNames = campaigns.map(c => c.campaignName)

  return (
    <>
      <button
        onClick={handleOpen}
        className={`calls-header__icon-btn${hasFilter ? ' calls-header__icon-btn--active' : ''}`}
        title={t.actions?.search ?? 'Filtros'}
      >
        <Filter size={15} />
        {hasFilter && <span className="calls-header__filter-dot" />}
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setOpenPicker(null) } }}
        >
          <div className="modal modal--lg calls-filter-modal">
            <div className="modal__header">
              <h3 className="modal__title">{t.billing?.filterTitle ?? 'Filtrar facturación'}</h3>
              <button className="modal__close" onClick={() => { setOpen(false); setOpenPicker(null) }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal__body">
              {/* Fechas — idéntico a CallsView */}
              <div className="calls-filter-section">
                <p className="calls-filter-section__label">{t.billing?.filterPeriod ?? 'Período'}</p>
                <div className="calls-filter-dates">
                  <div className="calls-search-field calls-search-field--date"
                    onClick={() => setOpenPicker(p => p === 'from' ? null : 'from')}>
                    <Calendar size={13} className="calls-search-field__icon" />
                    <span className="calls-search-field__date-value">
                      {formatDisplayDate(tmpFrom) || <span className="calls-search-field__date-value--placeholder">Desde...</span>}
                    </span>
                    {tmpFrom && <button className="calls-search-field__clear" onClick={e => { e.stopPropagation(); setTmpFrom('') }}><X size={9} /></button>}
                    {openPicker === 'from' && (
                      <DatePicker value={tmpFrom} onChange={v => { setTmpFrom(v); setOpenPicker(null) }}
                        maxDate={tmpTo || toInputDate(new Date())} onClose={() => setOpenPicker(null)} />
                    )}
                  </div>
                  <span className="calls-filter-dates__sep">—</span>
                  <div className="calls-search-field calls-search-field--date"
                    onClick={() => setOpenPicker(p => p === 'to' ? null : 'to')}>
                    <Calendar size={13} className="calls-search-field__icon" />
                    <span className="calls-search-field__date-value">
                      {formatDisplayDate(tmpTo) || <span className="calls-search-field__date-value--placeholder">Hasta...</span>}
                    </span>
                    {tmpTo && <button className="calls-search-field__clear" onClick={e => { e.stopPropagation(); setTmpTo('') }}><X size={9} /></button>}
                    {openPicker === 'to' && (
                      <DatePicker value={tmpTo} onChange={v => { setTmpTo(v); setOpenPicker(null) }}
                        minDate={tmpFrom} maxDate={toInputDate(new Date())} onClose={() => setOpenPicker(null)} />
                    )}
                  </div>
                </div>
              </div>

              {/* Campañas — MultiSelect EXACTAMENTE igual que CallsView usa selNames:
                  selected vacío = placeholder = "Todas" = sin filtro.
                  El label del "select all" es t.actions.filters (="Limpiar filtros"). */}
              {campaigns.length > 0 && (
                <div className="calls-filter-section">
                  <div className="calls-filter-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <MultiSelect
                      label={t.labels?.campaign ?? 'Campaña'}
                      icon={<Filter size={13} />}
                      options={campaignNames}
                      selected={tmpCamps}
                      onChange={setTmpCamps}
                      placeholder={t.billing?.allCampaigns ?? 'Todas las campañas'}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={handleClear}>{t.actions?.cancel ?? 'Limpiar'}</button>
              <button className="btn btn-primary" onClick={handleApply}>{t.actions?.confirm ?? 'Aplicar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

export const BillingView: React.FC = () => {
  const { isAdmin } = useAdminContext()
  const { t } = useLang()

  const [data,    setData]    = useState<BillingAdminSummary | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtros — Set vacío = sin filtro (todas), igual que CallsView
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [selCampaigns, setSelCampaigns] = useState<Set<string>>(new Set())
  const hasFilter = !!(dateFrom || dateTo || selCampaigns.size > 0)

  const handleApplyFilter = (from: string, to: string, camps: Set<string>) => {
    setDateFrom(from); setDateTo(to); setSelCampaigns(camps)
  }
  const handleClearFilter = () => { setDateFrom(''); setDateTo(''); setSelCampaigns(new Set()) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isAdmin) { setData(await billingService.getAdminSummary()) }
      else         { setData(normalizeClientSummary(await billingService.getMyBilling())) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  // Filtrar por nombre de campaña (vacío = todas) y fecha
  const filteredCampaigns = useMemo(() => {
    if (!data) return []
    return data.campaigns.filter(row => {
      if (selCampaigns.size > 0 && !selCampaigns.has(row.campaignName)) return false
      if (dateFrom || dateTo) {
        if (!row.periodStartDate) return true
        const d = new Date(row.periodStartDate)
        if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false
        if (dateTo   && d > new Date(dateTo   + 'T23:59:59')) return false
      }
      return true
    })
  }, [data, dateFrom, dateTo, selCampaigns])

  const totals = useMemo(() => {
    const camps = filteredCampaigns
    const totalMinutes     = camps.reduce((s, r) => s + (r.minutesConsumed ?? 0), 0)
    const totalGeminiCost  = camps.reduce((s, r) => s + (r.geminiCost  ?? 0), 0)
    const totalClientPrice = camps.reduce((s, r) => s + (r.clientPrice ?? 0), 0)
    const totalMargin      = totalClientPrice - totalGeminiCost
    const marginPct        = totalClientPrice > 0 ? Math.round((totalMargin / totalClientPrice) * 100) : 0
    const geminiCostPerMin = totalMinutes > 0 ? totalGeminiCost / totalMinutes : 0
    return { totalMinutes, totalGeminiCost, totalClientPrice, totalMargin, marginPct, geminiCostPerMin }
  }, [filteredCampaigns])

  return (
    <div className="calls-page">
      <div className="calls-header">
        <div className="calls-header__top">
          <div className="calls-page__title-group">
            <h1 className="calls-header__title">{t.billing?.title ?? 'Facturación'}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {data && (
              <BillingFilterModal
                campaigns={data.campaigns.map(c => ({ campaignId: c.campaignId, campaignName: c.campaignName }))}
                dateFrom={dateFrom} dateTo={dateTo}
                selCampaigns={selCampaigns}
                onApply={handleApplyFilter}
                onClear={handleClearFilter}
                hasFilter={hasFilter} t={t}
              />
            )}
            <button onClick={load} disabled={loading} className="calls-header__icon-btn"
              title={loading ? (t.actions?.loading ?? 'Cargando...') : (t.actions?.update ?? 'Actualizar')}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
        <p className="calls-header__sub">
          {isAdmin ? (t.billing?.adminSubtitle ?? 'Costos, precios y márgenes por campaña')
                   : (t.billing?.clientSubtitle ?? 'Resumen de consumo de minutos transcriptos')}
        </p>
      </div>

      {hasFilter && !loading && data && (
        <div className="calls-active-filters-banner">
          <span className="calls-active-filters-banner__text">
            <Filter size={13} />
            {filteredCampaigns.length} / {data.campaigns.length} {t.billing?.allCampaigns ?? 'campañas'}
            {selCampaigns.size > 0 && ` · ${selCampaigns.size} sel.`}
            {dateFrom && ` · desde ${formatDisplayDate(dateFrom)}`}
            {dateTo   && ` · hasta ${formatDisplayDate(dateTo)}`}
          </span>
          <button className="calls-active-filters-banner__btn" onClick={handleClearFilter}>
            <X size={12} /> {t.actions?.cancel ?? 'Limpiar'}
          </button>
        </div>
      )}

      {data && (
        <div className="billing-totals-grid" style={{ marginBottom: '1.25rem' }}>
          <StatCard label={t.billing?.totalMinutes ?? 'Minutos totales'} value={`${fmtMin(totals.totalMinutes)} min`}
            sub={t.billing?.allCampaigns ?? 'todas las campañas'} colorClass="stat-card--blue"
            icon={<Clock size={20} color="var(--color-primary)" />} />
          {isAdmin ? (
            <>
              <StatCard label={t.billing?.geminiCostTotal ?? 'Costo Gemini'} value={`$${fmt(totals.totalGeminiCost)}`}
                sub={`$${fmt(totals.geminiCostPerMin, 4)}/min`} colorClass="stat-card--red"
                icon={<DollarSign size={20} color="var(--color-danger)" />} />
              <StatCard label={t.billing?.totalToBill ?? 'A facturar'} value={`$${fmt(totals.totalClientPrice)}`}
                sub={t.billing?.toClients ?? 'a clientes'} colorClass="stat-card--cyan"
                icon={<DollarSign size={20} color="#0891b2" />} />
              <StatCard label={t.billing?.totalMargin ?? 'Margen total'} value={`$${fmt(totals.totalMargin)}`}
                sub={`${totals.marginPct}%`} colorClass="stat-card--green"
                icon={<BarChart2 size={20} color="var(--color-success)" />} />
            </>
          ) : (
            <StatCard label={t.billing?.estimatedTotal ?? 'Total estimado'}
              value={totals.totalClientPrice > 0 ? `$${fmt(totals.totalClientPrice)}` : '—'}
              sub={t.billing?.allCampaigns ?? 'todas las campañas'} colorClass="stat-card--green"
              icon={<DollarSign size={20} color="var(--color-success)" />} />
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Clock size={28} style={{ marginBottom: 8, opacity: .4 }} />
          <p>{t.actions?.loading ?? 'Cargando...'}</p>
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredCampaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              {hasFilter ? (t.billing?.noData ?? 'Sin resultados.') : (t.billing?.noCampaigns ?? 'No hay campañas configuradas.')}
            </div>
          ) : filteredCampaigns.map((row, idx) => {
            const origIdx = data.campaigns.findIndex(c => c.campaignId === row.campaignId)
            return (
              <CampaignRow key={row.campaignId} row={row} colorIdx={origIdx >= 0 ? origIdx : idx}
                isAdmin={isAdmin} onRefresh={load} t={t} />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}