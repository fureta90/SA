import React, { useState, useEffect } from 'react'
import { Moon, Sun, Settings, Menu } from 'lucide-react'
import Swal from 'sweetalert2'
import { Login } from '../components/Login'
import { Sidebar } from '../components/Sidebar'
import { UserMenu } from '../components/UserMenu'
import { usePermissions } from '../hooks/usePermissions'
import { authService } from '../services/auth.service'
import { usersService } from '../services/users.service'
import { rolesService } from '../services/roles.service'
import { permissionsService } from '../services/permissions.service'
import { profilesService } from '../services/profiles.service'
import api from '../services/api'
import { mapBackendUserToFrontend } from '../utils/mappers'
import type { User, Profile, Permission } from '../types'
import type { CreateUserDto } from '../services/users.service'
import type { CreateProfileDto } from '../services/profiles.service'
import type { CreatePermissionDto } from '../services/permissions.service'
import { AdminSystemProvider } from '../context/AdminContext'
import { Outlet, Link } from 'react-router-dom'

export const AdminSystem: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userIdMap, setUserIdMap] = useState<Map<number, string>>(new Map())
  // ✅ Flag único que indica que TODOS los datos iniciales ya cargaron
  const [isDataReady, setIsDataReady] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const { hasPermission, getUserEffectivePermissions, getPermissionStatus } =
    usePermissions(currentUser, profiles, permissions)

  const isAdmin = currentUser ? (() => {
    const emailLower = currentUser.email?.toLowerCase() || ''
    return currentUser.profileIds.some((profileId) => {
      const profile = profiles.find((p) => p.id === profileId)
      return profile?.name.toLowerCase().includes('admin')
    }) || emailLower.includes('admin')
  })() : false

  // Aplicar tema
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = theme
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  // Detectar mobile y ajustar sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 768px)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      setSidebarOpen(!e.matches)
    }
    setIsMobile(mql.matches)
    setSidebarOpen(!mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  // ✅ Carga unificada: users + roles/permissions en paralelo, una sola vez al autenticar
  useEffect(() => {
    const loadAllData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setIsDataReady(false)
      try {

        const [backendUsers, backendPermissions, backendRoles] = await Promise.all([
          // 403 = sin permiso para listar usuarios, no interrumpe la carga general
          usersService.getAll().catch((e: any) => {
            if (e?.response?.status !== 403) console.error('Error cargando usuarios:', e)
            return []
          }),
          permissionsService.getAll(),
          rolesService.getAll(),
        ])

        // Usuarios
        const mappedUsers = (backendUsers as any[]).map(mapBackendUserToFrontend)
        const newMap = new Map<number, string>()
        ;(backendUsers as any[]).forEach((bu: any, i: number) => {
          if (bu.id && mappedUsers[i]) newMap.set(mappedUsers[i].id, bu.id)
        })
        setUserIdMap(newMap)
        setUsers(mappedUsers)

        // Permisos
        if (backendPermissions?.length > 0) setPermissions(backendPermissions)

        // Perfiles/Roles
        if (backendRoles?.length > 0) {
          const profilesWithPermissions = await Promise.all(
            backendRoles.map(async (role: any) => {
              try {
                const roleWithPerms = await rolesService.getRoleWithPermissions(role.id)
                const isAdminRole = role.name.toLowerCase().includes('admin')
                let rolePermissions = roleWithPerms.permissions?.map((p: any) => p.id) || []
                if (isAdminRole && backendPermissions?.length > 0) {
                  rolePermissions = backendPermissions.map((p: any) => p.id)
                }
                return { id: role.id, name: role.name, permissions: rolePermissions } as Profile
              } catch {
                return { id: role.id, name: role.name, permissions: [] } as Profile
              }
            })
          )
          setProfiles(profilesWithPermissions)
        }
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        // ✅ Datos listos — las vistas ya pueden renderizarse
        setIsDataReady(true)
      }
    }

    if (currentUser) {
      loadAllData()
    }
  }, [currentUser])

  // Login
  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await authService.login({ identifier: username, password })
      if (response.access_token) {
        const profileResponse = await api.get('/profile')
        if (profileResponse.data?.user) {
          const frontendUser = mapBackendUserToFrontend(profileResponse.data.user)
          setCurrentUser(frontendUser)
        }
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: error.response?.data?.message || 'Usuario o contraseña incorrectos',
        confirmButtonColor: '#dc2626',
      })
      throw error
    }
  }

  const handleLogout = () => {
    authService.logout()
    setCurrentUser(null)
    setUsers([])
    setProfiles([])
    setPermissions([])
    setIsDataReady(false)
  }

  // CRUD Users
  const createUser = async (userData: CreateUserDto) => {
    try {
      const newUser = await usersService.create(userData)
      const mappedUser = mapBackendUserToFrontend(newUser)
      setUsers((prev) => [...prev, mappedUser])
      if (newUser.id) setUserIdMap((prev) => new Map(prev).set(mappedUser.id, newUser.id))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al crear usuario', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  const updateUser = async (id: number, userData: Partial<CreateUserDto>) => {
    try {
      const backendId = userIdMap.get(id)
      if (!backendId) throw new Error('Usuario no encontrado')
      const updatedUser = await usersService.update(backendId, userData)
      const mappedUser = mapBackendUserToFrontend(updatedUser)
      setUsers((prev) => prev.map((u) => (u.id === id ? mappedUser : u)))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al actualizar', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  const deleteUser = async (id: number) => {
    try {
      const backendId = userIdMap.get(id)
      if (!backendId) throw new Error('Usuario no encontrado')
      await usersService.delete(backendId)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al eliminar', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  // CRUD Profiles
  const createProfile = async (profileData: CreateProfileDto) => {
    try {
      const newProfile = await profilesService.create(profileData)
      setProfiles((prev) => [...prev, newProfile])
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al crear perfil', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  const updateProfile = async (id: string, profileData: Partial<CreateProfileDto>) => {
    try {
      const updatedProfile = await profilesService.update(id, profileData)
      setProfiles((prev) => prev.map((p) => (p.id === id ? updatedProfile : p)))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al actualizar', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  const deleteProfile = async (id: string) => {
    try {
      await profilesService.delete(id)
      setProfiles((prev) => prev.filter((p) => p.id !== id))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al eliminar', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  // CRUD Permissions
  const createPermission = async (permissionData: CreatePermissionDto) => {
    try {
      const newPermission = await permissionsService.create(permissionData)
      setPermissions((prev) => [...prev, newPermission])
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al crear permiso', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  const updatePermission = async (id: string, permissionData: Partial<CreatePermissionDto>) => {
    try {
      const updatedPermission = await permissionsService.update(id, permissionData)
      setPermissions((prev) => prev.map((p) => (p.id === id ? updatedPermission : p)))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al actualizar', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  const deletePermission = async (id: string) => {
    try {
      await permissionsService.delete(id)
      setPermissions((prev) => prev.filter((p) => p.id !== id))
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al eliminar', confirmButtonColor: '#dc2626' })
      throw error
    }
  }

  // Verificar auth al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setCurrentUser(null); return }
      try {
        const profileResponse = await api.get('/profile')
        if (profileResponse.data?.user) {
          setCurrentUser(mapBackendUserToFrontend(profileResponse.data.user))
        } else {
          localStorage.removeItem('token')
          setCurrentUser(null)
        }
      } catch {
        localStorage.removeItem('token')
        setCurrentUser(null)
      }
    }
    checkAuth()
  }, [])

  // Render
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token')

  if (!hasToken || !currentUser) {
    return <Login onLogin={handleLogin} />
  }

  // ✅ Mostrar spinner mientras los datos cargan por primera vez
  if (!isDataReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
      }}>
        Cargando...
      </div>
    )
  }

  return (
    <AdminSystemProvider
      currentUser={currentUser}
      users={users}
      profiles={profiles}
      permissions={permissions}
      isMobile={isMobile}
      isAdmin={isAdmin}
      userIdMap={userIdMap}
      hasPermission={hasPermission}
      getPermissionStatus={getPermissionStatus}
      createUser={createUser}
      onUpdateUser={updateUser}
      onDeleteUser={deleteUser}
      createProfile={createProfile}
      onUpdateProfile={updateProfile}
      onDeleteProfile={deleteProfile}
      createPermission={createPermission}
      onUpdatePermission={updatePermission}
      onDeletePermission={deletePermission}
      getUserEffectivePermissions={getUserEffectivePermissions}
    >
      <div className="admin-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          hasPermission={hasPermission}
          isAdmin={isAdmin}
        />

        <div className="admin-layout__main">
          <header className="admin-header">
            <div className="admin-header__left">
              {isMobile && !sidebarOpen && (
                <button
                  className="mobile-menu-btn"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menú"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>

            <div className="admin-header__actions">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="admin-header__theme-toggle"
              >
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </button>

              {(() => {
                const canProfiles    = isAdmin || hasPermission('add_profiles')    || hasPermission('update_profiles')    || hasPermission('delete_profiles')
                const canUsers       = isAdmin || hasPermission('add_users')       || hasPermission('update_users')       || hasPermission('delete_users')       || hasPermission('view_users')
                const canPermissions = isAdmin || hasPermission('add_permissions') || hasPermission('update_permissions') || hasPermission('delete_permissions') || hasPermission('manage_permissions')
                const settingsTarget = canProfiles ? '/settings/profiles' : canUsers ? '/settings/users' : canPermissions ? '/settings/permissions' : null
                return settingsTarget ? (
                  <Link to={settingsTarget} className="admin-header__settings-link">
                    <Settings size={16} />
                  </Link>
                ) : null
              })()}

              {currentUser && (
                <UserMenu
                  currentUser={currentUser}
                  profiles={profiles}
                  onUpdateUser={updateUser}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </header>

          <main className="admin-content">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminSystemProvider>
  )
}