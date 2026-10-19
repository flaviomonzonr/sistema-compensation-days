import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/login.css';

export const LoginView: React.FC = () => {
  const { login, lockoutRemainingSeconds } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemainingSeconds > 0) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        setErrorMsg(res.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al intentar ingresar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = lockoutRemainingSeconds > 0;

  return (
    <div className="login-page-wrapper">
      <div className="login-bg-grid" />

      <div className="login-card">
        <div className="login-brand-header">
          <div className="login-brand-icon-wrapper">
            <ShieldCheck size={30} />
          </div>
          <h1 className="login-title">ADPmodul</h1>
          <p className="login-subtitle">Sistema de Control de Días de Compensación y Feriados</p>
        </div>

        {isLocked && (
          <div className="login-alert-lockout" style={{ marginBottom: '1.25rem' }}>
            <Clock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Acceso bloqueado por seguridad</strong>
              <div>
                Demasiados intentos fallidos. Intente nuevamente en <strong>{lockoutRemainingSeconds}s</strong>.
              </div>
            </div>
          </div>
        )}

        {errorMsg && !isLocked && (
          <div className="login-alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field-group">
            <label className="login-field-label" htmlFor="login-email">
              Correo Electrónico
            </label>
            <div className="login-input-container">
              <span className="login-input-icon">
                <Mail size={18} />
              </span>
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="usuario@adp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || isLocked}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field-group">
            <label className="login-field-label" htmlFor="login-password">
              Contraseña
            </label>
            <div className="login-input-container">
              <span className="login-input-icon">
                <Lock size={18} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || isLocked}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-pass-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-remember-row">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting || isLocked}
              />
              <span>Recordar sesión en este equipo</span>
            </label>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting || isLocked}
          >
            {isSubmitting ? (
              <span>Verificando credenciales...</span>
            ) : isLocked ? (
              <span>Bloqueado ({lockoutRemainingSeconds}s)</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer-security">
          <ShieldCheck size={14} color="#10b981" />
          <span>Acceso Restringido • RRHH • Sesión Cifrada</span>
        </div>
      </div>
    </div>
  );
};
