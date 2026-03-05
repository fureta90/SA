export interface User {
  id: number
  username: string
  password: string
  name: string
  lastName: string
  email: string
  company: string
  photoUrl: string
  profileIds: string[]
  // Resumen de roles que puede venir desde /profile (útil si el usuario no puede listar /roles)
  roles?: Array<{ id: string; name: string }>
  // Permisos efectivos del usuario que pueden venir desde /profile (IDs GUID)
  permissionIds?: string[]
  customPermissions: {
    added: string[]
    removed: string[]
  }
  isAdmin?: boolean
}

export interface Profile {
  id: string
  name: string
  permissions: string[]
}

export interface Permission {
  id: string
  name: string
  code: string
}

export interface ApiError {
  message: string
  statusCode: number
}
