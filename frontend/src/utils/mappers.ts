import type { User } from '../types'

// Mapear usuario del backend al modelo del frontend
export function mapBackendUserToFrontend(backendUser: any): User {
  // ID numérico estable en el frontend, derivado del GUID del backend
  let id = 0
  if (backendUser.id) {
    if (typeof backendUser.id === 'string') {
      const hash = backendUser.id.split('').reduce((acc: number, char: string) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
      }, 0)
      id = Math.abs(hash)
    } else {
      id = Number(backendUser.id) || 0
    }
  }

  // Mapear roles del backend
  const roles: Array<{ id: string; name: string }> = Array.isArray(backendUser.roles)
    ? backendUser.roles
        .filter((r: any) => r && r.id)
        .map((r: any) => ({ id: String(r.id), name: String(r.name ?? '') }))
    : []

  // Mapear roles a profileIds (GUID strings)
  const profileIds: string[] = roles.map((r) => r.id)

  // Mapear permisos efectivos del backend (si vienen desde /profile)
  const permissionIds: string[] = Array.isArray(backendUser.permissions)
    ? backendUser.permissions
        .filter((p: any) => p && p.id)
        .map((p: any) => String(p.id))
    : []
  
  // Si el usuario es admin pero no tiene roles asignados, el hook usePermissions
  // lo detectará por email o bandera isAdmin
  
  return {
    id,
    username: backendUser.usuario || backendUser.email?.split('@')[0] || '',
    password: '',
    name: backendUser.firstName || '',
    lastName: backendUser.lastName || '',
    email: backendUser.email || '',
    company: backendUser.empresa || '',
    photoUrl: backendUser.photoUrl || '',
    profileIds, // GUIDs de roles
    roles,
    permissionIds,
    customPermissions: { added: [], removed: [] }, // No existe en el backend todavía
    isAdmin: backendUser.isAdmin || false,
  }
}

// Mapear usuario del frontend al modelo del backend
export function mapFrontendUserToBackend(frontendUser: any): any {
  const backendData: any = {}
  
  // Solo incluir campos que están definidos (no undefined)
  if (frontendUser.email !== undefined) {
    backendData.email = frontendUser.email
  }
  
  if (frontendUser.password !== undefined && frontendUser.password !== '') {
    backendData.password = frontendUser.password
  }
  
  if (frontendUser.name !== undefined) {
    backendData.firstName = frontendUser.name
  }
  
  if (frontendUser.lastName !== undefined) {
    backendData.lastName = frontendUser.lastName
  }
  
  // SIEMPRE incluir usuario cuando se actualiza un usuario
  // Esto es crítico para que la validación de unicidad funcione correctamente
  // Si username está definido (incluso si es cadena vacía), usarlo
  if (frontendUser.username !== undefined && frontendUser.username !== null) {
    backendData.usuario = (frontendUser.username || '').trim()
  } 
  // Si no hay username pero hay email, generar desde email
  else if (frontendUser.email !== undefined) {
    backendData.usuario = (frontendUser.email?.split('@')[0] || '').trim()
  }
  // Si username es null o undefined, usar cadena vacía para que el backend pueda validar
  else {
    backendData.usuario = ''
  }
  
  if (frontendUser.company !== undefined) {
    backendData.empresa = frontendUser.company || ''
  }

  // Foto de perfil (data URL/base64 o URL)
  if (frontendUser.photoUrl !== undefined) {
    backendData.photoUrl = frontendUser.photoUrl || ''
  }
  
  if (frontendUser.isActive !== undefined) {
    backendData.isActive = frontendUser.isActive
  }
  
  // Incluir profileIds si está definido
  if (frontendUser.profileIds !== undefined) {
    backendData.profileIds = frontendUser.profileIds
  }
  
  // Incluir customPermissions si está definido (aunque no se guarde todavía en el backend)
  if (frontendUser.customPermissions !== undefined) {
    backendData.customPermissions = frontendUser.customPermissions
  }
  
  return backendData
}
