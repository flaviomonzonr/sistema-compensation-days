import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  email: string;
  nombre: string;
  cargo: string;
  rol: 'ADMIN';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  failedAttempts: number;
  lockoutRemainingSeconds: number;
  login: (email: string, pass: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AUTH_SALT = 'adpmodul_salt_2026_rrhh_secure';
const AUTHORIZED_EMAIL = 'flaviomonzon@adp.com';
// Hash SHA-256 con salt de la contraseña autorizada:
const AUTHORIZED_HASH = 'fd907b8ef3b41b3cffe428b64bd57c4df804c750a2bd367c8f158cd94b975a56';

const STORAGE_KEYS = {
  SESSION: 'adp_auth_session_v1',
  LOCKOUT: 'adp_auth_lockout_v1',
  ATTEMPTS: 'adp_auth_failed_attempts_v1'
} as const;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 segundos de bloqueo

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función criptográfica nativa (Web Crypto API SHA-256)
async function computeHash(salt: string, text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${text}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  // Inicializar estado de sesión y de bloqueo
  useEffect(() => {
    // 1. Verificar bloqueo por fuerza bruta
    const checkLockout = () => {
      try {
        const lockoutUntilStr = localStorage.getItem(STORAGE_KEYS.LOCKOUT);
        if (lockoutUntilStr) {
          const lockoutUntil = parseInt(lockoutUntilStr, 10);
          const now = Date.now();
          if (lockoutUntil > now) {
            setLockoutRemainingSeconds(Math.ceil((lockoutUntil - now) / 1000));
          } else {
            localStorage.removeItem(STORAGE_KEYS.LOCKOUT);
            localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
            setLockoutRemainingSeconds(0);
            setFailedAttempts(0);
          }
        }

        const storedAttempts = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
        if (storedAttempts) {
          setFailedAttempts(parseInt(storedAttempts, 10));
        }
      } catch (_) {}
    };

    checkLockout();

    // 2. Verificar sesión activa (en localStorage o sessionStorage)
    try {
      let rawSession = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      if (!rawSession) {
        rawSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      }

      if (rawSession) {
        const sessionData = JSON.parse(rawSession);
        const now = Date.now();
        if (sessionData.expiresAt && sessionData.expiresAt > now && sessionData.email === AUTHORIZED_EMAIL) {
          setUser({
            email: sessionData.email,
            nombre: sessionData.nombre || 'Flavio Monzón',
            cargo: sessionData.cargo || 'Jefe de Recursos Humanos',
            rol: 'ADMIN'
          });
        } else {
          // Sesión expirada
          sessionStorage.removeItem(STORAGE_KEYS.SESSION);
          localStorage.removeItem(STORAGE_KEYS.SESSION);
        }
      }
    } catch (e) {
      console.error('Error restaurando sesión:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Temporizador para la cuenta regresiva de bloqueo por fuerza bruta
  useEffect(() => {
    if (lockoutRemainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setLockoutRemainingSeconds((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem(STORAGE_KEYS.LOCKOUT);
            localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
            setFailedAttempts(0);
          } catch (_) {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemainingSeconds]);

  const login = useCallback(
    async (emailInput: string, passInput: string, rememberMe: boolean): Promise<{ success: boolean; error?: string }> => {
      // 1. Comprobar si está bloqueado por fuerza bruta
      if (lockoutRemainingSeconds > 0) {
        return {
          success: false,
          error: `Acceso bloqueado por intentos fallidos. Intente nuevamente en ${lockoutRemainingSeconds} segundos.`
        };
      }

      const cleanEmail = (emailInput || '').trim().toLowerCase();
      const cleanPass = passInput || '';

      if (!cleanEmail || !cleanPass) {
        return { success: false, error: 'Por favor complete todos los campos requeridos.' };
      }

      // Pequeña latencia para mitigar ataques de temporización (timing attacks)
      await new Promise((resolve) => setTimeout(resolve, 350));

      try {
        const computedHash = await computeHash(AUTH_SALT, cleanPass);

        // Validación estricta
        if (cleanEmail === AUTHORIZED_EMAIL && computedHash === AUTHORIZED_HASH) {
          // Éxito: limpiar contadores de error
          try {
            localStorage.removeItem(STORAGE_KEYS.LOCKOUT);
            localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
          } catch (_) {}
          setFailedAttempts(0);
          setLockoutRemainingSeconds(0);

          const durationMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
          const sessionPayload = {
            email: AUTHORIZED_EMAIL,
            nombre: 'Flavio Monzón',
            cargo: 'Jefe de Recursos Humanos',
            expiresAt: Date.now() + durationMs,
            signedAt: Date.now()
          };

          const serialized = JSON.stringify(sessionPayload);
          if (rememberMe) {
            localStorage.setItem(STORAGE_KEYS.SESSION, serialized);
          } else {
            sessionStorage.setItem(STORAGE_KEYS.SESSION, serialized);
          }

          const authUser: AuthUser = {
            email: AUTHORIZED_EMAIL,
            nombre: 'Flavio Monzón',
            cargo: 'Jefe de Recursos Humanos',
            rol: 'ADMIN'
          };

          setUser(authUser);
          return { success: true };
        } else {
          // Intento fallido: incrementar contador
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          try {
            localStorage.setItem(STORAGE_KEYS.ATTEMPTS, newAttempts.toString());
          } catch (_) {}

          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
            try {
              localStorage.setItem(STORAGE_KEYS.LOCKOUT, lockoutUntil.toString());
            } catch (_) {}
            setLockoutRemainingSeconds(60);
            return {
              success: false,
              error: 'Límite de intentos superado. Por seguridad, el sistema se ha bloqueado por 60 segundos.'
            };
          }

          const remainingAttempts = MAX_FAILED_ATTEMPTS - newAttempts;
          return {
            success: false,
            error: `Credenciales incorrectas. Te quedan ${remainingAttempts} intento(s) antes del bloqueo de seguridad.`
          };
        }
      } catch (err: any) {
        console.error('Error al procesar autenticación:', err);
        return { success: false, error: 'Ocurrió un error inesperado al validar credenciales.' };
      }
    },
    [failedAttempts, lockoutRemainingSeconds]
  );

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (_) {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        failedAttempts,
        lockoutRemainingSeconds,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
