import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit, List, Plus, Save, Search, Target, Trash2, Power, PowerOff, Users } from 'lucide-react'
import Swal from 'sweetalert2'
import { CampaignForm } from '../components/CampaignForm'
import { Modal } from '../components/Modal'
import { IndicatorsForm } from '../components/IndicatorsForm'
import { CallsView } from './CallsView'
import { campaignsService } from '../services/campaigns.service'
import { useAdminContext } from '../context/AdminContext'
import { CONDICIONES_INDICADOR } from '../types/campaigns.types'
import type { Campaign, CreateCampaignDto, Indicator } from '../types/campaigns.types'
import { useLang } from '../context/LangContext'

export const CARD_GRADIENTS = [
  'linear-gradient(135deg, #2c92e6 0%, #1a6abf 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
  'linear-gradient(135deg, #059669 0%, #047857 100%)',
  'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
  'linear-gradient(135deg, #db2777 0%, #9d174d 100%)',
  'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
]

export const getCampaignColor = (idx: number): string => {
  const match = CARD_GRADIENTS[idx % CARD_GRADIENTS.length].match(/#[0-9a-fA-F]{6}/)
  return match ? match[0] : '#6b7280'
}

const getInitials = (name: string) => {
  const uppers = name.match(/[A-ZÁÉÍÓÚÑÜ]/g)
  if (!uppers || uppers.length === 0) return name.slice(0, 2).toUpperCase()
  return uppers.slice(0, 3).join('')
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

interface CampaignCardProps {
  campaign: Campaign
  gradient: string
  isAdmin: boolean
  hasPermission: (code: string) => boolean
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onToggleActive: (e: React.MouseEvent) => void
  onOpenIndicadores: () => void
  onOpenCalls: () => void
}

const CampaignCard: React.FC<CampaignCardProps & { t: any }> = ({
  campaign, gradient, isAdmin, hasPermission,
  onEdit, onDelete, onToggleActive, onOpenIndicadores, onOpenCalls, t,
}) => (
  <div className={`campaign-card${!campaign.isActive ? ' campaign-card--inactive' : ''}`}>
    {/* Banner */}
    <div className="campaign-card__banner" style={{ background: gradient }}>
      <span className="campaign-card__initials">{getInitials(campaign.name)}</span>
    </div>

    {/* Body */}
    <div className="campaign-card__body">
      <h4 className="campaign-card__name" title={campaign.name}>
        {campaign.name}
      </h4>
      <p className="campaign-card__meta">
        {campaign.indicadores.length}{' '}
        {campaign.indicadores.length === 1
          ? t.indicatorForm.titleSing
          : t.indicatorForm.title}
        {campaign.campaignUsers && campaign.campaignUsers.length > 0 && (
          <> · {campaign.campaignUsers.length} <Users size={11} style={{display:'inline', verticalAlign: 'middle', marginBottom: '1px' }} /></>
        )}
      </p>
    </div>

    {/* Actions */}
    <div className="campaign-card__actions">
      <div className="campaign-card__actions-main">
        <button
          onClick={onOpenCalls}
          className="campaign-card__action-btn campaign-card__action-btn--calls"
          {...{title: t.campaigns.viewRecordings}}
        >
          <div className="campaign-card__action-btn__icon">
            <List size={15} />
          </div>
          {t.campaigns.viewRecordings}
        </button>

        <button
          onClick={onOpenIndicadores}
          className="campaign-card__action-btn campaign-card__action-btn--indicators"
          {...{title: t.campaigns.viewIndicators}}
        >
          <div className="campaign-card__action-btn__icon">
            <Search size={15} />
          </div>
          {t.campaigns.viewIndicators}
        </button>
      </div>

      {(isAdmin || hasPermission('update_campaigns') || hasPermission('delete_campaigns')) && (
        <div className="campaign-card__actions-secondary">
          <span
            className={`campaign-card__status-badge${campaign.isActive ? ' campaign-card__status-badge--active' : ' campaign-card__status-badge--inactive'}`}
          >
            <span className="campaign-card__status-dot" />
            {campaign.isActive ? t.labels.active : t.labels.inactive}
          </span>

          <span style={{ flex: 1 }} />

          {(isAdmin || hasPermission('update_campaigns')) && (
            <button onClick={onEdit} className="campaign-card__icon-btn" {...{title: t.campaigns.editCampaign}}>
              <Edit size={14} />
            </button>
          )}
          {(isAdmin || hasPermission('update_campaigns')) && (
            <button
              onClick={onToggleActive}
              className={`campaign-card__icon-btn${campaign.isActive ? ' campaign-card__icon-btn--deactivate' : ' campaign-card__icon-btn--activate'}`}
              title={campaign.isActive ? t.campaigns.campaignDeactivated : t.campaigns.campaignActivated}
            >
              {campaign.isActive ? <PowerOff size={14} /> : <Power size={14} />}
            </button>
          )}
          {(isAdmin || hasPermission('delete_campaigns')) && (
            <button onClick={onDelete} className="campaign-card__icon-btn campaign-card__icon-btn--danger" {...{title: t.campaigns.deleteConfirmTitle}}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  </div>
)

// ─── Main View ────────────────────────────────────────────────────────────────

export const CampaignsView: React.FC = () => {
  const { hasPermission, isMobile, isAdmin } = useAdminContext()
  const [searchParams, setSearchParams] = useSearchParams()

  const { t } = useLang()
  const [campaigns, setCampaigns]               = useState<Campaign[]>([])
  const [isLoading, setIsLoading]               = useState(true)
  const [showForm, setShowForm]                 = useState(false)
  const [editingCampaign, setEditingCampaign]   = useState<Campaign | null>(null)
  const [indicadoresModal, setIndicadoresModal] = useState<Campaign | null>(null)
  const [indicadoresEdit, setIndicadoresEdit]   = useState<Omit<Indicator, 'id'>[]>([])
  const [indicadoresSearch, setIndicadoresSearch] = useState('')
  const [savingIndicadores, setSavingIndicadores] = useState(false)
  const [callsCampaign, setCallsCampaign]       = useState<Campaign | null>(null)

  // ── Consumir query params una sola vez ────────────────────────────────────
  const initialOpenId  = useRef<string | null>(searchParams.get('open'))
  const initialCallId  = useRef<string | null>(searchParams.get('call'))
  const paramsConsumed = useRef(false)

  // Limpiar la URL inmediatamente al montar (evita que los params queden pegados)
  useEffect(() => {
    if (initialOpenId.current) {
      setSearchParams({}, { replace: true })
    }
  }, [])

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await campaignsService.findAll()
      setCampaigns(data)

      // Deep-link: abrir campaña solo la primera vez
      if (initialOpenId.current && !paramsConsumed.current) {
        paramsConsumed.current = true
        const target = data.find((c: Campaign) => c.id === initialOpenId.current)
        if (target) setCallsCampaign(target)
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: t.campaigns.errorLoading, confirmButtonColor: '#dc2626' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  const handleBackFromCalls = useCallback(() => {
    setCallsCampaign(null)
    // Limpiar refs para que no se reabran
    initialOpenId.current = null
    initialCallId.current = null
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const handleSubmit = async (dto: CreateCampaignDto) => {
    try {
      if (editingCampaign) {
        await campaignsService.update(editingCampaign.id, dto)
        Swal.fire({ icon: 'success', title: t.campaigns.campaignUpdated, confirmButtonColor: '#2c92e6', timer: 2000, showConfirmButton: false })
      } else {
        await campaignsService.create(dto)
        Swal.fire({ icon: 'success', title: t.campaigns.campaignCreated, confirmButtonColor: '#2c92e6', timer: 2000, showConfirmButton: false })
      }
      setShowForm(false)
      setEditingCampaign(null)
      await loadCampaigns()
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || t.campaigns.errorSaving, confirmButtonColor: '#dc2626' })
    }
  }

  const handleDelete = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await Swal.fire({
      title: t.campaigns.deleteConfirmTitle,
      text: `Se eliminará "${campaign.name}" y todos sus indicadores.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t.actions.delete,
      cancelButtonText: t.actions.cancel,
    })
    if (!result.isConfirmed) return
    try {
      await campaignsService.remove(campaign.id)
      Swal.fire({ icon: 'success', title: t.campaigns.campaignDeleted, confirmButtonColor: '#2c92e6', timer: 2000, showConfirmButton: false })
      await loadCampaigns()
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: t.campaigns.errorDeleting, confirmButtonColor: '#dc2626' })
    }
  }

  const handleToggleActive = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation()
    const willActivate = !campaign.isActive
    const result = await Swal.fire({
      title: willActivate ? t.campaigns.campaignActivated : t.campaigns.campaignDeactivated,
      text: `${campaign.name}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: willActivate ? '#059669' : '#d97706',
      cancelButtonColor: '#6b7280',
      confirmButtonText: willActivate ? t.actions.activate : t.actions.deactivate,
      cancelButtonText: t.actions.cancel,
    })
    if (!result.isConfirmed) return
    try {
      await campaignsService.update(campaign.id, { isActive: willActivate })
      Swal.fire({
        icon: 'success',
        title: willActivate ? t.campaigns.campaignActivated : t.campaigns.campaignDeactivated,
        confirmButtonColor: '#2c92e6',
        timer: 2000,
        showConfirmButton: false,
      })
      await loadCampaigns()
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: t.campaigns.errorStatus, confirmButtonColor: '#dc2626' })
    }
  }

  const handleOpenIndicadores = (campaign: Campaign) => {
    setIndicadoresModal(campaign)
    setIndicadoresEdit(
      campaign.indicadores.map(({ INDICADOR, Puntaje_Si_Hace, Puntaje_No_Hace, descripcion, condicion }) => ({
        INDICADOR, Puntaje_Si_Hace, Puntaje_No_Hace, descripcion, condicion,
      }))
    )
    setIndicadoresSearch('')
  }

  const handleSaveIndicadores = async () => {
    if (!indicadoresModal) return
    setSavingIndicadores(true)
    try {
      await campaignsService.update(indicadoresModal.id, { indicadores: indicadoresEdit })
      Swal.fire({ icon: 'success', title: t.campaigns.saveIndicators, confirmButtonColor: '#2c92e6', timer: 2000, showConfirmButton: false })
      setIndicadoresModal(null)
      await loadCampaigns()
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: t.campaigns.errorSaving, confirmButtonColor: '#dc2626' })
    } finally {
      setSavingIndicadores(false)
    }
  }

  const filteredIndicadores = indicadoresEdit.filter(
    (ind) =>
      ind.INDICADOR.toLowerCase().includes(indicadoresSearch.toLowerCase()) ||
      (ind.descripcion || '').toLowerCase().includes(indicadoresSearch.toLowerCase())
  )

  // ── Vista grabaciones ──────────────────────────────────────────────────────
  if (callsCampaign) {
    return (
      <CallsView
        campaignId={callsCampaign.id}
        campaignName={callsCampaign.name}
        onBack={handleBackFromCalls}
        openCallId={initialCallId.current ?? undefined}
      />
    )
  }

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <h2 className="page-title">{t.campaigns.title}</h2>
        {(isAdmin || hasPermission('add_campaigns')) && (
          <button
            onClick={() => { setEditingCampaign(null); setShowForm(true) }}
            className="btn btn-primary"
          >
            <Plus size={18} />
            {!isMobile && t.campaigns.newCampaign}
          </button>
        )}
      </div>

      <CampaignForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingCampaign(null) }}
        onSubmit={handleSubmit}
        editingCampaign={editingCampaign}
      />

      <Modal
        isOpen={!!indicadoresModal}
        onClose={() => setIndicadoresModal(null)}
        title={`Indicadores — ${indicadoresModal?.name || ''}`}
        size="xl"
      >
        <div className="campaigns-indicators-modal">
          <div className="search-container">
            <Search size={16} className="search-container__icon" />
            <input
              type="text"
              {...{placeholder: t.actions.search + "..."}}
              value={indicadoresSearch}
              onChange={(e) => setIndicadoresSearch(e.target.value)}
              className="search-container__input"
            />
            <div className="search-container__line" />
          </div>

          {indicadoresSearch ? (
            <div className="campaigns-indicators-list">
              {filteredIndicadores.length === 0 ? (
                <p className="campaigns-indicators-empty">{t.actions.search}: "{indicadoresSearch}"</p>
              ) : (
                filteredIndicadores.map((ind, i) => {
                  const condLabels = (ind.condicion ? ind.condicion.split(',') : [])
                    .map(v => CONDICIONES_INDICADOR.find(c => c.value === v.trim())?.label || v.trim())
                    .join(', ')
                  return (
                    <div key={i} className="campaigns-indicator-row">
                      <div className="campaigns-indicator-row__info">
                        <p className="campaigns-indicator-row__name">{ind.INDICADOR}</p>
                        {condLabels && <span className="campaigns-indicator-row__cond">{condLabels}</span>}
                      </div>
                      <div className="campaigns-indicator-row__badges">
                        <span className="badge badge-success">✓ {ind.Puntaje_Si_Hace}</span>
                        <span className="badge badge-danger">✗ {ind.Puntaje_No_Hace}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <IndicatorsForm indicadores={indicadoresEdit} onChange={setIndicadoresEdit} />
          )}

          {!indicadoresSearch && (
            <div className="campaigns-indicators-footer">
              <button className="btn btn-primary" onClick={handleSaveIndicadores} disabled={savingIndicadores}>
                <Save size={15} />
                {savingIndicadores ? t.campaigns.savingIndicators : t.campaigns.saveIndicators}
              </button>
              <button className="btn btn-secondary" onClick={() => setIndicadoresModal(null)}>{t.actions.close}</button>
            </div>
          )}
        </div>
      </Modal>

      {isLoading ? (
        <div className="empty-state">
          <p className="empty-state__description">{t.actions.loading}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <Target size={48} className="empty-state__icon" />
          <h4 className="empty-state__title">{t.campaigns.noData}</h4>
          <p className="empty-state__description">{t.campaigns.newCampaign}</p>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((campaign, idx) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              gradient={CARD_GRADIENTS[idx % CARD_GRADIENTS.length]}
              isAdmin={isAdmin}
              hasPermission={hasPermission}
              onEdit={(e) => { e.stopPropagation(); setEditingCampaign(campaign); setShowForm(true) }}
              onDelete={(e) => handleDelete(campaign, e)}
              onToggleActive={(e) => handleToggleActive(campaign, e)}
              onOpenIndicadores={() => handleOpenIndicadores(campaign)}
              onOpenCalls={() => setCallsCampaign(campaign)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}