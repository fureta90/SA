import React, { useState, FormEvent, useEffect } from 'react'
import { Eye, EyeOff, Check, X, User, Lock, Mail } from 'lucide-react'
import { PasswordService } from '../services/password.service'

interface LoginProps {
  onLogin: (username: string, password: string) => void
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  
  const baseUrl = import.meta.env.BASE_URL
  const lightLogo = `${baseUrl}logo-FindControl/Logo_FindControl_Completo_Color_300.png`
  const darkLogo = `${baseUrl}logo-FindControl/Logo_FindControl_Completo_Blanco_300.png`
  const [logoSrc, setLogoSrc] = useState(lightLogo)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const computeLogo = () => {
      const themeAttr =
        document.documentElement.getAttribute('data-theme') ||
        document.body.getAttribute('data-theme')
      setLogoSrc(themeAttr === 'dark' ? darkLogo : lightLogo)
    }

    computeLogo()

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          computeLogo()
          break
        }
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
    }

    return () => observer.disconnect()
  }, [darkLogo, lightLogo])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    onLogin(loginForm.username, loginForm.password)
  }

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setForgotPasswordMessage('')
    setForgotPasswordError('')
    try {
      const response = await PasswordService.forgotPassword(forgotPasswordEmail)
      setForgotPasswordMessage(response.message)
    } catch (error: any) {
      console.error('Error en la solicitud de recuperación de contraseña:', error)
      setForgotPasswordError(
        error.message || 'Ocurrió un error inesperado. Inténtelo de nuevo más tarde.'
      )
    }
  }

  const handleCloseModal = () => {
    setIsForgotPasswordModalOpen(false)
    setForgotPasswordEmail('')
    setForgotPasswordMessage('')
    setForgotPasswordError('')
  }

  return (
    <div className="login-page">
      {/* Panel izquierdo - Branding con animaciones */}
      <div className="login-branding">
        {/* Formas flotantes */}
        <div className="login-branding__shapes">
          <div className="login-branding__shape" />
          <div className="login-branding__shape" />
          <div className="login-branding__shape" />
          <div className="login-branding__shape" />
          <div className="login-branding__shape" />
        </div>

        {/* Líneas animadas */}
        <div className="login-branding__lines">
          <div className="login-branding__line" />
          <div className="login-branding__line" />
          <div className="login-branding__line" />
        </div>

        {/* Contenido */}
        <div className="login-branding__content">
          <img
            src={darkLogo}
            alt="FindControl"
            className="login-branding__logo"
          />
          <p className="login-branding__tagline">
            Soluciones inteligentes para tu negocio
          </p>

          <div className="login-branding__features">
            <div className="login-branding__feature">
              <span className="login-branding__feature-icon">
                <Check size={12} />
              </span>
              Envíos masivos de correos
            </div>
            <div className="login-branding__feature">
              <span className="login-branding__feature-icon">
                <Check size={12} />
              </span>
              Speech Analytics
            </div>
            <div className="login-branding__feature">
              <span className="login-branding__feature-icon">
                <Check size={12} />
              </span>
              Chatbot con IA
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="login-form-panel">
        <div className="login-form-container">
          {/* Header */}
          <div className="login-header">
            <img
              src={logoSrc}
              alt="FindControl"
              className="login-header__logo"
            />
            <h1 className="login-header__title">Bienvenido</h1>
            <p className="login-header__subtitle">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="login-form">
            {/* Campo Usuario */}
            <div className="login-form__group">
              <div className="login-form__input-wrapper">
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                  className="login-form__input"
                  placeholder="email"
                  required
                />
                <User size={18} className="login-form__input-icon" />
                <label htmlFor="login-identifier" className="login-form__label">
                  Usuario o Email
                </label>
                <span className="login-form__input-line" />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="login-form__group">
              <div className="login-form__input-wrapper">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="login-form__input"
                  placeholder="password"
                  required
                />
                <Lock size={18} className="login-form__input-icon" />
                <label htmlFor="login-password" className="login-form__label">
                  Contraseña
                </label>
                <span className="login-form__input-line" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-form__toggle-password"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordModalOpen(true)}
                className="login-form__forgot-link"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="login-form__submit">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>

      {/* Modal Recuperar Contraseña */}
      {isForgotPasswordModalOpen && (
        <div className="login-modal-overlay" onClick={handleCloseModal}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal__header">
              <h2 className="login-modal__title">Recuperar Contraseña</h2>
              <button
                type="button"
                className="login-modal__close"
                onClick={handleCloseModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleForgotPasswordSubmit} className="login-modal__form">
              <p className="login-modal__description">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              
              <div className="login-form__group">
                <div className="login-form__input-wrapper">
                  <input
                    id="forgot-password-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="login-form__input"
                    placeholder="email"
                    required
                  />
                  <Mail size={18} className="login-form__input-icon" />
                  <label htmlFor="forgot-password-email" className="login-form__label">
                    Email
                  </label>
                  <span className="login-form__input-line" />
                </div>
              </div>

              {forgotPasswordMessage && (
                <p className="login-modal__message--success">{forgotPasswordMessage}</p>
              )}
              
              {forgotPasswordError && (
                <p className="login-modal__message--error">{forgotPasswordError}</p>
              )}

              <button type="submit" className="login-form__submit">
                Enviar enlace
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}