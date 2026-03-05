import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminSystem } from './pages/AdminSystem'
import { SettingsPage } from './pages/SettingsPage'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { SpeechAnalyticsView } from './pages/SpeechAnalyticsView'
import { CampaignsView } from './pages/CampaignsView'
import { ReportsView } from './pages/ReportsView'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminSystem />}>
        <Route index element={<Navigate to="inicio" replace />} />
        <Route path="inicio" element={<Dashboard />} />

        {/* Speech Analytics — requiere view_analytics */}
        <Route path="speech-analytics" element={
          <ProtectedRoute permissions={['view_analytics']}>
            <SpeechAnalyticsView />
          </ProtectedRoute>
        } />

        {/* Campañas — requiere algún permiso de campañas */}
        <Route path="campaigns" element={
          <ProtectedRoute permissions={['view_campaigns', 'add_campaigns', 'update_campaigns', 'delete_campaigns']}>
            <CampaignsView />
          </ProtectedRoute>
        } />

        {/* Reportes — requiere algún permiso de campañas */}
        <Route path="reports" element={
          <ProtectedRoute permissions={['view_campaigns', 'add_campaigns', 'update_campaigns', 'delete_campaigns', 'view_reports']}>
            <ReportsView />
          </ProtectedRoute>
        } />

        {/* Configuraciones — requiere algún permiso de gestión */}
        <Route path="settings/*" element={
          <ProtectedRoute permissions={[
            'add_profiles', 'update_profiles', 'delete_profiles',
            'view_users', 'add_users', 'update_users', 'delete_users',
            'add_permissions', 'update_permissions', 'delete_permissions', 'manage_permissions',
          ]}>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App