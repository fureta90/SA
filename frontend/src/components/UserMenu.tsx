import React, { useState, useRef, useEffect } from 'react'
import { LogOut, Key, ChevronDown, X, Lock, Mail, Building2, Globe } from 'lucide-react'
import { Modal } from './Modal'
import Swal from 'sweetalert2'
import type { User as UserType, Profile } from '../types'
import { useLang } from '../context/LangContext'
import { type Locale } from '../i18n/translations'

const localeFlagLabels: Record<Locale, { flag: string; name: string }> = {
  es: { flag: 'https://flagcdn.com/w40/ar.png', name: 'Español' },
  en: { flag: 'https://flagcdn.com/w40/us.png', name: 'English' },
  pt: { flag: 'https://flagcdn.com/w40/br.png', name: 'Português' },
  it: { flag: 'https://flagcdn.com/w40/it.png', name: 'Italiano' },
}

interface UserMenuProps {
  currentUser: UserType
  profiles: Profile[]
  onUpdateUser: (id: number, userData: Partial<UserType>) => void
  onLogout: () => void
}

export const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  profiles,
  onUpdateUser,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const menuRef = useRef<HTMLDivElement>(null)
  const { locale, setLocale, t } = useLang()

  const userProfilesFromCatalog = profiles.filter((p) =>
    currentUser.profileIds.includes(p.id)
  )
  const userProfiles =
    userProfilesFromCatalog.length > 0
      ? userProfilesFromCatalog
      : (currentUser.roles || []).map((r) => ({
          id: r.id,
          name: r.name,
          permissions: [],
        }))

  const getInitials = (name: string, lastName: string) => {
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const fullName = `${currentUser.name} ${currentUser.lastName}`.trim()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.password || passwordForm.password.length < 6) {
      Swal.fire({
        icon: 'error',
        title: t.errors.generic,
        text: t.userMenu.passwordMinLength,
        confirmButtonColor: '#dc2626',
      })
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: t.errors.generic,
        text: t.userMenu.passwordMismatch,
        confirmButtonColor: '#dc2626',
      })
      return
    }

    try {
      await onUpdateUser(currentUser.id, { password: passwordForm.password })
      setShowPasswordModal(false)
      setPasswordForm({ password: '', confirmPassword: '' })
      Swal.fire({
        icon: 'success',
        title: t.userMenu.passwordUpdated,
        text: t.userMenu.passwordUpdatedText,
        confirmButtonColor: '#2563eb',
        timer: 2000,
        showConfirmButton: true,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: t.errors.generic,
        text: error.response?.data?.message || t.userMenu.passwordUpdatedText,
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const handleLogout = () => {
    Swal.fire({
      title: t.userMenu.logoutConfirmTitle,
      text: t.userMenu.logoutConfirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t.userMenu.logoutConfirmBtn,
      cancelButtonText: t.actions.cancel,
    }).then((result) => {
      if (result.isConfirmed) onLogout()
    })
  }

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false)
    setPasswordForm({ password: '', confirmPassword: '' })
  }

  return (
    <>
      <div ref={menuRef} className="user-menu">
        <button onClick={() => setIsOpen(!isOpen)} className="user-menu__trigger">
          <div className="user-menu__avatar">
            {currentUser.photoUrl ? (
              <img src={currentUser.photoUrl} alt={currentUser.name} />
            ) : (
              getInitials(currentUser.name, currentUser.lastName)
            )}
          </div>
          <span className="user-menu__name">
            {currentUser.name} {currentUser.lastName}
          </span>
          <ChevronDown size={18} className="user-menu__chevron" />
        </button>

        {isOpen && (
          <div className="user-menu__dropdown">
            {/* Header */}
            <div className="user-menu__dropdown-header">
              <h3 className="user-menu__dropdown-title">{t.userMenu.myProfile}</h3>
              <button onClick={() => setIsOpen(false)} className="user-menu__dropdown-close">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="user-menu__dropdown-content">
              {/* Avatar + nombre */}
              <div className="user-menu__profile-section">
                <div className="user-menu__profile-avatar">
                  {currentUser.photoUrl ? (
                    <img src={currentUser.photoUrl} alt={fullName || currentUser.username} />
                  ) : (
                    <span className="user-menu__profile-avatar-initials">
                      {getInitials(currentUser.name, currentUser.lastName)}
                    </span>
                  )}
                </div>
                <div className="user-menu__profile-name">
                  <p className="user-menu__profile-fullname">{fullName || currentUser.username}</p>
                  <p className="user-menu__profile-username">@{currentUser.username}</p>
                </div>
              </div>

              {/* Info */}
              <div className="user-menu__info-list">
                <div className="user-menu__info-row">
                  <Mail size={16} className="user-menu__info-icon" />
                  <span className="user-menu__info-value">{currentUser.email}</span>
                </div>
                <div className="user-menu__info-row">
                  <Building2 size={16} className="user-menu__info-icon" />
                  <span className="user-menu__info-value">{currentUser.company}</span>
                </div>
              </div>

              {/* Perfiles */}
              <div className="user-menu__profiles">
                <p className="user-menu__profiles-label">{t.userMenu.assignedProfiles}</p>
                <div className="user-menu__profiles-list">
                  {userProfiles.length === 0 && (
                    <span className="user-menu__profiles-empty">{t.userMenu.noProfiles}</span>
                  )}
                  {userProfiles.map((profile) => (
                    <span key={profile.id} className="user-menu__profile-badge">
                      {profile.name}
                    </span>
                  ))}
                </div>
              </div>

              <hr className="user-menu__divider" />

              {/* Acciones */}
              <div className="user-menu__actions">
                {/* Cambiar contraseña */}
                <button
                  onClick={() => { setShowPasswordModal(true); setIsOpen(false) }}
                  className="user-menu__action-btn user-menu__action-btn--password"
                >
                  <Key size={18} className="user-menu__action-icon" />
                  <span>{t.userMenu.changePassword}</span>
                </button>

                {/* Selector de idioma — botones horizontales */}
                <div className="user-menu__lang">
                  <Globe size={16} className="user-menu__lang-icon" />
                  <span className="user-menu__lang-label">{t.userMenu.language}</span>
                  <div className="user-menu__lang-flags">
                    {(Object.entries(localeFlagLabels) as [Locale, { flag: string; name: string }][]).map(([code, { flag, name }]) => (
                      <button
                        key={code}
                        title={name}
                        className={`user-menu__lang-flag-btn${locale === code ? ' user-menu__lang-flag-btn--active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setLocale(code as Locale) }}
                      >
                        <img src={flag} alt={name} className="user-menu__lang-flag-img" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cerrar sesión */}
                <button
                  onClick={handleLogout}
                  className="user-menu__action-btn user-menu__action-btn--logout"
                >
                  <LogOut size={18} />
                  <span>{t.userMenu.logout}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal contraseña */}
      <Modal
        isOpen={showPasswordModal}
        onClose={handleClosePasswordModal}
        title={t.userMenu.changePassword}
        size="sm"
      >
        <form onSubmit={handlePasswordUpdate} className="password-form">
          <div className="password-form__field">
            <div className="form-group">
              <label htmlFor="new-password" className="form-group__label">
                {t.userMenu.newPassword}*
              </label>
              <Lock size={18} className="form-group__icon" />
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                className="form-group__input"
                required
                minLength={6}
              />
              <div className="form-group__line" />
            </div>
            <p className="password-form__hint">{t.userMenu.passwordMinLength}</p>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-new-password" className="form-group__label">
              {t.userMenu.confirmPassword}*
            </label>
            <Lock size={18} className="form-group__icon" />
            <input
              id="confirm-new-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="form-group__input"
              required
              minLength={6}
            />
            <div className="form-group__line" />
          </div>

          <div className="password-form__actions">
            <button type="submit" className="btn btn-primary">
              <Key size={16} />
              {t.userMenu.updatePassword}
            </button>
            <button type="button" onClick={handleClosePasswordModal} className="btn btn-secondary">
              {t.actions.cancel}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}