// src/pages/ResetPassword.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PasswordService } from '../services/password.service';
import { Lock, Eye, EyeOff, Check, X, ArrowLeft, Shield } from 'lucide-react';
import Swal from 'sweetalert2';

export const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Logo - usar ruta directa
  const logoSrc = '/logo-FindControl/Logo_FindControl_Completo_Blanco_300.png';

  // Detectar y aplicar el tema del usuario al cargar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Si no hay tema guardado, detectar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    console.log('URL search params:', location.search);
    console.log('Token extraído:', token);
    if (token) {
      setResetToken(token);
    } else {
      setError('No se encontró el token de restablecimiento en la URL.');
    }
  }, [location.search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    console.log('resetToken en handleSubmit:', resetToken);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!resetToken) {
      setError('Token de restablecimiento no disponible.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await PasswordService.resetPasswordConfirm(resetToken, newPassword);
      
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: response.message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#2c92e6',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/login');
        }
      });
    } catch (err: any) {
      console.error('Error al restablecer la contraseña:', err);
      setError(err.message || 'Ocurrió un error inesperado al restablecer la contraseña.');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Ocurrió un error inesperado al restablecer la contraseña.',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#2c92e6',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
  const strengthClasses = ['', 'strength--weak', 'strength--weak', 'strength--medium', 'strength--strong', 'strength--very-strong'];

  return (
    <div className="reset-password-page">
      {/* Panel izquierdo - Branding */}
      <div className="reset-password-branding">
        <div className="reset-password-branding__shapes">
          <div className="reset-password-branding__shape"></div>
          <div className="reset-password-branding__shape"></div>
          <div className="reset-password-branding__shape"></div>
          <div className="reset-password-branding__shape"></div>
          <div className="reset-password-branding__shape"></div>
        </div>
        <div className="reset-password-branding__lines">
          <div className="reset-password-branding__line"></div>
          <div className="reset-password-branding__line"></div>
          <div className="reset-password-branding__line"></div>
        </div>
        <div className="reset-password-branding__content">
          <img
            src={logoSrc}
            alt="FindControl"
            className="reset-password-branding__logo"
          />
          <p className="reset-password-branding__tagline">Sistema de Control de Accesos</p>
          <div className="reset-password-branding__features">
            <div className="reset-password-branding__feature">
              <span className="reset-password-branding__feature-icon">
                <Shield size={12} />
              </span>
              Restablecimiento seguro
            </div>
            <div className="reset-password-branding__feature">
              <span className="reset-password-branding__feature-icon">
                <Lock size={12} />
              </span>
              Protección de datos
            </div>
            <div className="reset-password-branding__feature">
              <span className="reset-password-branding__feature-icon">
                <Check size={12} />
              </span>
              Acceso inmediato
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="reset-password-form-panel">
        <div className="reset-password-form-container">
          {/* Logo móvil */}
          <img
            src={logoSrc}
            alt="FindControl"
            className="reset-password-header__logo"
          />

          <div className="reset-password-header">
            <h1 className="reset-password-header__title">Restablecer Contraseña</h1>
            <p className="reset-password-header__subtitle">
              Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="reset-password-form">
            {/* Campo Nueva Contraseña */}
            <div className="reset-password-form__group">
              <div className="reset-password-form__input-wrapper">
                <Lock size={18} className="reset-password-form__input-icon" />
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="reset-password-form__input"
                  placeholder=" "
                  required
                />
                <label htmlFor="new-password" className="reset-password-form__label">
                  Nueva Contraseña
                </label>
                <span className="reset-password-form__input-line"></span>
                <button
                  type="button"
                  className="reset-password-form__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicador de fortaleza */}
              {newPassword && (
                <div className="reset-password-form__strength">
                  <div className="reset-password-form__strength-bars">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`reset-password-form__strength-bar ${passwordStrength >= level ? strengthClasses[passwordStrength] : ''}`}
                      />
                    ))}
                  </div>
                  <span className={`reset-password-form__strength-label ${strengthClasses[passwordStrength]}`}>
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            {/* Campo Confirmar Contraseña */}
            <div className="reset-password-form__group">
              <div className="reset-password-form__input-wrapper">
                <Lock size={18} className="reset-password-form__input-icon" />
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`reset-password-form__input ${
                    confirmPassword && newPassword !== confirmPassword ? 'input--error' : ''
                  } ${confirmPassword && newPassword === confirmPassword ? 'input--success' : ''}`}
                  placeholder=" "
                  required
                />
                <label htmlFor="confirm-password" className="reset-password-form__label">
                  Confirmar Contraseña
                </label>
                <span className="reset-password-form__input-line"></span>
                <button
                  type="button"
                  className="reset-password-form__toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicador de coincidencia */}
              {confirmPassword && newPassword === confirmPassword && (
                <span className="reset-password-form__match reset-password-form__match--success">
                  <Check size={14} />
                  Las contraseñas coinciden
                </span>
              )}
              {confirmPassword && newPassword !== confirmPassword && (
                <span className="reset-password-form__match reset-password-form__match--error">
                  <X size={14} />
                  Las contraseñas no coinciden
                </span>
              )}
            </div>

            {/* Mensajes de error/éxito */}
            {message && (
              <p className="reset-password-form__message reset-password-form__message--success">
                {message}
              </p>
            )}
            {error && (
              <p className="reset-password-form__message reset-password-form__message--error">
                {error}
              </p>
            )}

            {/* Botón Submit */}
            <button 
              type="submit" 
              className="reset-password-form__submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="reset-password-form__spinner"></span>
                  Procesando...
                </>
              ) : (
                'Restablecer Contraseña'
              )}
            </button>

            {/* Link volver */}
            <a href="/login" className="reset-password-form__back-link">
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </a>
          </form>
        </div>
      </div>
    </div>
  );
};