import api from './api'
import type { User } from '../types'

export interface CreateUserDto {
  username: string
  password: string
  name: string
  lastName: string
  email: string
  company: string
  photoUrl?: string
  // IDs de roles/perfiles (GUID que vienen del backend)
  profileIds: string[]
  customPermissions?: {
    added: string[]
    removed: string[]
  }
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  id: number
}

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users')
    return response.data
  },

  async getById(id: number): Promise<User> {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  },

  async create(userData: CreateUserDto): Promise<any> {
    // Mapear al formato del backend
    const backendData = {
      email: userData.email,
      password: userData.password,
      firstName: userData.name,
      lastName: userData.lastName,
      usuario: userData.username || userData.email?.split('@')[0] || '',
      empresa: userData.company || '',
      photoUrl: userData.photoUrl,
      isActive: true,
      // Enviar perfiles seleccionados (roles) al backend
      profileIds: userData.profileIds,
    }
    const response = await api.post<any>('/users', backendData)
    return response.data
  },

  async update(id: string, userData: Partial<CreateUserDto> | any): Promise<any> {
    // Mapear al formato del backend (puede venir ya mapeado desde AdminSystem o sin mapear)
    // Si ya viene mapeado (tiene firstName, usuario, empresa), usarlo directamente
    // Si no está mapeado (tiene name, username, company), mapearlo
    const backendData: any = {}
    
    // Verificar si los datos ya están mapeados al formato del backend
    const isAlreadyMapped = userData.firstName !== undefined || 
                           userData.usuario !== undefined || 
                           userData.empresa !== undefined
    
    if (isAlreadyMapped) {
      // Ya está mapeado al formato del backend - solo incluir campos válidos
      if (userData.email !== undefined) {
        backendData.email = userData.email
      }
      if (userData.password !== undefined && userData.password !== '') {
        backendData.password = userData.password
      }
      if (userData.firstName !== undefined) {
        backendData.firstName = userData.firstName
      }
      if (userData.lastName !== undefined) {
        backendData.lastName = userData.lastName
      }
      if (userData.usuario !== undefined) {
        backendData.usuario = (userData.usuario || '').trim()
      }
      if (userData.empresa !== undefined) {
        backendData.empresa = userData.empresa || ''
      }
      if (userData.photoUrl !== undefined) {
        backendData.photoUrl = userData.photoUrl || ''
      }
      if (userData.isActive !== undefined) {
        backendData.isActive = userData.isActive
      }
      if (userData.customPermissions !== undefined) {
        backendData.customPermissions = userData.customPermissions
      }
      // Mapear perfiles si ya vienen en formato backend
      if (userData.profileIds !== undefined) {
        backendData.profileIds = userData.profileIds
      }
    } else {
      // Necesita mapeo desde formato frontend
      if (userData.email !== undefined) {
        backendData.email = userData.email
      }
      if (userData.password !== undefined && userData.password !== '') {
        backendData.password = userData.password
      }
      if (userData.name !== undefined) {
        backendData.firstName = userData.name
      }
      if (userData.lastName !== undefined) {
        backendData.lastName = userData.lastName
      }
      // SIEMPRE incluir usuario cuando se actualiza
      // Esto es crítico para que la validación de unicidad funcione
      if (userData.username !== undefined) {
        // Si username está definido (incluso si es cadena vacía), usarlo
        backendData.usuario = (userData.username || '').trim()
      } else if (userData.email !== undefined) {
        // Si no hay username pero hay email, generar desde email
        backendData.usuario = (userData.email?.split('@')[0] || '').trim()
      }
      if (userData.company !== undefined) {
        backendData.empresa = userData.company || ''
      }
      if (userData.photoUrl !== undefined) {
        backendData.photoUrl = userData.photoUrl || ''
      }
      if (userData.isActive !== undefined) {
        backendData.isActive = userData.isActive
      }
      if (userData.customPermissions !== undefined) {
        backendData.customPermissions = userData.customPermissions
      }
      // Mapear perfiles si vienen desde el frontend
      if (userData.profileIds !== undefined) {
        backendData.profileIds = userData.profileIds
      }
    }

    // Mapear perfiles (roles) si vienen del frontend
    if (userData.profileIds !== undefined) {
      backendData.profileIds = userData.profileIds
    }
    // Asegurar que customPermissions viaje aunque ya esté mapeado
    if (userData.customPermissions !== undefined) {
      backendData.customPermissions = userData.customPermissions
    }
    
    // El backend usa PUT y el ID es string (UUID)
    const response = await api.put<any>(`/users/${id}`, backendData)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  },

  async searchByUsuario(query: string): Promise<User[]> {
    const response = await api.get<User[]>('/users/search/usuario', {
      params: { q: query },
    })
    return response.data
  },

  async searchByEmpresa(query: string): Promise<User[]> {
    const response = await api.get<User[]>('/users/search/empresa', {
      params: { q: query },
    })
    return response.data
  },
}
