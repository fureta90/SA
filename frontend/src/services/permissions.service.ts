import api from './api'
import type { Permission } from '../types'

export interface CreatePermissionDto {
  name: string
  code: string
}

export interface UpdatePermissionDto extends Partial<CreatePermissionDto> {
  id: string
}

export const permissionsService = {
  async getAll(): Promise<Permission[]> {
    const response = await api.get<Permission[]>('/permissions')
    return response.data
  },

  async getById(id: string): Promise<Permission> {
    const response = await api.get<Permission>(`/permissions/${id}`)
    return response.data
  },

  async create(permissionData: CreatePermissionDto): Promise<Permission> {
    const response = await api.post<Permission>('/permissions', permissionData)
    return response.data
  },

  async update(id: string, permissionData: Partial<CreatePermissionDto>): Promise<Permission> {
    const response = await api.patch<Permission>(`/permissions/${id}`, permissionData)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/permissions/${id}`)
  },
}
