import type { User, Profile, Permission } from '../types'

export function usePermissions(
  user: User | null,
  profiles: Profile[],
  permissions: Permission[]
) {
  const hasPermission = (code: string): boolean => {
    if (!user) return false

    const codeAliases: Record<string, string[]> = {
      add_users: ['add_users', 'create_users', 'crear_usuarios', 'agregar_usuarios', 'crear usuarios', 'Crear Usuarios'],
      update_users: ['update_users', 'edit_users', 'editar_usuarios', 'modificar_usuarios', 'modificar usuarios', 'Modificar Usuarios'],
      delete_users: ['delete_users', 'remove_users', 'eliminar_usuarios', 'borrar_usuarios', 'eliminar usuarios', 'Eliminar Usuarios'],
      view_users: ['view_users', 'list_users', 'ver_usuarios', 'ver usuarios', 'Ver Usuarios'],
      view_campaigns:   ['view_campaigns', 'ver_campañas', 'ver campañas'],
      add_campaigns:    ['add_campaigns', 'create_campaigns', 'crear_campañas'],
      update_campaigns: ['update_campaigns', 'edit_campaigns', 'modificar_campañas'],
      delete_campaigns: ['delete_campaigns', 'remove_campaigns', 'eliminar_campañas'],
      add_profiles: ['add_profiles', 'create_profiles', 'crear_perfiles', 'agregar_perfiles'],
      update_profiles: ['update_profiles', 'edit_profiles', 'editar_perfiles', 'modificar_perfiles'],
      delete_profiles: ['delete_profiles', 'remove_profiles', 'eliminar_perfiles', 'borrar_perfiles'],
      view_profiles: ['view_profiles', 'list_profiles', 'ver_perfiles'],
      add_permissions: ['add_permissions', 'create_permissions', 'crear_permisos', 'agregar_permisos'],
      update_permissions: ['update_permissions', 'edit_permissions', 'editar_permisos', 'modificar_permisos'],
      delete_permissions: ['delete_permissions', 'remove_permissions', 'eliminar_permisos', 'borrar_permisos'],
      manage_permissions: ['manage_permissions', 'gestionar_permisos'],
      view_analytics: ['view_analytics', 'ver_analytics', 'ver analytics'],
      view_reports: ['view_reports', 'ver_reportes', 'ver reportes'],
    }

    // Verificar admin por perfil
    let isAdmin = user.profileIds.some((profileId) => {
      const profile = profiles.find((p) => p.id === profileId)
      if (profile) {
        const profileNameLower = profile.name.toLowerCase()
        return profileNameLower.includes('admin') || profileNameLower.includes('administrador')
      }
      return false
    })

    // Verificar admin por email
    if (!isAdmin) {
      const emailLower = user.email?.toLowerCase() || ''
      isAdmin = emailLower.includes('admin') ||
                emailLower === 'lucas.domenica33@gmail.com' ||
                emailLower === 'fureta@findcontrol.info'
    }

    if (isAdmin) return true

    // Calcular permisos efectivos
    let allPermissions: string[] =
      user.permissionIds && user.permissionIds.length > 0 ? [...user.permissionIds] : []

    if (allPermissions.length === 0) {
      user.profileIds.forEach((profileId) => {
        const profile = profiles.find((p) => p.id === profileId)
        if (profile) {
          allPermissions = [...allPermissions, ...profile.permissions]
        }
      })
    }

    allPermissions = [...allPermissions, ...user.customPermissions.added]
    allPermissions = allPermissions.filter((p) => !user.customPermissions.removed.includes(p))
    allPermissions = [...new Set(allPermissions)]

    // ✅ Normalizar todos los IDs a minúsculas para comparación case-insensitive
    const allPermissionsLower = allPermissions.map((p) => p.toLowerCase())

    const candidateCodes = [code, ...(codeAliases[code] || [])].map((c) => c.toLowerCase())

    const permission = permissions.find((p) => {
      const pCode = (p.code || '').toLowerCase()
      const pName = (p.name || '').toLowerCase()
      return candidateCodes.includes(pCode) || candidateCodes.includes(pName)
    })

    const targetId = permission?.id?.toString().toLowerCase()

    return !!targetId && allPermissionsLower.includes(targetId)
  }

  const getUserEffectivePermissions = (targetUser: User): string[] => {
    let isAdmin = targetUser.profileIds.some((profileId) => {
      const profile = profiles.find((p) => p.id === profileId)
      if (profile) {
        const profileNameLower = profile.name.toLowerCase()
        return profileNameLower.includes('admin') || profileNameLower.includes('administrador')
      }
      return false
    })

    if (!isAdmin) {
      const emailLower = targetUser.email?.toLowerCase() || ''
      isAdmin = emailLower.includes('admin') ||
                emailLower === 'lucas.domenica33@gmail.com' ||
                emailLower === 'fureta@findcontrol.info'
    }

    if (isAdmin) {
      return permissions.map((p) => p.id)
    }

    let allPermissions: string[] =
      targetUser.permissionIds && targetUser.permissionIds.length > 0
        ? [...targetUser.permissionIds]
        : []

    if (allPermissions.length === 0) {
      targetUser.profileIds.forEach((profileId) => {
        const profile = profiles.find((p) => p.id === profileId)
        if (profile) {
          allPermissions = [...allPermissions, ...profile.permissions]
        }
      })
    }

    allPermissions = [...allPermissions, ...targetUser.customPermissions.added]
    allPermissions = allPermissions.filter((p) => !targetUser.customPermissions.removed.includes(p))
    return [...new Set(allPermissions)]
  }

  const getPermissionStatus = (
    targetUser: User,
    permId: string,
    profiles: Profile[]
  ) => {
    const effectivePerms = getUserEffectivePermissions(targetUser)
    // ✅ Comparación case-insensitive
    const permIdLower = permId.toLowerCase()
    const isActive = effectivePerms.some((p) => p.toLowerCase() === permIdLower)

    let fromProfile = false
    targetUser.profileIds.forEach((profileId) => {
      const profile = profiles.find((p) => p.id === profileId)
      if (profile && profile.permissions.some((p) => p.toLowerCase() === permIdLower)) {
        fromProfile = true
      }
    })

    const isCustomAdded = targetUser.customPermissions.added.some((p) => p.toLowerCase() === permIdLower)
    const isCustomRemoved = targetUser.customPermissions.removed.some((p) => p.toLowerCase() === permIdLower)

    return { isActive, fromProfile, isCustomAdded, isCustomRemoved }
  }

  return {
    hasPermission,
    getUserEffectivePermissions,
    getPermissionStatus,
  }
}