import React, { FormEvent, useEffect, useState } from 'react'
import { Check, Clock, FileText, Save, Search, Target, Users, X } from 'lucide-react'
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

// ── Modal de selección de usuarios ───────────────────────────────────────────

interface UserSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  users: any[]
  selectedIds: Set<string>
  onChange: (ids: Set<string>) => void
}

const UserSelectorModal: React.FC<UserSelectorModalProps> = ({
  isOpen, onClose, users, selectedIds, onChange,
}) => {
  const [search, setSearch]             = useState('')
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  const { t } = useLang()

  useEffect(() => {
    if (isOpen) { setLocalSelected(new Set(selectedIds)); setSearch('') }
  }, [isOpen])

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (u.name     || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.email    || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    )
  })

  const toggle = (uid: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(u => localSelected.has(String(u.id)))
  const toggleAll = () => {
    const next = new Set(localSelected)
    if (allFilteredSelected) filtered.forEach(u => next.delete(String(u.id)))
    else filtered.forEach(u => next.add(String(u.id)))
    setLocalSelected(next)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.campaigns.selectAllowed} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        {/* Buscador */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" autoFocus placeholder={t.campaigns.searchUsers}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.1rem', fontSize: '0.85rem',
              border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none',
              boxSizing: 'border-box', transition: 'border-color .2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
          />
        </div>

        {/* Contador + toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>
            {localSelected.size > 0
              ? <><strong style={{ color: 'var(--color-primary)' }}>{localSelected.size}</strong> seleccionado{localSelected.size !== 1 ? 's' : ''}</>
              : t.campaigns.noneSelected}
          </span>
          {filtered.length > 0 && (
            <button type="button" onClick={toggleAll}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.78rem', padding: 0 }}>
              {allFilteredSelected ? t.campaigns.deselectVisible : t.campaigns.selectVisible}
            </button>
          )}
        </div>

        {/* Lista scrolleable */}
        <div style={{
          maxHeight: '340px', overflowY: 'auto',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
        }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Sin resultados para "{search}"
            </p>
          ) : filtered.map(user => {
            const uid        = String(user.id)
            const isSelected = localSelected.has(uid)
            const name       = `${user.name || ''} ${user.lastName || ''}`.trim() || user.email
            return (
              <div key={uid} onClick={() => toggle(uid)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.6rem 0.875rem', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(44,146,230,0.08)' : 'transparent',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(44,146,230,0.08)' : 'transparent' }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
                  background: isSelected ? 'var(--color-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
                }}>
                  {isSelected && <Check size={11} color="#fff" />}
                </div>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(44,146,230,.18)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}{user.username ? ` · @${user.username}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer del modal */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">{t.actions.cancel}</button>
          <button type="button" onClick={() => { onChange(localSelected); onClose() }} className="btn btn-primary">
            <Check size={14} />
            {t.actions.confirm}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── CampaignForm principal ────────────────────────────────────────────────────

export const CampaignForm: React.FC<CampaignFormProps> = ({
  isOpen, onClose, onSubmit, editingCampaign,
}) => {
  const { t } = useLang()
  const { users, isAdmin, userIdMap } = useAdminContext()
  const [name, setName]               = useState('')
  const [prompt, setPrompt]           = useState('')
  const [imageUrl, setImageUrl]       = useState('')
  const [indicadores, setIndicadores] = useState<Omit<Indicator, 'id'>[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [userSelectorOpen, setUserSelectorOpen] = useState(false)
  const [minutesLimitEnabled, setMinutesLimitEnabled] = useState(false)
  const [minutesLimit, setMinutesLimit]               = useState<string>('')

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
      if (editingCampaign.campaignUsers?.length) {
        const back2front = new Map<string, string>()
        userIdMap.forEach((bid, fid) => back2front.set(bid, String(fid)))
        setSelectedUserIds(new Set(
          editingCampaign.campaignUsers.map(cu => back2front.get(cu.user.id) || '').filter(Boolean)
        ))
      } else {
        setSelectedUserIds(new Set())
      }
      setMinutesLimitEnabled(editingCampaign.minutesLimitEnabled ?? false)
      setMinutesLimit(editingCampaign.minutesLimit != null ? String(editingCampaign.minutesLimit) : '')
    } else {
      setName(''); setPrompt(''); setImageUrl(''); setIndicadores([])
      setSelectedUserIds(new Set()); setMinutesLimitEnabled(false); setMinutesLimit('')
    }
  }, [editingCampaign, isOpen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (indicadores.length === 0) return
    setIsSubmitting(true)
    try {
      const backendUserIds = Array.from(selectedUserIds).map(fid => userIdMap.get(Number(fid)) || fid)
      await onSubmit({
        name, prompt, imageUrl, indicadores,
        allowedUserIds:      backendUserIds,
        minutesLimitEnabled,
        minutesLimit: minutesLimitEnabled && minutesLimit !== '' ? parseInt(minutesLimit, 10) : null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName(''); setPrompt(''); setImageUrl(''); setIndicadores([])
    setSelectedUserIds(new Set()); setMinutesLimitEnabled(false); setMinutesLimit('')
    onClose()
  }

  // Progreso
  const consumed  = editingCampaign?.minutesConsumed ?? 0
  const limitNum  = minutesLimit !== '' ? parseInt(minutesLimit, 10) : null
  const pct       = limitNum && limitNum > 0 ? Math.min(100, Math.round((consumed / limitNum) * 100)) : 0
  const remaining = limitNum != null ? Math.max(0, limitNum - consumed) : null
  const barColor  = pct >= 90 ? 'var(--color-danger)' : pct >= 60 ? 'var(--color-warning,#f59e0b)' : 'var(--color-primary)'

  // Pills de usuarios seleccionados
  const selectedLabels = Array.from(selectedUserIds).map(uid => {
    const u = users.find(u => String(u.id) === uid)
    return { uid, label: u ? (`${u.name || ''} ${u.lastName || ''}`.trim() || u.email) : uid }
  })

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={editingCampaign ? t.campaigns.editCampaign : t.campaigns.newCampaign} size="xl">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Nombre */}
          <div className="form-group">
            <label className="form-group__label">{t.labels.name} *</label>
            <Target size={18} className="form-group__icon" />
            <input type="text" placeholder={t.labels.name} value={name}
              onChange={e => setName(e.target.value)} className="form-group__input" required />
            <div className="form-group__line" />
          </div>

          {/* Prompt */}
          <div>
            <label className="form-group__label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText size={14} /> {t.campaigns.promptEvaluation}
            </label>
            <textarea placeholder={t.campaigns.instructionPrompt} value={prompt}
              onChange={e => setPrompt(e.target.value)} rows={3}
              style={{
                width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'inherit',
                border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none',
                resize: 'vertical', transition: 'border-color 0.2s', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
            />
          </div>

          {/* Límite de minutos */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: minutesLimitEnabled ? '1rem' : 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                <Clock size={14} />
                {t.campaigns.minutesLimit || 'Límite de minutos transcriptos'}
              </label>
              <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                <input type="checkbox" checked={minutesLimitEnabled}
                  onChange={e => { setMinutesLimitEnabled(e.target.checked); if (!e.target.checked) setMinutesLimit('') }}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', inset: 0, background: minutesLimitEnabled ? 'var(--color-primary)' : 'var(--border-color)', borderRadius: '10px', transition: 'background 0.2s' }} />
                <span style={{ position: 'absolute', top: '3px', left: minutesLimitEnabled ? '19px' : '3px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </label>
            </div>

            {minutesLimitEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  {t.campaigns.minutesLimitHint || 'Al alcanzar este límite, la campaña se inactivará automáticamente.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: editingCampaign ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-group__label">{t.campaigns.minutesLimitMax || 'Máximo de minutos'} *</label>
                    <input type="number" min={1} step={1} placeholder="Ej: 500"
                      value={minutesLimit} onChange={e => setMinutesLimit(e.target.value)}
                      className="form-group__input" required={minutesLimitEnabled} style={{ paddingRight: '3.5rem' }} />
                    <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>min</span>
                    <div className="form-group__line" />
                  </div>

                  {/* Minutos consumidos — display propio, nunca blanco */}
                  {editingCampaign && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {t.campaigns.minutesConsumed || 'Minutos consumidos'}
                      </label>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.55rem 0.875rem',
                        border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                        background: 'rgba(128,128,128,0.05)',
                      }}>
                        <Clock size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {consumed.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>min</span>
                      </div>
                    </div>
                  )}
                </div>

                {editingCampaign && limitNum != null && limitNum > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      <span>{consumed.toFixed(1)} / {limitNum} min usados ({pct}%)</span>
                      {remaining != null && <span>{remaining.toFixed(1)} min restantes</span>}
                    </div>
                    <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    {pct >= 80 && (
                      <p style={{ fontSize: '0.75rem', color: pct >= 100 ? 'var(--color-danger)' : 'var(--color-warning,#f59e0b)', marginTop: '0.4rem', marginBottom: 0 }}>
                        {pct >= 100 ? (t.campaigns.minutesLimitReached || '⚠ Límite alcanzado — la campaña está inactiva.') : `⚠ La campaña se inactivará al llegar a ${limitNum} min.`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Usuarios permitidos */}
          {(isAdmin || users.length > 0) && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <Users size={14} />
                  {t.campaigns.allowedUsers || 'Usuarios permitidos'}
                  {selectedUserIds.size > 0 && (
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(44,146,230,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(44,146,230,0.3)', fontWeight: 600, marginLeft: '0.25rem' }}>
                      {selectedUserIds.size}
                    </span>
                  )}
                </label>
                <button type="button" onClick={() => setUserSelectorOpen(true)}
                  className="btn btn-secondary btn-sm">
                  <Users size={13} />
                  {selectedUserIds.size > 0 ? t.campaigns.modify : t.campaigns.selectUsers}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
                {t.campaigns.allowedUsersHint}
              </p>
              {selectedLabels.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {selectedLabels.map(({ uid, label }) => (
                    <span key={uid} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(44,146,230,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(44,146,230,0.3)' }}>
                      {label}
                      <X size={10} style={{ cursor: 'pointer' }} onClick={() => { const n = new Set(selectedUserIds); n.delete(uid); setSelectedUserIds(n) }} />
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  {t.campaigns.noUsersSelected}
                </p>
              )}
            </div>
          )}

          {/* Indicadores */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <IndicatorsForm indicadores={indicadores} onChange={setIndicadores} />
          </div>
          {indicadores.length === 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', margin: 0 }}>{t.campaigns.saveIndicators}.</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim() || indicadores.length === 0}>
              <Save size={16} />
              {isSubmitting ? t.actions.saving : editingCampaign ? t.actions.update : t.campaigns.newCampaign}
            </button>
            <button type="button" onClick={handleClose} className="btn btn-secondary">{t.actions.cancel}</button>
          </div>
        </form>
      </Modal>

      <UserSelectorModal
        isOpen={userSelectorOpen}
        onClose={() => setUserSelectorOpen(false)}
        users={users}
        selectedIds={selectedUserIds}
        onChange={ids => setSelectedUserIds(ids)}
      />
    </>
  )
}