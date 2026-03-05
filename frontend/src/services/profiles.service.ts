import api from './api'
import type { Profile } from '../types'
import type { Role } from './roles.service'
import { rolesService } from './roles.service'

export interface CreateProfileDto {
  name: string
  permissions: string[]
}

export interface UpdateProfileDto extends Partial<CreateProfileDto> {
  id: string
}

/**
 * Servicio de perfiles que trabaja con la tabla de roles en la base de datos
 * Los perfiles en el frontend corresponden a los roles en la base de datos
 */
export const profilesService = {
  /**
   * Obtener todos los perfiles (roles desde la base de datos)
   */
  async getAll(): Promise<Profile[]> {
    const roles = await rolesService.getAll()
    // Convertir roles a perfiles con sus permisos
    const profiles = await Promise.all(
      roles.map(async (role) => {
        const roleWithPerms = await rolesService.getRoleWithPermissions(role.id)
        return {
          id: role.id,
          name: role.name,
          permissions: roleWithPerms.permissions?.map((p: any) => p.id) || [],
        } as Profile
      })
    )
    return profiles
  },

  /**
   * Obtener un perfil por ID (rol desde la base de datos)
   */
  async getById(id: string): Promise<Profile> {
    const role = await rolesService.getRoleWithPermissions(id)
    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions?.map((p: any) => p.id) || [],
    } as Profile
  },

  /**
   * Crear un nuevo perfil (rol en la base de datos)
   */
  async create(profileData: CreateProfileDto): Promise<Profile> {
    const response = await api.post<Role>('/roles', {
      name: profileData.name,
      permissions: profileData.permissions,
    })
    const role = response.data
    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions?.map((p: any) => p.id) || profileData.permissions,
    } as Profile
  },

  /**
   * Actualizar un perfil (rol en la base de datos)
   */
  async update(id: string, profileData: Partial<CreateProfileDto>): Promise<Profile> {
    const response = await api.patch<Role>(`/roles/${id}`, {
      name: profileData.name,
      permissions: profileData.permissions,
    })
    const role = response.data
    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions?.map((p: any) => p.id) || profileData.permissions || [],
    } as Profile
  },

  /**
   * Eliminar un perfil (rol en la base de datos)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`)
  },
}
