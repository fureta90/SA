import React from 'react'
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'
import { ProfilesView } from './ProfilesView'
import { UsersView } from './UsersView'
import { PermissionsView } from './PermissionsView'
import { Users, Shield, Key } from 'lucide-react'
import { useLang } from '../context/LangContext'

export const SettingsPage: React.FC = () => {
  const { pathname } = useLocation()
  const { 
    currentUser,
    users, profiles, permissions, isMobile, isAdmin, hasPermission, getPermissionStatus, 
    createUser, onUpdateUser, onDeleteUser, 
    createProfile, onUpdateProfile, onDeleteProfile,
    createPermission, onUpdatePermission, onDeletePermission,
  } = useAdminContext()

  const { t } = useLang()
  
  const isProfilesActive = pathname.includes('/settings/profiles')
  const isUsersActive = pathname.includes('/settings/users')
  const isPermissionsActive = pathname.includes('/settings/permissions')

  const canProfiles    = isAdmin || hasPermission('add_profiles')    || hasPermission('update_profiles')    || hasPermission('delete_profiles')
  const canUsers       = isAdmin || hasPermission('add_users')       || hasPermission('update_users')       || hasPermission('delete_users')       || hasPermission('view_users')
  const canPermissions = isAdmin || hasPermission('add_permissions') || hasPermission('update_permissions') || hasPermission('delete_permissions') || hasPermission('manage_permissions')

  // Si está en /settings sin sub-ruta activa, redirigir a la primera tab permitida
  const isOnRoot = pathname === '/settings' || pathname === '/settings/'
  if (isOnRoot) {
    if (canProfiles)    return <Navigate to="/settings/profiles"    replace />
    if (canUsers)       return <Navigate to="/settings/users"       replace />
    if (canPermissions) return <Navigate to="/settings/permissions" replace />
  }

  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Configuraciones</h1>
      
      <div className="settings-page__card">
        {/* Tabs */}
        <nav className="settings-tabs">
          {/* Tab Perfiles: visible si tiene permiso de ver/crear/editar/eliminar perfiles */}
          {(isAdmin || hasPermission('view_profiles') || hasPermission('add_profiles') || hasPermission('update_profiles') || hasPermission('delete_profiles')) && (
            <Link
              to="profiles"
              className={`settings-tab ${isProfilesActive ? 'active' : ''}`}
            >
              <Shield size={18} />
              {t.profiles.title}
            </Link>
          )}
          {/* Tab Usuarios: visible si tiene algún permiso sobre usuarios */}
          {(isAdmin || hasPermission('view_users') || hasPermission('add_users') || hasPermission('update_users') || hasPermission('delete_users')) && (
            <Link
              to="users"
              className={`settings-tab ${isUsersActive ? 'active' : ''}`}
            >
              <Users size={18} />
              {t.users.title}
            </Link>
          )}
          {/* Tab Permisos: solo admins o quienes gestionan permisos */}
          {(isAdmin || hasPermission('manage_permissions') || hasPermission('add_permissions') || hasPermission('update_permissions') || hasPermission('delete_permissions')) && (
            <Link
              to="permissions"
              className={`settings-tab ${isPermissionsActive ? 'active' : ''}`}
            >
              <Key size={18} />
              {t.permissions.title}
            </Link>
          )}
        </nav>

        {/* Contenido */}
        <div className="settings-content">
          {isProfilesActive && (isAdmin || hasPermission('view_profiles') || hasPermission('add_profiles') || hasPermission('update_profiles') || hasPermission('delete_profiles')) && (
            <ProfilesView
              users={users}
              profiles={profiles}
              permissions={permissions}
              currentUser={currentUser}
              onCreateProfile={createProfile}
              onUpdateProfile={onUpdateProfile}
              onDeleteProfile={onDeleteProfile}
              onUpdateUser={onUpdateUser}
              getPermissionStatus={getPermissionStatus}
              hasPermission={hasPermission}
              isMobile={isMobile}
              isAdmin={isAdmin}
            />
          )}
          {isUsersActive && (isAdmin || hasPermission('view_users') || hasPermission('add_users') || hasPermission('update_users') || hasPermission('delete_users')) && (
            <UsersView
              users={users}
              profiles={profiles}
              onCreateUser={createUser}
              onUpdateUser={onUpdateUser}
              onDeleteUser={onDeleteUser}
              hasPermission={hasPermission}
              isMobile={isMobile}
              isAdmin={isAdmin}
            />
          )}
          {isPermissionsActive && (
            <PermissionsView
              users={users}
              profiles={profiles}
              permissions={permissions}
              onCreatePermission={createPermission}
              onUpdatePermission={onUpdatePermission}
              onDeletePermission={onDeletePermission}
              hasPermission={hasPermission}
              onUpdateUser={onUpdateUser}
              getPermissionStatus={getPermissionStatus}
              isMobile={isMobile}
              isAdmin={isAdmin}
            />
          )}
          <Outlet />
        </div>
      </div>
    </div>
  )
}