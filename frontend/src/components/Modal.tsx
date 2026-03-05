import React from 'react'
import { X } from 'lucide-react'
import { useLang } from '../context/LangContext'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: ModalSize
  showFooter?: boolean
  footerContent?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, children, size = 'md', showFooter = false, footerContent,
}) => {
  const { t } = useLang()
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal modal--${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label={t.actions.close}>
            <X size={22} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {showFooter && footerContent && (
          <div className="modal__footer">{footerContent}</div>
        )}
      </div>
    </div>
  )
}