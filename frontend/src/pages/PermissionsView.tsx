import React, { useState, FormEvent } from 'react'
import { Plus, Trash2, Save, Search, Key, Code } from 'lucide-react'
import Swal from 'sweetalert2'
import { Modal } from '../components/Modal'
import { useLang } from '../context/LangContext'
import type { User, Profile, Permission } from '../types'
import type { CreatePermissionDto } from '../services/permissions.service'

interface PermissionsViewProps {
  users: User[]
  profiles: Profile[]
  permissions: Permission[]
  onCreatePermission: (permissionData: CreatePermissionDto) => void
  onUpdatePermission: (id: string, permissionData: Partial<CreatePermissionDto>) => void
  onDeletePermission: (id: string) => void
  hasPermission: (code: string) => boolean
  onUpdateUser: (id: number, userData: Partial<User>) => void
  getPermissionStatus: (
    user: User,
    permId: string,
    profiles: Profile[]
  ) => {
    isActive: boolean
    fromProfile: boolean
    isCustomAdded: boolean
    isCustomRemoved: boolean
  }
  isMobile?: boolean
  isAdmin?: boolean
}

export const PermissionsView: React.FC<PermissionsViewProps> = ({
  users,
  profiles,
  permissions,
  onCreatePermission,
  onUpdatePermission,
  onDeletePermission,
  hasPermission,
  onUpdateUser,
  getPermissionStatus,
  isMobile = false,
  isAdmin = false,
}) => {
  const { t } = useLang()
  const [formData, setFormData] = useState<CreatePermissionDto>({
    name: '',
    code: '',
  })
  const [searchUser, setSearchUser] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Permission | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [customPermsByUser, setCustomPermsByUser] = useState<
    Record<number, { added: string[]; removed: string[] }>
  >({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await onUpdatePermission(editingItem.id, formData)
        Swal.fire({
          icon: 'success',
          title: '¡Permiso actualizado!',
          confirmButtonColor: '#2c92e6',
          timer: 2000,
        })
      } else {
        await onCreatePermission(formData)
        Swal.fire({
          icon: 'success',
          title: '¡Permiso creado!',
          confirmButtonColor: '#2c92e6',
          timer: 2000,
        })
      }
      handleCancel()
    } catch (error) {
      // Error manejado en AdminSystem
    }
  }

  const handleEdit = (permission: Permission) => {
    setEditingItem(permission)
    setFormData({ name: permission.name, code: permission.code })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setFormData({ name: '', code: '' })
    setShowForm(false)
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase())
  )

  const selectedUser = selectedUserId !== null 
    ? users.find((u) => u.id === selectedUserId) 
    : null

  const calculateCustomPermissions = (user: typeof selectedUser) => {
    if (!user) return { added: [], removed: [] }
    if (customPermsByUser[user.id]) return customPermsByUser[user.id]
    if (user.customPermissions?.added.length > 0 || user.customPermissions?.removed.length > 0) {
      return user.customPermissions
    }
    return { added: [], removed: [] }
  }

  const toggleUserCustomPermission = (userId: number, permId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    let basePermissions: string[] = []
    user.profileIds.forEach((profileId) => {
      const profile = profiles.find((p) => p.id === profileId)
      if (profile) basePermissions = [...basePermissions, ...profile.permissions]
    })
    basePermissions = [...new Set(basePermissions)]

    const currentCustom = customPermsByUser[userId] || calculateCustomPermissions(user)
    let newCustomPerms = { ...currentCustom }

    const userWithCustom = { ...user, customPermissions: currentCustom }
    const status = getPermissionStatus(userWithCustom, permId, profiles)

    if (basePermissions.includes(permId)) {
      return // No permitir quitar permisos del perfil
    } else {
      if (status.isActive) {
        newCustomPerms.added = newCustomPerms.added.filter((p) => p !== permId)
        if (!newCustomPerms.removed.includes(permId)) {
          newCustomPerms.removed = [...newCustomPerms.removed, permId]
        }
      } else {
        newCustomPerms.added = [...newCustomPerms.added, permId]
        newCustomPerms.removed = newCustomPerms.removed.filter((p) => p !== permId)
      }
    }

    setCustomPermsByUser((prev) => ({ ...prev, [userId]: newCustomPerms }))
  }

  const selectedUserEffective = selectedUser
    ? { ...selectedUser, customPermissions: calculateCustomPermissions(selectedUser) }
    : null

  return (
    <div className="p-6">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">{t.permissions.title}</h2>
        {(isAdmin || hasPermission('add_permissions')) && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={20} />
            {!isMobile && t.permissions.newPermission}
          </button>
        )}
      </div>

      {/* Modal Crear/Editar Permiso */}
      <Modal
        isOpen={showForm}
        onClose={handleCancel}
        title={editingItem ? 'Editar Permiso' : 'Crear Permiso'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Nombre */}
          <div className="form-group">
            <label className="form-group__label">{t.permissions.permissionName}</label>
            <Key size={18} className="form-group__icon" />
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

          {/* Código */}
          <div className="form-group">
            <label className="form-group__label">{t.permissions.permissionCode}</label>
            <Code size={18} className="form-group__icon" />
            <input
              type="text"
              placeholder="view_reports"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="form-group__input"
              required
            />
            <div className="form-group__line" />
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

      {/* Asignar Permisos a Usuario */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">{t.permissions.assignToUser}</h3>
        
        <div className="search-container mb-4">
          <Search size={18} className="search-container__icon" />
          <input
            type="search"
            {...{placeholder: t.users.searchByUser}}
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="search-container__input"
          />
          <div className="search-container__line" />
        </div>

        {searchUser && (
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
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
                  <p className="user-list-item__email">{user.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedUserEffective && (
          <div className="mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Permisos de: {selectedUserEffective.name}
              </h4>
            </div>

            <p className="text-sm text-muted mb-4">
              ✓ Verde = Del perfil | + Añadido | - Removido
            </p>

            <div className="checkbox-grid">
              {permissions.map((perm) => {
                const status = getPermissionStatus(selectedUserEffective, perm.id, profiles)
                return (
                  <label
                    key={perm.id}
                    className={`checkbox-item ${status.isActive ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={status.isActive}
                      onChange={() => toggleUserCustomPermission(selectedUserEffective.id, perm.id)}
                      disabled={status.fromProfile && !status.isCustomRemoved}
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

            <div className="flex gap-3 mt-6" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button
                onClick={async () => {
                  const customPerms = customPermsByUser[selectedUserEffective.id]
                  if (customPerms) {
                    await onUpdateUser(selectedUserEffective.id, { customPermissions: customPerms })
                    setCustomPermsByUser((prev) => {
                      const newState = { ...prev }
                      delete newState[selectedUserEffective.id]
                      return newState
                    })
                  }
                  Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    confirmButtonColor: '#2c92e6',
                    timer: 2000,
                  })
                }}
                className="btn btn-primary"
              >
                <Save size={16} /> Guardar cambios
              </button>
              <button onClick={() => setSelectedUserId(null)} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Permisos */}
      <div className="card">
        {permissions.length === 0 ? (
          <div className="empty-state">
            <Key size={48} className="empty-state__icon" />
            <h4 className="empty-state__title">{t.permissions.noPermissions}</h4>
            <p className="empty-state__description">{t.permissions.noPermissionsHint}</p>
          </div>
        ) : (
          <div className="permissions-grid">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="permission-grid-card"
                onClick={() => handleEdit(permission)}
              >
                {/* Nombre */}
                <div className="permission-grid-card__header">
                  <Key size={15} className="permission-grid-card__icon" />
                  <h4 className="permission-grid-card__name">{permission.name}</h4>
                </div>

                {/* Código */}
                <code className="permission-grid-card__code">{permission.code}</code>

                {/* Botón eliminar */}
                {(isAdmin || hasPermission('delete_permissions')) && (
                  <button
                    className="profile-grid-card__delete"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const result = await Swal.fire({
                        title: t.permissions.deleteConfirmTitle,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        confirmButtonText: t.actions.delete,
                        cancelButtonText: t.actions.cancel,
                      })
                      if (result.isConfirmed) onDeletePermission(permission.id)
                    }}
                  >
                    <Trash2 size={14} />
                    <span>{t.actions.delete}</span>
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