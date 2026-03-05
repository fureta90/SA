import React, { FormEvent, useEffect, useState } from 'react'
import { FileText, Save, Target, Users, Search, X, Check } from 'lucide-react'
import { Modal } from './Modal'
import { IndicatorsForm } from './IndicatorsForm'
import { useAdminContext } from '../context/AdminContext'
import type { Campaign, CreateCampaignDto, Indicator } from '../types/campaigns.types'
import { useLang } from '../context/LangContext'

interface CampaignFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (dto: CreateCampaignDto) => Promise<void>
  editingCampaign: Campaign | null
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  isOpen, onClose, onSubmit, editingCampaign,
}) => {
  const { t } = useLang()
  const { users, isAdmin, userIdMap } = useAdminContext()
  const [name, setName]           = useState('')
  const [prompt, setPrompt]       = useState('')
  const [imageUrl, setImageUrl]   = useState('')
  const [indicadores, setIndicadores] = useState<Omit<Indicator, 'id'>[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    if (editingCampaign) {
      setName(editingCampaign.name)
      setPrompt(editingCampaign.prompt || '')
      setImageUrl(editingCampaign.imageUrl || '')
      setIndicadores(
        editingCampaign.indicadores.map(({ INDICADOR, Puntaje_Si_Hace, Puntaje_No_Hace, descripcion, condicion }) => ({
          INDICADOR, Puntaje_Si_Hace, Puntaje_No_Hace, descripcion, condicion,
        }))
      )
      // Cargar usuarios ya asignados - convertir backend UUIDs a frontend IDs
      if (editingCampaign.campaignUsers && editingCampaign.campaignUsers.length > 0) {
        const backendToFrontendMap = new Map<string, string>()
        userIdMap.forEach((backendId, frontendId) => {
          backendToFrontendMap.set(backendId, String(frontendId))
        })
        const frontendIds = new Set(
          editingCampaign.campaignUsers
            .map(cu => backendToFrontendMap.get(cu.user.id) || '')
            .filter(Boolean)
        )
        setSelectedUserIds(frontendIds)
      } else {
        setSelectedUserIds(new Set())
      }
    } else {
      setName(''); setPrompt(''); setImageUrl(''); setIndicadores([])
      setSelectedUserIds(new Set())
    }
    setUserSearch('')
  }, [editingCampaign, isOpen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (indicadores.length === 0) return
    setIsSubmitting(true)
    try {
      // Convertir frontend IDs a backend UUIDs
      const backendUserIds = Array.from(selectedUserIds).map(frontendId => {
        const numId = Number(frontendId)
        return userIdMap.get(numId) || frontendId
      })
      await onSubmit({
        name,
        prompt,
        imageUrl,
        indicadores,
        allowedUserIds: backendUserIds,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName(''); setPrompt(''); setImageUrl(''); setIndicadores([])
    setSelectedUserIds(new Set())
    setUserSearch('')
    onClose()
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    )
  })

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editingCampaign ? t.campaigns.editCampaign : t.campaigns.newCampaign} size="xl">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Nombre */}
        <div className="form-group">
          <label className="form-group__label">{t.labels.name} *</label>
          <Target size={18} className="form-group__icon" />
          <input type="text" placeholder={t.labels.name} value={name}
            onChange={(e) => setName(e.target.value)} className="form-group__input" required />
          <div className="form-group__line" />
        </div>

        {/* Prompt */}
        <div>
          <label className="form-group__label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <FileText size={14} /> {t.campaigns.promptEvaluation}
          </label>
          <textarea placeholder={t.campaigns.instructionPrompt} value={prompt}
            onChange={(e) => setPrompt(e.target.value)} rows={3}
            style={{
              width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'inherit',
              border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none',
              resize: 'vertical', transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
          />
        </div>

        {/* Usuarios permitidos */}
        {(isAdmin || users.length > 0) && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label className="form-group__label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
              <Users size={14} /> {t.campaigns.allowedUsers || 'Usuarios permitidos'}
              {selectedUserIds.size > 0 && (
                <span style={{
                  fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px',
                  background: 'rgba(44,146,230,0.15)', color: 'var(--color-primary)',
                  border: '1px solid rgba(44,146,230,0.3)', fontWeight: 600, marginLeft: '0.25rem',
                }}>
                  {selectedUserIds.size}
                </span>
              )}
            </label>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
              {t.campaigns.allowedUsersHint || 'Solo los usuarios seleccionados podrán ver esta campaña, sus análisis y reportes.'}
            </p>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={t.actions.search + '...'}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.6rem 0.5rem 2rem', fontSize: '0.8rem',
                  border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {userSearch && (
                <button type="button" onClick={() => setUserSearch('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.15rem' }}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* User list */}
            <div style={{
              maxHeight: '180px', overflow: 'auto', borderRadius: '8px',
              border: '1px solid var(--border-color)', background: 'var(--bg-app)',
            }}>
              {filteredUsers.length === 0 ? (
                <p style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                  {t.actions.search}...
                </p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.has(String(user.id))
                  const displayName = `${user.name || ''} ${user.lastName || ''}`.trim() || user.email
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUser(String(user.id))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 0.75rem', cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(44,146,230,0.08)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(128,128,128,0.06)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(44,146,230,0.08)' : 'transparent' }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                        border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isSelected && <Check size={11} style={{ color: '#fff' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.email} {user.username ? `· @${user.username}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Selected pills */}
            {selectedUserIds.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                {Array.from(selectedUserIds).map(uid => {
                  const u = users.find(u => String(u.id) === uid)
                  const label = u ? (`${u.name || ''} ${u.lastName || ''}`.trim() || u.email) : uid
                  return (
                    <span key={uid} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem',
                      fontWeight: 600, background: 'rgba(44,146,230,0.12)', color: 'var(--color-primary)',
                      border: '1px solid rgba(44,146,230,0.3)',
                    }}>
                      {label}
                      <X size={10} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleUser(uid) }} />
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Indicadores */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <IndicatorsForm indicadores={indicadores} onChange={setIndicadores} />
        </div>

        {indicadores.length === 0 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', margin: 0 }}>
            {t.campaigns.saveIndicators}.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button type="submit" className="btn btn-primary"
            disabled={isSubmitting || !name.trim() || indicadores.length === 0}>
            <Save size={16} />
            {isSubmitting ? t.actions.saving : editingCampaign ? t.actions.update : t.campaigns.newCampaign}
          </button>
          <button type="button" onClick={handleClose} className="btn btn-secondary">{t.actions.cancel}</button>
        </div>
      </form>
    </Modal>
  )
}
