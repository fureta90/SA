import React, { useEffect, useState } from 'react'
import {
  Mic, BarChart2,
  AlertTriangle, CheckCircle, Clock, Megaphone,
  RefreshCw, Target, Power, PowerOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'
import { callsService } from '../services/calls.service'
import { campaignsService } from '../services/campaigns.service'
import { getCampaignColor } from './CampaignsView'
import Swal from 'sweetalert2'
import { useLang } from '../context/LangContext'

interface CampaignStat {
  campaignId:   string
  campaignName: string
  isActive:     boolean
  total:        number
  analyzed:     number
  errors:       number
  avgScore:     number | null
}

interface DashboardStats {
  campaigns:     number
  total:         number
  pending:       number
  uploading:     number
  uploaded:      number
  analyzing:     number
  analyzed:      number
  errors:        number
  recentCalls:   { id: string; name: string; score: number; campaign: string; campaignId: string; date: string }[]
  campaignStats: CampaignStat[]
}

export const Dashboard: React.FC = () => {
  const { currentUser, profiles, permissions, getUserEffectivePermissions, isAdmin, hasPermission } =
    useAdminContext()
  const navigate = useNavigate()
  const { t } = useLang()
  const [stats, setStats]               = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [togglingId, setTogglingId]     = useState<string | null>(null)

  // Determinar si el usuario tiene acceso a campañas (para mostrar la sección de Speech)
  const canViewCampaigns = isAdmin ||
    hasPermission('view_campaigns') ||
    hasPermission('add_campaigns') ||
    hasPermission('update_campaigns') ||
    hasPermission('delete_campaigns') ||
    hasPermission('view_analytics')

  const loadStats = () => {
    setLoadingStats(true)
    callsService.getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false))
  }

  useEffect(() => { loadStats() }, [])

  if (!currentUser) return <p>{t.actions.loading}</p>

  const userProfiles         = profiles.filter(p => currentUser.profileIds.includes(p.id))
  const effectivePermissions = getUserEffectivePermissions(currentUser)
  const userPermissions      = isAdmin
    ? permissions
    : permissions.filter(p => effectivePermissions.includes(p.id))

  const getInitials = (name: string, lastName: string) =>
    `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60)    return t.actions.loading
    if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const handleToggleActive = async (cs: CampaignStat, e: React.MouseEvent) => {
    e.stopPropagation()
    const willActivate = !cs.isActive
    const result = await Swal.fire({
      title: willActivate ? t.campaigns.campaignActivated : t.campaigns.campaignDeactivated,
      text: willActivate
        ? `Las grabaciones de "${cs.campaignName}" volverán a procesarse.`
        : `Las grabaciones de "${cs.campaignName}" dejarán de procesarse hasta que la reactives.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: willActivate ? '#059669' : '#d97706',
      cancelButtonColor: '#6b7280',
      confirmButtonText: willActivate ? t.actions.activate : t.actions.deactivate,
      cancelButtonText: t.actions.cancel,
    })
    if (!result.isConfirmed) return
    setTogglingId(cs.campaignId)
    try {
      await campaignsService.update(cs.campaignId, { isActive: willActivate })
      // Optimistic update local sin refetch completo
      setStats(prev => prev ? {
        ...prev,
        campaignStats: prev.campaignStats.map(c =>
          c.campaignId === cs.campaignId ? { ...c, isActive: willActivate } : c
        ),
      } : prev)
    } catch {
      Swal.fire({ icon: 'error', title: t.errors.generic, text: t.campaigns.errorStatus, confirmButtonColor: '#dc2626' })
    } finally {
      setTogglingId(null)
    }
  }

  // Determinar si puede modificar campañas (para mostrar botones toggle)
  const canModifyCampaigns = isAdmin || hasPermission('update_campaigns')

  // ── Dashboard unificado ────────────────────────────────────────────────────
  const inProgress = (stats?.pending ?? 0) + (stats?.uploading ?? 0) +
                     (stats?.uploaded ?? 0) + (stats?.analyzing ?? 0)

  return (
    <div className="dashboard-admin">
      <div className="dashboard-admin__header">
        <h2 className="dashboard-admin__title">{t.dashboard.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {loadingStats && <RefreshCw size={16} className="spin" style={{ color: 'var(--text-muted)' }} />}
          <button
            onClick={loadStats}
            className="calls-header__back"
            title={t.actions.search}
            disabled={loadingStats}
            style={{ opacity: loadingStats ? 0.4 : 1 }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Perfil del usuario (visible para todos) ── */}
      {!isAdmin && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentUser.photoUrl ? (
              <img src={currentUser.photoUrl} alt="Foto"
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
            ) : (
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 700,
              }}>
                {getInitials(currentUser.name, currentUser.lastName)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser.name} {currentUser.lastName}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentUser.company}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {userProfiles.map(p => (
                <span key={p.id} className="dashboard-user__profile-badge">{p.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Speech Analytics Stats ── */}
      {stats && (
        <>
          <h3 className="dashboard-section__title">{t.speech.title}</h3>

          {/* Métricas globales */}
          <div className="dashboard-grid dashboard-grid--5">
            <div
              className="stat-card stat-card--cyan stat-card--clickable"
              onClick={() => canViewCampaigns ? navigate('/campaigns') : null}
              title={t.sidebar.campaigns}
              style={{ cursor: canViewCampaigns ? 'pointer' : 'default' }}
            >
              <div className="dashboard-admin__stat-card">
                <div>
                  <p className="dashboard-admin__stat-label">{t.sidebar.campaigns}</p>
                  <p className="dashboard-admin__stat-value">{stats.campaigns}</p>
                </div>
                <Megaphone className="dashboard-admin__stat-icon" size={36} style={{ color: '#0891b2' }} />
              </div>
            </div>

            <div className="stat-card stat-card--blue">
              <div className="dashboard-admin__stat-card">
                <div>
                  <p className="dashboard-admin__stat-label">{t.labels.recordings}</p>
                  <p className="dashboard-admin__stat-value">{stats.total}</p>
                </div>
                <Mic className="dashboard-admin__stat-icon" size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>

            <div className="stat-card stat-card--green">
              <div className="dashboard-admin__stat-card">
                <div>
                  <p className="dashboard-admin__stat-label">{t.labels.analyzed}</p>
                  <p className="dashboard-admin__stat-value">{stats.analyzed}</p>
                </div>
                <CheckCircle className="dashboard-admin__stat-icon" size={36} style={{ color: '#059669' }} />
              </div>
            </div>

            <div className="stat-card stat-card--orange">
              <div className="dashboard-admin__stat-card">
                <div>
                  <p className="dashboard-admin__stat-label">{t.labels.inProgress}</p>
                  <p className="dashboard-admin__stat-value">{inProgress}</p>
                </div>
                <Clock className="dashboard-admin__stat-icon" size={36} style={{ color: '#d97706' }} />
              </div>
            </div>

            <div className={`stat-card ${stats.errors > 0 ? 'stat-card--red' : 'stat-card--gray'}`}>
              <div className="dashboard-admin__stat-card">
                <div>
                  <p className="dashboard-admin__stat-label">{t.labels.errors}</p>
                  <p className="dashboard-admin__stat-value">{stats.errors}</p>
                </div>
                <AlertTriangle className="dashboard-admin__stat-icon" size={36}
                  style={{ color: stats.errors > 0 ? '#dc2626' : 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Por campaña + últimas analizadas */}
          <div className="dashboard-bottom-2col">

            {/* Stats por campaña */}
            <div>
              <h4 className="dashboard-sub__title">
                <Target size={14} /> {t.sidebar.campaigns}
              </h4>
              <div className="dashboard-campaign-list">
                {stats.campaignStats.length === 0 ? (
                  <p className="dashboard-empty-msg">{t.labels.noCampaigns}</p>
                ) : (
                  stats.campaignStats.map((cs, idx) => (
                    <div
                      key={cs.campaignId}
                      className={`dashboard-campaign-row${!cs.isActive ? ' dashboard-campaign-row--inactive' : ''}`}
                      onClick={() => canViewCampaigns ? navigate(`/campaigns?open=${cs.campaignId}`) : null}
                      style={{ cursor: canViewCampaigns ? 'pointer' : 'default' }}
                    >
                      {/* Nombre + dot de color */}
                      <div className="dashboard-campaign-row__name">
                        <span
                          className="dashboard-campaign-row__dot"
                          style={{ backgroundColor: getCampaignColor(idx) }}
                        />
                        <span>{cs.campaignName}</span>
                      </div>

                      {/* Stats + badge estado + botón toggle */}
                      <div className="dashboard-campaign-row__right">
                        <div className="dashboard-campaign-row__stats">
                          <span className="dcs dcs--total" title="Total grabaciones">
                            <Mic size={10} /> {cs.total}
                          </span>
                          <span className="dcs dcs--analyzed" title="Analizadas">
                            <CheckCircle size={10} /> {cs.analyzed}
                          </span>
                          <span className={`dcs ${cs.errors > 0 ? 'dcs--error' : 'dcs--ok'}`} title="Errores">
                            <AlertTriangle size={10} /> {cs.errors}
                          </span>
                          <span className="dcs dcs--score" title="Puntaje promedio">
                            {cs.avgScore !== null ? `${cs.avgScore}` : '—'}
                          </span>
                        </div>

                        {/* Badge activa/inactiva */}
                        <span className={`dcr-status-badge${cs.isActive ? ' dcr-status-badge--active' : ' dcr-status-badge--inactive'}`}>
                          <span className="dcr-status-dot" />
                          {cs.isActive ? t.labels.active : t.labels.inactive}
                        </span>

                        {/* Botón toggle — solo si puede modificar campañas */}
                        {canModifyCampaigns && (
                          <button
                            className={`dcr-toggle-btn${cs.isActive ? ' dcr-toggle-btn--deactivate' : ' dcr-toggle-btn--activate'}`}
                            title={cs.isActive ? t.actions.deactivate : t.actions.activate}
                            disabled={togglingId === cs.campaignId}
                            onClick={(e) => handleToggleActive(cs, e)}
                          >
                            {cs.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Últimas 5 analizadas — timeline */}
            <div>
              <h4 className="dashboard-sub__title">
                <BarChart2 size={14} /> {t.labels.analyzed}
              </h4>
              {stats.recentCalls.length === 0 ? (
                <p className="dashboard-empty-msg">{t.labels.noRecordings}</p>
              ) : (
                <div className="dash-timeline">
                  {stats.recentCalls.slice(0, 5).map((call, idx) => (
                    <div
                      key={call.id}
                      className="dash-timeline__item"
                      onClick={() => canViewCampaigns ? navigate(`/campaigns?open=${call.campaignId}&call=${call.id}`) : null}
                      title="Ver grabación"
                      style={{ cursor: canViewCampaigns ? 'pointer' : 'default' }}
                    >
                      <div className="dash-timeline__track">
                        <div className="dash-timeline__dot" />
                        {idx < Math.min(stats.recentCalls.length, 5) - 1 && (
                          <div className="dash-timeline__line" />
                        )}
                      </div>
                      <div className="dash-timeline__content">
                        <span className="dash-timeline__time">{timeAgo(call.date)}</span>
                        <p className="dash-timeline__name">{call.name}</p>
                        <div className="dash-timeline__footer">
                          <span className="dash-timeline__campaign">{call.campaign}</span>
                          {call.score != null && (
                            <span className="dash-timeline__score">{call.score.toFixed(1)} pts</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* ── Sin campañas asignadas ── */}
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
