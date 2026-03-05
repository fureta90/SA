import api from './api'

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  access_token: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ access_token: string; user?: any }> {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token)
      // Obtener el perfil del usuario después del login
      try {
        const profileResponse = await api.get('/profile')
        return {
          access_token: response.data.access_token,
          user: profileResponse.data.user,
        }
      } catch (error) {
        // Si falla obtener el perfil, devolver solo el token
        return {
          access_token: response.data.access_token,
        }
      }
    }
    return { access_token: response.data.access_token }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token')
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  },

  getToken(): string | null {
    return localStorage.getItem('token')
  },

  
}

