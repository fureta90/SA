import React, { useState, FormEvent, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Save, Search, User as UserIcon, Mail, Building, Lock, Upload } from 'lucide-react'
import Swal from 'sweetalert2'
import { Modal } from '../components/Modal'
import { usersService } from '../services/users.service'
import { mapBackendUserToFrontend } from '../utils/mappers'
import { useLang } from '../context/LangContext'
import type { User, Profile } from '../types'
import type { CreateUserDto } from '../services/users.service'

interface UsersViewProps {
  users: User[]
  profiles: Profile[]
  onCreateUser: (userData: CreateUserDto) => void
  onUpdateUser: (id: number, userData: Partial<CreateUserDto>) => void
  onDeleteUser: (id: number) => void
  hasPermission: (code: string) => boolean
  isMobile?: boolean
  isAdmin?: boolean
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  profiles,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  hasPermission,
  isMobile = false,
  isAdmin = false,
}) => {
  const { t } = useLang()
  const [formData, setFormData] = useState<CreateUserDto>({
    username: '',
    password: '',
    name: '',
    lastName: '',
    email: '',
    company: '',
    photoUrl: '',
    profileIds: [],
    customPermissions: { added: [], removed: [] },
  })
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<User | null>(null)
  const [searchUsuario, setSearchUsuario] = useState('')
  const [searchEmpresa, setSearchEmpresa] = useState('')
  // filteredUsers solo se usa cuando hay una búsqueda activa
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ✅ SOLUCIÓN: displayUsers deriva directamente de `users` cuando no hay búsqueda,
  // evitando el problema de sincronización con useState.
  const isSearchActive = searchUsuario.trim() !== '' || searchEmpresa.trim() !== ''
  const displayUsers = isSearchActive ? filteredUsers : users

  const getInitials = (name: string, lastName: string) => {
    return `${(name || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo inválido',
          text: 'Por favor selecciona una imagen',
          confirmButtonColor: '#dc2626',
        })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo muy grande',
          text: 'La imagen no debe superar los 5MB',
          confirmButtonColor: '#dc2626',
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setPhotoPreview(base64)
        setFormData({ ...formData, photoUrl: base64 })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        const dataToSend = changePassword ? formData : (() => {
          const { password, ...rest } = formData
          return rest
        })()
        await onUpdateUser(editingItem.id, dataToSend)
        Swal.fire({
          icon: 'success',
          title: t.users.userUpdated,
          confirmButtonColor: '#2c92e6',
          timer: 2000,
        })
      } else {
        await onCreateUser(formData)
        Swal.fire({
          icon: 'success',
          title: t.users.userCreated,
          confirmButtonColor: '#2c92e6',
          timer: 2000,
        })
      }
      handleCancel()
    } catch (error) {
      // Error manejado en AdminSystem
    }
  }

  const handleEdit = (user: User) => {
    setEditingItem(user)
    setChangePassword(false)
    setPhotoPreview(user.photoUrl || null)
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      company: user.company,
      photoUrl: user.photoUrl || '',
      profileIds: user.profileIds,
      customPermissions: user.customPermissions,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setChangePassword(false)
    setPhotoPreview(null)
    setFormData({
      username: '',
      password: '',
      name: '',
      lastName: '',
      email: '',
      company: '',
      photoUrl: '',
      profileIds: [],
      customPermissions: { added: [], removed: [] },
    })
    setShowForm(false)
  }

  const toggleProfile = (profileId: string) => {
    const newProfiles = formData.profileIds.includes(profileId)
      ? formData.profileIds.filter((p) => p !== profileId)
      : [...formData.profileIds, profileId]
    setFormData({ ...formData, profileIds: newProfiles })
  }

  // Búsqueda
  const handleSearch = useCallback(async (usuarioQuery: string, empresaQuery: string) => {
    setIsSearching(true)
    try {
      let results: User[] = []
      if (usuarioQuery.trim() && empresaQuery.trim()) {
        const usuarioResults = await usersService.searchByUsuario(usuarioQuery.trim())
        const mappedResults = usuarioResults.map(mapBackendUserToFrontend)
        results = mappedResults.filter(user =>
          user.company?.toLowerCase().includes(empresaQuery.trim().toLowerCase())
        )
      } else if (usuarioQuery.trim()) {
        const usuarioResults = await usersService.searchByUsuario(usuarioQuery.trim())
        results = usuarioResults.map(mapBackendUserToFrontend)
      } else if (empresaQuery.trim()) {
        const empresaResults = await usersService.searchByEmpresa(empresaQuery.trim())
        results = empresaResults.map(mapBackendUserToFrontend)
      } else {
        results = users
      }
      setFilteredUsers(results)
    } catch (error) {
      setFilteredUsers(users)
    } finally {
      setIsSearching(false)
    }
  }, [users])

  const handleClearSearch = () => {
    setSearchUsuario('')
    setSearchEmpresa('')
    setFilteredUsers([])
  }

  // Debounce de búsqueda — solo se dispara cuando hay texto activo
  useEffect(() => {
    if (!isSearchActive) return
    const timer = setTimeout(() => {
      handleSearch(searchUsuario, searchEmpresa)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchUsuario, searchEmpresa, handleSearch, isSearchActive])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">{t.users.title}</h2>
        {(isAdmin || hasPermission('add_users')) && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={20} />
            {!isMobile && t.users.newUser}
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="card mb-6">
        <div className="grid-2 gap-4 mb-4">
          <div className="search-container">
            <Search size={18} className="search-container__icon" />
            <input
              type="text"
              {...{placeholder: t.users.searchByUser}}
              value={searchUsuario}
              onChange={(e) => setSearchUsuario(e.target.value)}
              className="search-container__input"
            />
            <div className="search-container__line" />
          </div>
          <div className="search-container">
            <Building size={18} className="search-container__icon" />
            <input
              type="text"
              {...{placeholder: t.users.searchByCompany}}
              value={searchEmpresa}
              onChange={(e) => setSearchEmpresa(e.target.value)}
              className="search-container__input"
            />
            <div className="search-container__line" />
          </div>
        </div>
        {isSearchActive && (
          <button onClick={handleClearSearch} className="btn btn-danger btn-sm">
            Limpiar Búsqueda
          </button>
        )}
      </div>

      {isSearching && (
        <div className="text-center p-4 text-muted">{t.users.searching}</div>
      )}

      {/* Modal Crear/Editar Usuario */}
      <Modal
        isOpen={showForm}
        onClose={handleCancel}
        title={editingItem ? t.users.editUser : t.users.createUser}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="form-grid gap-4">
            {/* Username */}
            <div className="form-group">
              <label className="form-group__label">{t.labels.username}*</label>
              <UserIcon size={18} className="form-group__icon" />
              <input
                type="text"
                placeholder="usuario123"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="form-group__input"
                required
              />
              <div className="form-group__line" />
            </div>

            {/* Password */}
            <div>
              <div className="form-group form-group--no-margin">
                <label className="form-group__label">
                  {editingItem ? 'Nueva Contraseña' : 'Contraseña*'}
                </label>
                <Lock size={18} className="form-group__icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-group__input"
                  required={!editingItem}
                  disabled={!!editingItem && !changePassword}
                />
                <div className="form-group__line" />
              </div>
              {editingItem && (
                <label className="form-group__checkbox-toggle">
                  <input
                    type="checkbox"
                    checked={changePassword}
                    onChange={(e) => setChangePassword(e.target.checked)}
                  />
                  <span>{t.userMenu.changePassword}</span>
                </label>
              )}
            </div>

            {/* Nombre */}
            <div className="form-group">
              <label className="form-group__label">{t.labels.firstName}*</label>
              <UserIcon size={18} className="form-group__icon" />
              <input
                type="text"
                {...{placeholder: t.labels.firstName}}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-group__input"
                required
              />
              <div className="form-group__line" />
            </div>

            {/* Apellido */}
            <div className="form-group">
              <label className="form-group__label">{t.labels.lastName}*</label>
              <UserIcon size={18} className="form-group__icon" />
              <input
                type="text"
                {...{placeholder: t.labels.lastName}}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="form-group__input"
                required
              />
              <div className="form-group__line" />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-group__label">{t.labels.email}*</label>
              <Mail size={18} className="form-group__icon" />
              <input
                type="email"
                placeholder="juan@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-group__input"
                required
              />
              <div className="form-group__line" />
            </div>

            {/* Empresa */}
            <div className="form-group">
              <label className="form-group__label">{t.labels.company}</label>
              <Building size={18} className="form-group__icon" />
              <input
                type="text"
                placeholder="Mi Empresa S.A."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="form-group__input"
              />
              <div className="form-group__line" />
            </div>
          </div>

          {/* Foto */}
          <div className="form-group">
            <label className="form-group__label">{t.users.profilePhoto}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 0',
                borderBottom: '1.5px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--gray-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}>
                  <Upload size={20} />
                </div>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {photoPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </span>
            </div>
          </div>

          {/* Perfiles */}
          <div>
            <label className="form-group__label mb-4">{t.users.profiles}</label>
            <div className="checkbox-grid">
              {profiles.map((profile) => (
                <label
                  key={profile.id}
                  className={`checkbox-item ${formData.profileIds.includes(profile.id) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.profileIds.includes(profile.id)}
                    onChange={() => toggleProfile(profile.id)}
                  />
                  <span className="checkbox-item__label">{profile.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              {editingItem ? t.actions.update : t.actions.create}
            </button>
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Lista de Usuarios */}
      <div className="card">
        {displayUsers.length === 0 ? (
          <div className="empty-state">
            <UserIcon size={48} className="empty-state__icon" />
            <h4 className="empty-state__title">{t.users.noUsers}</h4>
            <p className="empty-state__description">
              {isSearchActive
                ? t.users.noUsers
                : t.users.noUsersHint}
            </p>
          </div>
        ) : (
          <div className="users-grid">
            {displayUsers.map((user) => (
              <div
                key={user.id}
                className="user-grid-card"
                onClick={() => handleEdit(user)}
              >
                {/* Avatar + info */}
                <div className="user-grid-card__body">
                  <div className="user-grid-card__avatar">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="user-grid-card__avatar-img" />
                    ) : (
                      <span className="user-grid-card__avatar-initials">
                        {getInitials(user.name, user.lastName)}
                      </span>
                    )}
                  </div>
                  <div className="user-grid-card__info">
                    <p className="user-grid-card__name">{user.name} {user.lastName}</p>
                    <p className="user-grid-card__username">@{user.username}</p>
                    <p className="user-grid-card__email">{user.email}</p>
                    {user.company && (
                      <p className="user-grid-card__company">{user.company}</p>
                    )}
                    {user.profileIds.length > 0 && (
                      <div className="user-grid-card__profiles">
                        {profiles
                          .filter((p) => user.profileIds.includes(p.id))
                          .map((p) => (
                            <span key={p.id} className="badge badge-purple">{p.name}</span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón eliminar */}
                {(isAdmin || hasPermission('delete_users')) && (
                  <button
                    className="profile-grid-card__delete"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const result = await Swal.fire({
                        title: t.users.deleteConfirmTitle,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        confirmButtonText: t.actions.delete,
                        cancelButtonText: t.actions.cancel,
                      })
                      if (result.isConfirmed) onDeleteUser(user.id)
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}