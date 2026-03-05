import React, { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { CondicionIndicador, Indicator } from '../types/campaigns.types'
import { CONDICIONES_INDICADOR } from '../types/campaigns.types'
import { useLang } from '../context/LangContext'

interface IndicatorsFormProps {
  indicadores: Omit<Indicator, 'id'>[]
  onChange: (indicadores: Omit<Indicator, 'id'>[]) => void
}

type DraftIndicator = Omit<Indicator, 'id'> & { condicionList: string[] }

const EMPTY_DRAFT: DraftIndicator = {
  INDICADOR: '',
  Puntaje_Si_Hace: 1,
  Puntaje_No_Hace: -1,
  descripcion: '',
  condicion: 'SIEMPRE',
  condicionList: ['SIEMPRE'],
}

// ─── Multicheck Dropdown ─────────────────────────────────────────────────────

const CondicionDropdown: React.FC<{
  selected: string[]
  onChange: (vals: string[]) => void
}> = ({ selected, onChange }) => {
  const { t } = useLang()
  const [open, setOpen] = useState(false)

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val))
    } else {
      onChange([...selected, val])
    }
  }

  const label =
    selected.length === 0
      ? t.indicatorForm.selectCondition
      : selected
          .map((v) => CONDICIONES_INDICADOR.find((c) => c.value === v)?.label || v)
          .join(', ')

  return (
    <div style={{ position: 'relative' }}>
      <label className="form-group__label">{t.indicatorForm.condition}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0',
          background: 'transparent',
          border: 'none',
          borderBottom: '1.5px solid var(--border-color)',
          color: selected.length ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {label}
        </span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: '0.2s',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            {CONDICIONES_INDICADOR.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  background: selected.includes(opt.value)
                    ? 'rgba(44,146,230,0.08)'
                    : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Mini Card ───────────────────────────────────────────────────────────────

const IndicatorMiniCard: React.FC<{
  ind: Omit<Indicator, 'id'>
  index: number
  isEditing: boolean
  onRemove: (i: number) => void
  onClick: (i: number) => void
}> = ({ ind, index, isEditing, onRemove, onClick }) => {
  const { t } = useLang()
  const condiciones = ind.condicion ? ind.condicion.split(',') : []
  const condLabels = condiciones
    .map((v) => CONDICIONES_INDICADOR.find((c) => c.value === v.trim())?.label || v.trim())
    .join(', ')

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        borderRadius: 'var(--radius-md, 8px)',
        padding: '0.625rem 0.75rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        minWidth: 0,
        border: isEditing
          ? '1.5px solid var(--color-primary, #2c92e6)'
          : '1px solid rgba(128,128,128,0.25)',
        background: isEditing
          ? 'rgba(44,146,230,0.06)'
          : 'var(--bg-card, #ffffff)',
        boxShadow: isEditing
          ? '0 0 0 3px rgba(44,146,230,0.12)'
          : '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(128,128,128,0.08)',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isEditing) {
          e.currentTarget.style.borderColor = 'var(--color-primary, #2c92e6)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(44,146,230,0.15), 0 0 0 2px rgba(44,146,230,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isEditing) {
          e.currentTarget.style.borderColor = 'rgba(128,128,128,0.25)'
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(128,128,128,0.08)'
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.375rem',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            flex: 1,
            lineHeight: 1.35,
          }}
        >
          {ind.INDICADOR || `${t.indicatorForm.title} #${index + 1}`}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(index)
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-danger, #dc2626)',
            cursor: 'pointer',
            padding: '0.125rem',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.6875rem',
            padding: '0.1rem 0.375rem',
            borderRadius: 'var(--radius-full, 999px)',
            background: 'rgba(34,197,94,0.12)',
            color: 'var(--color-success, #16a34a)',
            fontWeight: 600,
          }}
        >
          ✓ {ind.Puntaje_Si_Hace}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            padding: '0.1rem 0.375rem',
            borderRadius: 'var(--radius-full, 999px)',
            background: 'rgba(220,38,38,0.12)',
            color: 'var(--color-danger, #dc2626)',
            fontWeight: 600,
          }}
        >
          ✗ {ind.Puntaje_No_Hace}
        </span>
      </div>

      {condLabels && (
        <span
          style={{
            fontSize: '0.6rem',
            color: 'var(--color-primary, #2c92e6)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {condLabels}
        </span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const IndicatorsForm: React.FC<IndicatorsFormProps> = ({ indicadores, onChange }) => {
  const { t } = useLang()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftIndicator>({ ...EMPTY_DRAFT })

  const isNew = editingIndex !== null && editingIndex >= indicadores.length

  const handleAdd = () => {
    setDraft({ ...EMPTY_DRAFT })
    setEditingIndex(indicadores.length)
  }

  const handleEdit = (index: number) => {
    const ind = indicadores[index]
    setDraft({
      ...ind,
      condicionList: ind.condicion ? ind.condicion.split(',').map((v) => v.trim()) : [],
    })
    setEditingIndex(index)
  }

  const handleRemove = (index: number) => {
    onChange(indicadores.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const handleSaveDraft = () => {
    if (!draft.INDICADOR.trim() || editingIndex === null) return

    const toSave: Omit<Indicator, 'id'> = {
      INDICADOR: draft.INDICADOR,
      Puntaje_Si_Hace: draft.Puntaje_Si_Hace,
      Puntaje_No_Hace: draft.Puntaje_No_Hace,
      descripcion: draft.descripcion,
      condicion: draft.condicionList.join(',') as CondicionIndicador | '',
    }

    if (isNew) {
      onChange([...indicadores, toSave])
    } else {
      onChange(indicadores.map((ind, i) => (i === editingIndex ? toSave : ind)))
    }

    setEditingIndex(null)
    setDraft({ ...EMPTY_DRAFT })
  }

  const handleCancelDraft = () => {
    setEditingIndex(null)
    setDraft({ ...EMPTY_DRAFT })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label className="form-group__label" style={{ marginBottom: 0 }}>
          {t.indicatorForm.title} ({indicadores.length})
        </label>
        {editingIndex === null && (
          <button type="button" onClick={handleAdd} className="btn btn-secondary btn-sm">
            <Plus size={14} /> {t.actions.add}
          </button>
        )}
      </div>

      {/* Formulario de edición / nuevo */}
      {editingIndex !== null && (
        <div
          style={{
            border: '1.5px solid var(--color-primary, #2c92e6)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1rem',
            background: 'var(--bg-card, #ffffff)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-primary, #2c92e6)',
            }}
          >
            {isNew ? t.indicatorForm.newIndicator : `${t.indicatorForm.editingIndicator} #${editingIndex + 1}`}
          </p>

          {/* Nombre */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-group__label">{t.indicatorForm.indicatorName} *</label>
            <input
              type="text"
              placeholder={t.indicatorForm.namePlaceholder}
              value={draft.INDICADOR}
              onChange={(e) => setDraft({ ...draft, INDICADOR: e.target.value })}
              className="form-group__input"
              style={{ paddingLeft: 0 }}
              autoFocus
            />
            <div className="form-group__line" />
          </div>

          {/* Puntajes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-group__label">{t.indicatorForm.scoreIfMeets}</label>
              <input
                type="number"
                value={draft.Puntaje_Si_Hace}
                onChange={(e) =>
                  setDraft({ ...draft, Puntaje_Si_Hace: Number(e.target.value) })
                }
                className="form-group__input"
                style={{ paddingLeft: 0 }}
              />
              <div className="form-group__line" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-group__label">{t.indicatorForm.scoreIfNotMeets}</label>
              <input
                type="number"
                value={draft.Puntaje_No_Hace}
                onChange={(e) =>
                  setDraft({ ...draft, Puntaje_No_Hace: Number(e.target.value) })
                }
                className="form-group__input"
                style={{ paddingLeft: 0 }}
              />
              <div className="form-group__line" />
            </div>
          </div>

          {/* Condición multicheck */}
          <CondicionDropdown
            selected={draft.condicionList}
            onChange={(vals) => setDraft({ ...draft, condicionList: vals })}
          />

          {/* Descripción */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-group__label">{t.indicatorForm.description} ({t.speech.optional})</label>
            <input
              type="text"
              placeholder={t.indicatorForm.descriptionPlaceholder}
              value={draft.descripcion}
              onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
              className="form-group__input"
              style={{ paddingLeft: 0 }}
            />
            <div className="form-group__line" />
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!draft.INDICADOR.trim()}
              className="btn btn-primary btn-sm"
            >
              {isNew ? t.actions.add : t.actions.saveChanges}
            </button>
            <button type="button" onClick={handleCancelDraft} className="btn btn-secondary btn-sm">
              {t.actions.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {indicadores.length === 0 && editingIndex === null && (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            padding: '1rem 0',
            margin: 0,
          }}
        >
          {t.indicatorForm.noIndicators} {t.indicatorForm.noIndicatorsHint}
        </p>
      )}

      {/* Grid mini cards 2 columnas */}
      {indicadores.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '0.25rem',
          }}
        >
          {indicadores.map((ind, i) => (
            <IndicatorMiniCard
              key={i}
              ind={ind}
              index={i}
              isEditing={editingIndex === i}
              onRemove={handleRemove}
              onClick={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}