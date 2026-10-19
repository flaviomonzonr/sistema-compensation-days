import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../types';

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
      const newToast: ToastMessage = { id, message, type, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title: string = 'Operación Exitosa') => showToast(message, 'success', title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title: string = 'Atención') => showToast(message, 'error', title, 5000),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title: string = 'Advertencia') => showToast(message, 'warning', title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title: string = 'Información') => showToast(message, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, success, error, warning, info }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};
