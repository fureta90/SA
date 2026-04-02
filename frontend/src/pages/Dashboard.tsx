import React, { useEffect, useMemo, useState } from 'react'
import {
  Mic, BarChart2, AlertTriangle, CheckCircle,
  Clock, Megaphone, RefreshCw, Target,
  Power, PowerOff, ShieldCheck, TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'
import { callsService } from '../services/calls.service'
import { campaignsService } from '../services/campaigns.service'
import { billingService, type BillingAdminSummary, type BillingClientSummary } from '../services/billing.service'
import { getCampaignColor } from './CampaignsView'
import Swal from 'sweetalert2'
import { useLang } from '../context/LangContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CampaignStat {
  campaignId:   string
  campaignName: string
  isActive:     boolean
  total:        number
  analyzed:     number
  errors:       number
  audited:      number
  avgScore:     number | null
  scoreMax:     number | null
}

interface DashboardStats {
  campaigns:   number
  total:       number
  pending:     number
  uploading:   number
  uploaded:    number
  analyzing:   number
  analyzed:    number
  errors:      number
  audited:     number
  recentCalls: {
    id: string; name: string; score: number
    scoreMax?: number; campaign: string; campaignId: string; date: string
  }[]
  campaignStats: CampaignStat[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, dec = 2) =>
  n == null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtMin = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const getPctColor = (pct: number) =>
  pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : pct >= 40 ? '#f97316' : '#dc2626'

const getPctBg = (pct: number) =>
  pct >= 80 ? 'rgba(5,150,105,0.12)' : pct >= 60 ? 'rgba(217,119,6,0.12)'
    : pct >= 40 ? 'rgba(249,115,22,0.12)' : 'rgba(220,38,38,0.12)'

const getPctLabel = (pct: number, t: any) =>
  pct >= 70 ? t.labels.statusCampaignGood : pct >= 40 ? t.labels.statusCampaignRegular : t.labels.statusCampaignImprove

const timeAgo = (d: string) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (diff < 60)    return `${diff}s`
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Chip contador ─────────────────────────────────────────────────────────────

interface ChipProps {
  value:      string | number
  label:      string
  color:      string
  bg?:        string
  border?:    string
  onClick?:   () => void
}

const MetricChip: React.FC<ChipProps> = ({ value, label, color, bg, border, onClick }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    className="db-chip"
    style={{
      background: bg ?? 'var(--bg-app)',
      border: `1px solid ${border ?? 'var(--border-color)'}`,
      cursor: onClick ? 'pointer' : 'default',
    }}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = color }}
    onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = border ?? 'var(--border-color)' }}
  >
    <span className="db-chip__value" style={{ color }}>{value}</span>
    <span className="db-chip__label">{label}</span>
  </div>
)

// ── Banner renovaciones ───────────────────────────────────────────────────────

interface RenewalAlert { campaignName: string; daysUntilRenewal: number }

const RenewalBanner: React.FC<{ alerts: RenewalAlert[]; t: any; onGo: () => void }> = ({ alerts, t, onGo }) => {
  if (!alerts.length) return null
  return (
    <div className="db-renewal-banner">
      <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
      <span className="db-renewal-banner__text">
        {alerts.length === 1
          ? `${t.billing?.renewsIn?.replace('{n}', alerts[0].daysUntilRenewal) ?? `Renueva en ${alerts[0].daysUntilRenewal}d`}: `
          : `${alerts.length} campañas por renovar · `}
        <strong>{alerts.map(a => a.campaignName).join(', ')}</strong>
      </span>
      <button onClick={onGo} className="db-renewal-banner__btn">
        {t.billing?.title ?? 'Facturación'} →
      </button>
    </div>
  )
}

// ── Tira de billing ───────────────────────────────────────────────────────────
// Admin ve: Minutos | A facturar | Costo Gemini | Margen
// Cliente ve: Minutos | Estimado del período

interface BillingStripItem { label: string; value: string; sub?: string; valueColor?: string }

