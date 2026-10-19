import React, { useState } from 'react';
import {
  CalendarCheck,
  Calendar,
  Banknote,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { compensationService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { FormaCompensacion } from '../../types';

interface BulkCompensateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  employeeName?: string;
  onSuccess: () => void;
}

export const BulkCompensateModal: React.FC<BulkCompensateModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  employeeName,
  onSuccess
}) => {
  const { success, error, warning } = useToast();

  const [formaCompensacion, setFormaCompensacion] = useState<FormaCompensacion>('DESCANSO');
  const [fechaCompensacion, setFechaCompensacion] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [sinFechaFija, setSinFechaFija] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedIds.length === 0) {
      warning('No hay registros seleccionados para compensar.');
      return;
    }

    let finalFechaComp: string | null = null;
    if (formaCompensacion === 'DESCANSO') {
      if (!sinFechaFija) {
        if (!fechaCompensacion) {
          warning('Selecciona una fecha de compensación o marca la opción "Sin fecha fija".');
          return;
        }
        finalFechaComp = fechaCompensacion;
      }
    }

    setIsSubmitting(true);
    const res = compensationService.bulkMarkAsCompensated(selectedIds, {
      fechaCompensacion: finalFechaComp,
      formaCompensacion,
      observacion: observacion.trim()
    });
    setIsSubmitting(false);

    if (res.success) {
      success(
        `Se marcaron ${res.data?.updatedCount || selectedIds.length} día(s) como COMPENSADOS exitosamente.`,
        'Compensación Masiva Exitosa'
      );
      onSuccess();
      onClose();
    } else {
      error(res.error || 'Error al procesar compensación masiva.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarCheck size={20} style={{ color: '#16a34a' }} />
          <span>Compensar Días Seleccionados ({selectedIds.length})</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            icon={<CheckCircle2 size={16} />}
            disabled={isSubmitting || selectedIds.length === 0}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              borderColor: '#15803d'
            }}
          >
            {isSubmitting ? 'Procesando...' : `Confirmar Compensar (${selectedIds.length})`}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Info banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: '#166534'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <CalendarCheck size={16} />
            <span>
              Registrar {selectedIds.length} día(s) como <strong>COMPENSADO</strong>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#374151' }}>
            {employeeName ? (
              <>
                Trabajador: <strong>{employeeName}</strong>
              </>
            ) : (
              'Los días pendientes seleccionados pasarán al estado COMPENSADO según la modalidad elegida.'
            )}
          </p>
        </div>

        {/* Modalidad de compensación */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem' }}>
            Modalidad de Compensación:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {/* Opción 1: Descanso Físico */}
            <button
              type="button"
              onClick={() => setFormaCompensacion('DESCANSO')}
              style={{
                padding: '0.6rem 0.5rem',
                borderRadius: '8px',
                border: `2px solid ${formaCompensacion === 'DESCANSO' ? '#16a34a' : '#e2e8f0'}`,
                background: formaCompensacion === 'DESCANSO' ? '#f0fdf4' : '#ffffff',
                color: formaCompensacion === 'DESCANSO' ? '#166534' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
                fontSize: '0.75rem',
                transition: 'all 0.15s'
              }}
            >
              <Calendar size={18} style={{ color: formaCompensacion === 'DESCANSO' ? '#16a34a' : '#64748b' }} />
              <span>Día de Descanso</span>
            </button>

            {/* Opción 2: Pago en Remuneración */}
            <button
              type="button"
              onClick={() => setFormaCompensacion('REMUNERACION')}
              style={{
                padding: '0.6rem 0.5rem',
                borderRadius: '8px',
                border: `2px solid ${formaCompensacion === 'REMUNERACION' ? '#2563eb' : '#e2e8f0'}`,
                background: formaCompensacion === 'REMUNERACION' ? '#eff6ff' : '#ffffff',
                color: formaCompensacion === 'REMUNERACION' ? '#1e40af' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
                fontSize: '0.75rem',
                transition: 'all 0.15s'
              }}
            >
              <Banknote size={18} style={{ color: formaCompensacion === 'REMUNERACION' ? '#2563eb' : '#64748b' }} />
              <span>Pago en Remun.</span>
            </button>

            {/* Opción 3: Liquidación BB.SS. */}
            <button
              type="button"
              onClick={() => setFormaCompensacion('LIQUIDACION')}
              style={{
                padding: '0.6rem 0.5rem',
                borderRadius: '8px',
                border: `2px solid ${formaCompensacion === 'LIQUIDACION' ? '#0891b2' : '#e2e8f0'}`,
                background: formaCompensacion === 'LIQUIDACION' ? '#ecfeff' : '#ffffff',
                color: formaCompensacion === 'LIQUIDACION' ? '#0e7490' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
                fontSize: '0.75rem',
                transition: 'all 0.15s'
              }}
            >
              <FileText size={18} style={{ color: formaCompensacion === 'LIQUIDACION' ? '#0891b2' : '#64748b' }} />
              <span>Liquidación BB.SS.</span>
            </button>
          </div>
        </div>

        {/* Sección condicional para Fecha de Descanso */}
        {formaCompensacion === 'DESCANSO' ? (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Fecha en que se goza el descanso:
              </label>
              <input
                type="date"
                className="form-input"
                value={fechaCompensacion}
                disabled={sinFechaFija}
                onChange={(e) => setFechaCompensacion(e.target.value)}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  opacity: sinFechaFija ? 0.5 : 1
                }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: '#475569',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={sinFechaFija}
                onChange={(e) => setSinFechaFija(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <span>Registrar como compensado histórico / sin fecha fija asignada</span>
            </label>
          </div>
        ) : formaCompensacion === 'REMUNERACION' ? (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Banknote size={18} style={{ flexShrink: 0 }} />
            <span>
              Los {selectedIds.length} días seleccionados quedarán marcados como compensados por concepto de pago en boleta / planilla.
            </span>
          </div>
        ) : (
          <div
            style={{
              background: '#ecfeff',
              border: '1px solid #a5f3fc',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: '#0e7490',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FileText size={18} style={{ flexShrink: 0 }} />
            <span>
              Los {selectedIds.length} días seleccionados quedarán marcados como compensados por liquidación de beneficios sociales al cese.
            </span>
          </div>
        )}

        {/* Observación / Motivo */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Observación / Motivo (Opcional):
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Ej. Compensación en bloque, regularización mensual, etc."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={{ fontSize: '0.825rem' }}
          />
        </div>
      </form>
    </Modal>
  );
};
