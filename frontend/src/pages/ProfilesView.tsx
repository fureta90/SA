import React, { useState, FormEvent } from 'react'
import { Plus, Trash2, Save, Search, Shield } from 'lucide-react'
import Swal from 'sweetalert2'
import { Modal } from '../components/Modal'
import { useLang } from '../context/LangContext'
import type { User as UserType, Profile, Permission } from '../types'
import type { CreateProfileDto } from '../services/profiles.service'

interface ProfilesViewProps {
  users: UserType[]
  profiles: Profile[]
  permissions: Permission[]
  currentUser?: UserType | null   // usuario logueado — se excluye de la lista
  onCreateProfile: (profileData: CreateProfileDto) => void
  onUpdateProfile: (id: string, profileData: Partial<CreateProfileDto>) => void
  onDeleteProfile: (id: string) => void
  onUpdateUser: (id: number, userData: Partial<UserType>) => void
  hasPermission: (code: string) => boolean
  isMobile?: boolean
  isAdmin?: boolean
  getPermissionStatus: (
    user: UserType,
    permId: string,
    profiles: Profile[]
  ) => {
    isActive: boolean
    fromProfile: boolean
    isCustomAdded: boolean
    isCustomRemoved: boolean
  }
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  users,
  profiles,
  permissions,
  currentUser = null,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onUpdateUser,
  getPermissionStatus,
  hasPermission,
  isMobile = false,
  isAdmin = false,
}) => {
  const { t } = useLang()
  const [formData, setFormData] = useState<CreateProfileDto>({
    name: '',
    permissions: [],
  })
  const [searchUser, setSearchUser] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Profile | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await onUpdateProfile(editingItem.id, formData)
        Swal.fire({
          icon: 'success',
          title: '¡Perfil actualizado!',
          text: 'El perfil se ha actualizado correctamente',
          confirmButtonColor: '#2c92e6',
          timer: 2000,
        })
      } else {
        await onCreateProfile(formData)
        Swal.fire({
          icon: 'success',
          title: '¡Perfil creado!',
          text: 'El perfil se ha creado correctamente',
          confirmButtonColor: '#2c92e6',
          timer: 2000,
        })
      }
      setFormData({ name: '', permissions: [] })
      setShowForm(false)
      setEditingItem(null)
    } catch (error) {
      // Error manejado en AdminSystem
    }
  }

  const handleEdit = (profile: Profile) => {
    setEditingItem(profile)
    setFormData({ name: profile.name, permissions: profile.permissions })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setFormData({ name: '', permissions: [] })
    setShowForm(false)
  }

  const togglePermission = (permId: string) => {
    const newPerms = formData.permissions.includes(permId)
      ? formData.permissions.filter((p) => p !== permId)
      : [...formData.permissions, permId]
    setFormData({ ...formData, permissions: newPerms })
  }

  const filteredUsers = users.filter(
    (u) =>
      // Excluir al usuario logueado — no debe poder editarse a sí mismo en esta vista
      u.id !== currentUser?.id &&
      (u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()))
  )

  const selectedUser = selectedUserId !== null 
    ? users.find((u) => u.id === selectedUserId) 
    : null

  const toggleUserProfile = (userId: number, profileId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    const newProfileIds = user.profileIds.includes(profileId)
      ? user.profileIds.filter((p) => p !== profileId)
      : [...user.profileIds, profileId]

    onUpdateUser(userId, { ...user, profileIds: newProfileIds })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">{t.profiles.title}</h2>
        {(isAdmin || hasPermission('add_profiles')) && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={20} />
            {!isMobile && t.profiles.newProfile}
          </button>
        )}
      </div>

      {/* Modal Crear/Editar Perfil */}
      <Modal
        isOpen={showForm}
        onClose={handleCancel}
        title={editingItem ? t.profiles.editProfile : t.profiles.createProfile}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Campo Nombre */}
          <div className="form-group">
            <label className="form-group__label">{t.profiles.profileName}</label>
            <Shield size={18} className="form-group__icon" />
            <input
              type="text"
              {...{placeholder: t.labels.name}}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-group__input"
              required
            />
            <div className="form-group__line" />
          </div>

          {/* Permisos */}
          <div>
            <label className="form-group__label mb-4">{t.profiles.permissions}</label>
            <div className="checkbox-grid">
              {permissions.map((perm) => (
                <label
                  key={perm.id}
                  className={`checkbox-item ${formData.permissions.includes(perm.id) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                  />
                  <span className="checkbox-item__label">{perm.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
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

      {/* Buscar Usuario */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">{t.profiles.editUser}</h3>
        
        <div className="search-container mb-4">
          <Search size={18} className="search-container__icon" />
          <input
            type="search"
            {...{placeholder: t.profiles.searchUser}}
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="search-container__input"
          />
          <div className="search-container__line" />
        </div>

        {/* Lista de usuarios filtrados */}
        {searchUser && (
          <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`user-list-item ${selectedUserId === user.id ? 'selected' : ''}`}
              >
                <div className="user-list-item__avatar">
                  {user.name.charAt(0)}{user.lastName?.charAt(0) || ''}
                </div>
                <div className="user-list-item__info">
                  <p className="user-list-item__name">{user.name} {user.lastName}</p>
                  <p className="user-list-item__email">{user.email}</p>
                  <div className="user-list-item__badges">
                    {user.profileIds.map((profileId) => {
                      const profile = profiles.find((p) => p.id === profileId)
                      return profile ? (
                        <span key={profileId} className="badge badge-purple">{profile.name}</span>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usuario seleccionado */}
        {selectedUser && (
          <div className="mt-6" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Editando: {selectedUser.name}
              </h4>
              <button
                onClick={() => {
                  Swal.fire({
                    icon: 'success',
                    title: t.actions.save,
                    confirmButtonColor: '#2c92e6',
                    timer: 2000,
                  })
                }}
                className="btn btn-primary btn-sm"
              >
                <Save size={16} /> Guardar
              </button>
            </div>

            {/* Perfiles asignados */}
            <div className="mb-6">
              <h5 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                {t.profiles.assignedProfiles}
              </h5>
              <div className="checkbox-grid">
                {profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className={`checkbox-item ${selectedUser.profileIds.includes(profile.id) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUser.profileIds.includes(profile.id)}
                      onChange={() => toggleUserProfile(selectedUser.id, profile.id)}
                    />
                    <span className="checkbox-item__label">{profile.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Permisos individuales */}
            <div>
              <h5 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {t.profiles.individualPermissions}
              </h5>
              <p className="text-sm text-muted mb-4">
                {t.profiles.permissionLegend}
              </p>
              <div className="checkbox-grid">
                {permissions.map((perm) => {
                  const status = getPermissionStatus(selectedUser, perm.id, profiles)
                  return (
                    <label
                      key={perm.id}
                      className={`checkbox-item ${status.isActive ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={status.isActive}
                        onChange={() => {/* Toggle permission logic */}}
                      />
                      <span className="checkbox-item__label">{perm.name}</span>
                      <div className="checkbox-item__status">
                        {status.fromProfile && !status.isCustomRemoved && (
                          <span className="badge badge-from-profile">{t.labels.fromProfile}</span>
                        )}
                        {status.isCustomAdded && (
                          <span className="badge badge-added">+ Añadido</span>
                        )}
                        {status.isCustomRemoved && (
                          <span className="badge badge-removed">- Removido</span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button onClick={() => setSelectedUserId(null)} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Perfiles */}
      <div className="card">
        {profiles.length === 0 ? (
          <div className="empty-state">
            <Shield size={48} className="empty-state__icon" />
            <h4 className="empty-state__title">{t.profiles.noProfiles}</h4>
            <p className="empty-state__description">{t.profiles.noProfilesHint}</p>
          </div>
        ) : (
          <div className="profiles-grid">
            {profiles.map((profile) => {
              const usersCount = users.filter((u) => u.profileIds.includes(profile.id)).length
              const MAX_VISIBLE = 8
              const visiblePerms = profile.permissions.slice(0, MAX_VISIBLE)
              const remaining = profile.permissions.length - MAX_VISIBLE

              return (
                <div
                  key={profile.id}
                  className="profile-grid-card"
                  onClick={() => handleEdit(profile)}
                >
                  {/* Nombre */}
                  <div className="profile-grid-card__header">
                    <Shield size={15} className="profile-grid-card__icon" />
                    <h4 className="profile-grid-card__name">{profile.name}</h4>
                  </div>

                  {/* Meta */}
                  <p className="profile-grid-card__meta">
                    {usersCount} {usersCount !== 1 ? 's' : ''} {t.profiles.usersAssigned} {usersCount !== 1 ? 's' : ''}
                  </p>

                  {/* Permisos */}
                  {!isMobile && profile.permissions.length > 0 && (
                    <div className="profile-grid-card__permissions">
                      {visiblePerms.map((permId) => {
                        const perm = permissions.find((p) => p.id === permId)
                        return perm ? (
                          <span key={permId} className="profile-permission-badge">
                            {perm.name}
                          </span>
                        ) : null
                      })}
                      {remaining > 0 && (
                        <span className="profile-permission-badge profile-permission-badge--more">
                          +{remaining}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botón eliminar */}
                  {(isAdmin || hasPermission('delete_profiles')) && (
                    <button
                      className="profile-grid-card__delete"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const result = await Swal.fire({
                          title: t.profiles.deleteConfirmTitle,
                          text: 'Esta acción no se puede deshacer',
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#dc2626',
                          cancelButtonColor: '#6b7280',
                          confirmButtonText: t.actions.delete,
                          cancelButtonText: t.actions.cancel,
                        })
                        if (result.isConfirmed) {
                          onDeleteProfile(profile.id)
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      <span>{t.actions.delete}</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}