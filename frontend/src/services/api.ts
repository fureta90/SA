import axios from 'axios'

// Obtener la URL base del API desde las variables de entorno o usar la por defecto
// En producción y desarrollo, usar ruta relativa para que todo funcione desde la misma URL
// Traefik se encarga de enrutar /api-backend al backend
const getApiBaseUrl = () => {
  // Si hay variable de entorno y es una URL absoluta (solo para desarrollo local sin proxy)
  if (import.meta.env.VITE_API_BASE_URL) {
    const url = import.meta.env.VITE_API_BASE_URL
    // Si es una URL absoluta (http:// o https://), usarla (solo para desarrollo local)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Si es una ruta relativa, usarla
    return url
  }
  // Por defecto, usar ruta relativa (funciona tanto en desarrollo como producción)
  // El proxy reverso (Traefik) se encargará de enrutar /api-backend al backend
  // Esto permite que todo funcione desde una sola URL: correos.findcontrol.info
  return '/api-backend'
}

const API_BASE_URL = getApiBaseUrl()

// Log para verificar la URL del API (solo en desarrollo)
if (!import.meta.env.PROD) {
  console.log('API Base URL:', API_BASE_URL)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirigir a login si no está autenticado
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api

