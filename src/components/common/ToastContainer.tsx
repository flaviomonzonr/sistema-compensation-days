import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} className="toast-icon" />;
      case 'error':
        return <AlertCircle size={20} className="toast-icon" />;
      case 'warning':
        return <AlertTriangle size={20} className="toast-icon" />;
      default:
        return <Info size={20} className="toast-icon" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          {getIcon(t.type)}
          <div className="toast-content">
            {t.title && <div className="toast-title">{t.title}</div>}
            <div className="toast-message">{t.message}</div>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(t.id)}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
