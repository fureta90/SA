import { useState, useEffect } from 'react'
import { authService } from '../services/auth.service'
import type { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = authService.getToken()
    if (token) {
      // Aquí podrías hacer una llamada para obtener los datos del usuario
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (identifier: string, password: string) => {
    const response = await authService.login({ identifier, password });
    // Convertir el usuario del auth service al tipo User del sistema
    // Nota: Esto es un mapeo básico, ajusta según tus necesidades
    const adminUser: User = {
      id: parseInt(response.user.id) || 0,
      username: response.user.username || response.user.email.split('@')[0], // Usar username si está disponible
      password: '',
      name: response.user.name,
      lastName: '',
      email: response.user.email,
      company: '',
      photoUrl: '',
      profileIds: [],
      customPermissions: { added: [], removed: [] },
    }
    setUser(adminUser)
    return response
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  }
}
