import api from './api'

export interface Role {
  id: string
  name: string
  permissions?: Permission[]
}

export interface Permission {
  id: string
  name: string
  code: string
}

export const rolesService = {
  async getAll(): Promise<Role[]> {
    const response = await api.get<Role[]>('/roles')
    return response.data
  },

  async getById(id: string): Promise<Role> {
    const response = await api.get<Role>(`/roles/${id}`)
    return response.data
  },

  async getRoleWithPermissions(id: string): Promise<Role> {
    const response = await api.get<Role>(`/roles/${id}/permissions`)
    return response.data
  },
}
