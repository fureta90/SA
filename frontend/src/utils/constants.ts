export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const
