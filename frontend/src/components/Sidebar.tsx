import React, { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Menu, Mic, Megaphone, BarChart2, X } from 'lucide-react'
import { useLang } from '../context/LangContext'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  hasPermission: (code: string) => boolean
  isAdmin?: boolean
}


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, hasPermission, isAdmin = false }) => {
  const { pathname } = useLocation()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { t } = useLang()
  const isDashboardActive = pathname === '/' || pathname.startsWith('/inicio')
  const isSpeechActive = pathname === '/' || pathname.startsWith('/speech')
  const isCampaignsActive = pathname === '/' || pathname.startsWith('/campaigns')
  const isReportsActive = pathname.startsWith('/reports')
  const isCollapsed = !isOpen

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onToggle()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onToggle])

  // Cerrar al hacer click fuera del sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onToggle()
      }
    }

    // Solo agregar listener si está abierto
    if (isOpen) {
      // Pequeño delay para evitar que se cierre inmediatamente al abrir
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onToggle])

  return (
    <div 
      ref={sidebarRef}
      className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}
    >
      <div className="sidebar__content">
        {/* Header con botón toggle */}
        <div className="sidebar__header">
          <button 
            className="sidebar__toggle-btn"
            onClick={onToggle}
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {!isCollapsed && <h1 className="sidebar__title"></h1>}
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {!isCollapsed && <span className="sidebar__section-label">Principal</span>}
          
          <Link
            to="/inicio"
            className={`sidebar__nav-item ${isDashboardActive ? 'sidebar__nav-item--active' : ''}`}
            data-tooltip={t.sidebar.home}
          >
            <LayoutDashboard size={20} className="sidebar__nav-icon" />
            {!isCollapsed && <span className="sidebar__nav-text">{t.sidebar.home}</span>}

            
          </Link>
          {(isAdmin || hasPermission('view_analytics') || hasPermission('ver_analytics') || hasPermission('ver analytics')) && (
            <>
              {!isCollapsed && <span className="sidebar__section-label">Servicios</span>}
              <Link
                  to="/speech-analytics"
                  className={`sidebar__nav-item ${isSpeechActive ? 'sidebar__nav-item--active' : ''}`}
                  data-tooltip={t.sidebar.speech}
                >
                  <Mic size={20} className="sidebar__nav-icon" />
                  {!isCollapsed && <span className="sidebar__nav-text">{t.sidebar.speech}</span>}
              </Link>
            
            </>
          )}

          {(isAdmin || hasPermission('view_campaigns') || hasPermission('add_campaigns') || hasPermission('update_campaigns') || hasPermission('delete_campaigns')) && (
            <>
              {!isCollapsed && <span className="sidebar__section-label">Configuraciones</span>}
              <Link
                to="/campaigns"
                className={`sidebar__nav-item ${isCampaignsActive ? 'sidebar__nav-item--active' : ''}`}
                data-tooltip={t.sidebar.campaigns}
              >
                <Megaphone size={20} className="sidebar__nav-icon" />
                {!isCollapsed && <span className="sidebar__nav-text">{t.sidebar.campaigns}</span>}
              </Link>
            </>
          )}

          {(isAdmin || hasPermission('view_reports') || hasPermission('view_campaigns') || hasPermission('add_campaigns') || hasPermission('update_campaigns') || hasPermission('delete_campaigns')) && (
            <>
              <Link
                to="/reports"
                className={`sidebar__nav-item ${isReportsActive ? 'sidebar__nav-item--active' : ''}`}
                data-tooltip={t.sidebar.reports}
              >
                <BarChart2 size={20} className="sidebar__nav-icon" />
                {!isCollapsed && <span className="sidebar__nav-text">{t.sidebar.reports}</span>}
              </Link>
            </>
          )}
         
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="sidebar__footer">
            <p className="sidebar__version">v1.0.0</p>
          </div>
        )}
      </div>
    </div>
  )
}