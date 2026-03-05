import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminContext } from '../context/AdminContext'

interface ProtectedRouteProps {
  /** Al menos uno de estos permisos es necesario para acceder */
  permissions: string[]
  /** Ruta a la que redirigir si no tiene acceso (default: /inicio) */
  redirectTo?: string
  children: React.ReactNode
}

/**
 * Protege una ruta verificando que el usuario tenga al menos uno
 * de los permisos requeridos. Si no tiene acceso, redirige.
 *
 * Uso en App.tsx:
 *   <Route path="campaigns" element={
 *     <ProtectedRoute permissions={['view_campaigns','add_campaigns',...]}>
 *       <CampaignsView />
 *     </ProtectedRoute>
 *   } />
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permissions,
  redirectTo = '/inicio',
  children,
}) => {
  const { isAdmin, hasPermission } = useAdminContext()

  const hasAccess = isAdmin || permissions.some((p) => hasPermission(p))

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}