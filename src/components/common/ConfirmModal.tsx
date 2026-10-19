import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Motivo de la anulación',
  reasonPlaceholder = 'Especifique el motivo...'
}) => {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setReasonError('Debe ingresar un motivo para continuar.');
      return;
    }
    setReasonError('');
    onConfirm(reason);
    setReason('');
    onClose();
  };

  const handleClose = () => {
    setReason('');
    setReasonError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: variant === 'danger' ? '#dc2626' : '#d97706' }}>
          <AlertTriangle size={22} />
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.5 }}>
          {message}
        </p>

        {requireReason && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              {reasonLabel} <span className="required-mark">*</span>
            </label>
            <textarea
              className={`form-textarea ${reasonError ? 'has-error' : ''}`}
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setReasonError('');
              }}
            />
            {reasonError && <span className="form-error">{reasonError}</span>}
          </div>
        )}
      </div>
    </Modal>
  );
};