const BillingStrip: React.FC<{ items: BillingStripItem[]; onNavigate: () => void }> = ({ items, onNavigate }) => (
  <div
    className="db-billing-strip"
    onClick={onNavigate}
    role="button"
    style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
  >
    {items.map((item, i) => (
      <div key={i} className="db-billing-strip__cell" style={{ borderRight: i < items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
        <p className="db-billing-strip__label">{item.label}</p>
        <p className="db-billing-strip__value" style={{ color: item.valueColor ?? 'var(--text-primary)' }}>
          {item.value}
        </p>
        {item.sub && <p className="db-billing-strip__sub">{item.sub}</p>}
      </div>
    ))}
  </div>
)

// ── Main ──────────────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { currentUser, profiles, getUserEffectivePermissions, permissions, isAdmin, hasPermission } =
    useAdminContext()
  const navigate = useNavigate()
  const { t }    = useLang()

  const [stats,        setStats]        = useState<DashboardStats | null>(null)
  const [billing,      setBilling]      = useState<BillingAdminSummary | BillingClientSummary | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [togglingId,   setTogglingId]   = useState<string | null>(null)

  const canViewCampaigns = isAdmin ||
    hasPermission('view_campaigns') || hasPermission('add_campaigns') ||
    hasPermission('update_campaigns') || hasPermission('delete_campaigns') ||
    hasPermission('view_analytics')

  const loadStats = () => {
    setLoadingStats(true)
    Promise.all([
      callsService.getDashboardStats(),
      isAdmin
        ? billingService.getAdminSummary().catch(() => null)
        : billingService.getMyBilling().catch(() => null),
    ])
      .then(([dashData, billData]) => {
        setStats(dashData)
        setBilling(billData as any)
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false))
  }

  useEffect(() => { loadStats() }, [])

  if (!currentUser) return <p>{t.actions.loading}</p>

  const userProfiles = profiles.filter(p => currentUser.profileIds.includes(p.id))

  const handleToggleActive = async (cs: CampaignStat, e: React.MouseEvent) => {
    e.stopPropagation()
    const willActivate = !cs.isActive
    const result = await Swal.fire({
      title: willActivate ? t.campaigns.campaignActivated : t.campaigns.campaignDeactivated,
      text: willActivate
        ? `Las grabaciones de "${cs.campaignName}" volverán a procesarse.`
        : `Las grabaciones de "${cs.campaignName}" dejarán de procesarse hasta que la reactives.`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: willActivate ? '#059669' : '#d97706',
      cancelButtonColor: '#6b7280',
      confirmButtonText: willActivate ? t.actions.activate : t.actions.deactivate,
      cancelButtonText: t.actions.cancel,
    })
    if (!result.isConfirmed) return
    setTogglingId(cs.campaignId)
    try {
      await campaignsService.update(cs.campaignId, { isActive: willActivate })
      setStats(prev => prev ? {
        ...prev,
        campaignStats: prev.campaignStats.map(c =>
          c.campaignId === cs.campaignId ? { ...c, isActive: willActivate } : c
        ),
      } : prev)
    } catch {
      Swal.fire({ icon: 'error', title: t.errors.generic, text: t.campaigns.errorStatus, confirmButtonColor: '#dc2626' })
    } finally { setTogglingId(null) }
  }

  const canModifyCampaigns = isAdmin || hasPermission('update_campaigns')
  const inProgress = (stats?.pending ?? 0) + (stats?.uploading ?? 0) +
                     (stats?.uploaded ?? 0) + (stats?.analyzing ?? 0)

  const goToStatus = (statusFilter: string) => {
    if (!canViewCampaigns || !stats) return
    sessionStorage.setItem('calls_status_filter', statusFilter)
    if (stats.campaignStats.length === 1) {
      navigate(`/campaigns?open=${stats.campaignStats[0].campaignId}`)
    } else {
      navigate('/campaigns')
    }
  }

  // Score global calculado desde campaignStats (sin endpoint extra)
  const globalAvgScore = useMemo(() => {
    if (!stats?.campaignStats?.length) return null
    const scored = stats.campaignStats.filter(cs => cs.avgScore != null && cs.scoreMax && cs.scoreMax > 0)
    if (!scored.length) return null
    return Math.round(scored.reduce((s, cs) => s + (cs.avgScore! / cs.scoreMax!) * 100, 0) / scored.length)
  }, [stats])

  // Billing normalizado (admin vs cliente)
  const billingData = useMemo(() => {
    if (!billing) return null
    if ('totalGeminiCost' in billing) {
      const b = billing as BillingAdminSummary
      return { minutes: b.totalMinutes, clientPrice: b.totalClientPrice, geminiCost: b.totalGeminiCost, margin: b.totalMargin, marginPct: b.marginPct, isAdminBilling: true }
    }
    const b = billing as BillingClientSummary
    return { minutes: b.totalMinutes, clientPrice: b.totalPrice ?? null, geminiCost: null, margin: null, marginPct: null, isAdminBilling: false }
  }, [billing])

  // Alertas de renovación ≤7 días (solo admin)
  const renewalAlerts = useMemo((): RenewalAlert[] => {
    if (!isAdmin || !billing || !('campaigns' in billing)) return []
    return (billing as BillingAdminSummary).campaigns
      .filter(c => c.daysUntilRenewal != null && c.daysUntilRenewal <= 7)
      .map(c => ({ campaignName: c.campaignName, daysUntilRenewal: c.daysUntilRenewal! }))
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
  }, [billing, isAdmin])

  // Tira de billing: admin (4 celdas) vs cliente (2 celdas)
  const billingStripItems = useMemo((): BillingStripItem[] => {
    if (!billingData) return []
    if (billingData.isAdminBilling) {
      return [
        { label: t.billing?.totalMinutes ?? 'Minutos', value: `${fmtMin(billingData.minutes)} min`, sub: 'del período' },
        { label: t.billing?.totalToBill ?? 'A facturar', value: billingData.clientPrice != null ? `$${fmt(billingData.clientPrice)}` : '—', sub: t.billing?.toClients ?? 'a clientes', valueColor: '#0891b2' },
        { label: t.billing?.geminiCost ?? 'Costo Gemini', value: billingData.geminiCost != null ? `$${fmt(billingData.geminiCost)}` : '—', sub: 'AI cost', valueColor: 'var(--color-danger)' },
        { label: t.billing?.totalMargin ?? 'Margen', value: billingData.margin != null ? `$${fmt(billingData.margin)}` : '—', sub: billingData.marginPct != null ? `${billingData.marginPct}%` : '', valueColor: '#059669' },
      ]
    }
    return [
      { label: t.billing?.totalMinutes ?? 'Minutos', value: `${fmtMin(billingData.minutes)} min`, sub: 'del período' },
      { label: t.billing?.estimatedTotal ?? 'Estimado', value: billingData.clientPrice != null ? `$${fmt(billingData.clientPrice)}` : '—', sub: t.billing?.currentPeriod ?? 'período actual', valueColor: '#0891b2' },
    ]
  }, [billingData, t])

  return (
    <div className="dashboard-admin">

      {stats && (<>

        {/* ── Banner de renovación (solo admin) ── */}
        {isAdmin && renewalAlerts.length > 0 && (
          <RenewalBanner alerts={renewalAlerts} t={t} onGo={() => navigate('/billing')} />
        )}

        {/* ════════════ PANEL EJECUTIVO (Opción C) ════════════ */}
        <div className="db-executive">

          {/* Fila superior: bienvenida + chips | score */}
          <div className="db-executive__top">

            {/* ── Columna izquierda: saludo + chips ── */}
            <div className="db-executive__welcome">

              {/* Saludo — admin vs cliente */}
              <div className="db-executive__greeting">
                {isAdmin ? (
                  <>
                    <span className="db-executive__name">
                      👋 {t.dashboard.welcome}, {currentUser.name}
                    </span>
                    <span className="db-executive__sub">{t.billing?.adminSubtitle ?? 'Resumen operativo'}</span>
                  </>
                ) : (
                  <>
                    <span className="db-executive__name">
                      👋 {t.dashboard.welcome}, {currentUser.name} {currentUser.lastName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="db-executive__sub">{currentUser.company}</span>
                      {userProfiles.map(p => (
                        <span key={p.id} className="dashboard-user__profile-badge">{p.name}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Chips de contadores — todos los roles */}
              <div className="db-chips">
                <MetricChip value={stats.campaigns}  label={t.sidebar.campaigns}       color="#0891b2" onClick={canViewCampaigns ? () => navigate('/campaigns') : undefined} />
                <MetricChip value={stats.total}      label={t.labels.recordings}       color="#2c92e6" onClick={canViewCampaigns ? () => goToStatus('ALL') : undefined} />
                <MetricChip value={stats.analyzed}   label={t.labels.analyzed}         color="#059669" onClick={canViewCampaigns ? () => goToStatus('ANALYZED') : undefined} />
                <MetricChip value={stats.audited}    label={t.speech.audited ?? 'Auditadas'} color="#db2777" onClick={canViewCampaigns ? () => goToStatus('AUDITED') : undefined} />
                <MetricChip value={inProgress}       label={t.labels.inProgress}       color="#9ca3af" onClick={canViewCampaigns && inProgress > 0 ? () => goToStatus('IN_PROGRESS') : undefined} />
                {stats.errors > 0 && (
                  <MetricChip
                    value={stats.errors}
                    label={t.labels.errors}
                    color="#dc2626"
                    bg="rgba(220,38,38,0.06)"
                    border="rgba(220,38,38,0.25)"
                    onClick={canViewCampaigns ? () => goToStatus('ERROR') : undefined}
                  />
                )}
                {/* Refresh dentro de la card */}
                <button
                  onClick={loadStats}
                  className="calls-header__back"
                  title={t.actions.search}
                  disabled={loadingStats}
                  style={{ opacity: loadingStats ? 0.4 : 1, alignSelf: 'center', marginLeft: '0.25rem' }}
                >
                  <RefreshCw size={14} className={loadingStats ? 'spin' : ''} />
                </button>
              </div>
            </div>

            {/* ── Score grande — visible para todos ── */}
            <div
              className="db-executive__score"
              onClick={() => navigate('/reports')}
              title={t.reports?.avgScore ?? 'Score promedio'}
            >
              <p className="db-executive__score-label">{t.reports?.avgScore ?? 'Score promedio'}</p>
              {globalAvgScore != null ? (
                <>
                  <p className="db-executive__score-value" style={{ color: getPctColor(globalAvgScore) }}>
                    {globalAvgScore}<span className="db-executive__score-pct">%</span>
                  </p>
                  <p className="db-executive__score-tag" style={{ color: getPctColor(globalAvgScore) }}>
                    {getPctLabel(globalAvgScore, t)}
                  </p>
                  <div className="db-executive__score-bar">
                    <div
                      className="db-executive__score-bar-fill"
                      style={{ width: `${globalAvgScore}%`, background: getPctColor(globalAvgScore) }}
                    />
                  </div>
                </>
              ) : (
                <p className="db-executive__score-value" style={{ color: 'var(--text-muted)' }}>—</p>
              )}
            </div>
          </div>

          {/* ── Tira de billing — admin (4 celdas) o cliente (2 celdas) ── */}
          {billingStripItems.length > 0 && (
            <div className="db-executive__billing">
              <BillingStrip items={billingStripItems} onNavigate={() => navigate('/billing')} />
            </div>
          )}
        </div>
        {/* ═══════════════════════════════════════════════════ */}

        {/* ── Por campaña + timeline ── */}
        <div className="dashboard-bottom-2col">

          {/* Campañas */}
          <div>
            <h4 className="dashboard-sub__title"><Target size={14} /> {t.sidebar.campaigns}</h4>
            <div className="dashboard-campaign-list">
              {stats.campaignStats.length === 0 ? (
                <p className="dashboard-empty-msg">{t.labels.noCampaigns}</p>
              ) : stats.campaignStats.map((cs, idx) => {
                const pct = cs.scoreMax && cs.avgScore !== null
                  ? Math.round((cs.avgScore / cs.scoreMax) * 100) : null
                return (
                  <div
                    key={cs.campaignId}
                    className={`dashboard-campaign-row${!cs.isActive ? ' dashboard-campaign-row--inactive' : ''}`}
                    onClick={() => canViewCampaigns ? navigate(`/campaigns?open=${cs.campaignId}`) : undefined}
                    style={{ cursor: canViewCampaigns ? 'pointer' : 'default' }}
                  >
                    <div className="dashboard-campaign-row__name">
                      <span className="dashboard-campaign-row__dot" style={{ backgroundColor: getCampaignColor(idx) }} />
                      <span>{cs.campaignName}</span>
                    </div>

                    {/* Mini barra de score — visible para todos */}
                    {pct !== null && (
                      <div className="db-campaign-score">
                        <div className="db-campaign-score__bar">
                          <div style={{ height: '100%', width: `${pct}%`, background: getPctColor(pct), borderRadius: 2, transition: 'width 0.5s ease' }} />
                        </div>
                        <span className="db-campaign-score__value" style={{ color: getPctColor(pct) }}>{pct}%</span>
                      </div>
                    )}

                    <div className="dashboard-campaign-row__right">
                      <div className="dashboard-campaign-row__stats">
                        <span className="dcs dcs--total"    title={t.labels.recordings}><Mic size={10} /> {cs.total}</span>
                        <span className="dcs dcs--analyzed" title={t.labels.analyzed}><CheckCircle size={10} /> {cs.analyzed}</span>
                        <span className={`dcs ${cs.errors > 0 ? 'dcs--error' : 'dcs--ok'}`} title={t.labels.errors}><AlertTriangle size={10} /> {cs.errors}</span>
                      </div>

                      <span className={`dcr-status-badge${cs.isActive ? ' dcr-status-badge--active' : ' dcr-status-badge--inactive'}`}>
                        <span className="dcr-status-dot" />
                        {cs.isActive ? t.labels.active : t.labels.inactive}
                      </span>

                      {/* Botón toggle — solo quien puede modificar campañas */}
                      {canModifyCampaigns && (
                        <button
                          className={`dcr-toggle-btn${cs.isActive ? ' dcr-toggle-btn--deactivate' : ' dcr-toggle-btn--activate'}`}
                          title={cs.isActive ? t.actions.deactivate : t.actions.activate}
                          disabled={togglingId === cs.campaignId}
                          onClick={e => handleToggleActive(cs, e)}
                        >
                          {cs.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timeline últimas 5 analizadas */}
          <div>
            <h4 className="dashboard-sub__title"><BarChart2 size={14} /> {t.labels.analyzed}</h4>
            {stats.recentCalls.length === 0 ? (
              <p className="dashboard-empty-msg">{t.labels.noRecordings}</p>
            ) : (
              <div className="dash-timeline">
                {stats.recentCalls.slice(0, 5).map((call, idx) => {
                  const pct = call.scoreMax && call.score != null
                    ? Math.round((call.score / call.scoreMax) * 100)
                    : call.score != null ? Math.round(call.score) : null
                  return (
                    <div
                      key={call.id}
                      className="dash-timeline__item"
                      onClick={() => canViewCampaigns ? navigate(`/campaigns?open=${call.campaignId}&call=${call.id}`) : undefined}
                      title={t.speech.analysisResult}
                      style={{ cursor: canViewCampaigns ? 'pointer' : 'default' }}
                    >
                      <div className="dash-timeline__track">
                        <div className="dash-timeline__dot" />
                        {idx < Math.min(stats.recentCalls.length, 5) - 1 && <div className="dash-timeline__line" />}
                      </div>
                      <div className="dash-timeline__content">
                        <span className="dash-timeline__time">{timeAgo(call.date)}</span>
                        <p className="dash-timeline__name">{call.name}</p>
                        <div className="dash-timeline__footer">
                          <span className="dash-timeline__campaign">{call.campaign}</span>
                          {pct !== null && (
                            <span className="dash-timeline__score" style={{ color: getPctColor(pct), background: getPctBg(pct) }}>
                              {pct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </>)}

      {/* ── Sin campañas (cliente sin asignaciones) ── */}
      {stats && stats.campaigns === 0 && !isAdmin && (
        <div className="empty-state" style={{ marginTop: '1rem' }}>
          <Megaphone size={48} className="empty-state__icon" />
          <h4 className="empty-state__title">{t.labels.noCampaigns}</h4>
          <p className="empty-state__description">{t.dashboard.contactAdmin}</p>
        </div>
      )}
    </div>
  )
}