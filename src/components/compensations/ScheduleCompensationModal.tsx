import React, { useState, useEffect } from 'react';
import { CalendarCheck, Save, Calendar, Banknote, FileText } from 'lucide-react';
import { Compensacion, ProgramarCompensacionDto, Empleado, FormaCompensacion } from '../../types';
import { compensationService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { formatDateDisplay } from '../../utils/dateUtils';

interface ScheduleCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Compensacion) => void;
  compensation: Compensacion | null;
  employee?: Empleado | null;
}

export const ScheduleCompensationModal: React.FC<ScheduleCompensationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  compensation,
  employee
}) => {
  const { success, error } = useToast();

  const [formaCompensacion, setFormaCompensacion] = useState<FormaCompensacion>('DESCANSO');
  const [fechaCompensacion, setFechaCompensacion] = useState('');
  const [observacion, setObservacion] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (compensation) {
      setFormaCompensacion(compensation.formaCompensacion || 'DESCANSO');
      setFechaCompensacion(compensation.fechaCompensacion || '');
      setObservacion(compensation.observacion || '');
      setErrorMessage('');
    }
  }, [compensation, isOpen]);

  if (!compensation) return null;

  const formatDate = (dateStr?: string | null) => formatDateDisplay(dateStr);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formaCompensacion === 'DESCANSO') {
      if (!fechaCompensacion) {
        setErrorMessage('Debe seleccionar la fecha en que será compensado.');
        return;
      }

      if (fechaCompensacion === compensation.fechaGenerada) {
        setErrorMessage(
          `El día generado trabajado (${formatDate(compensation.fechaGenerada)}) no puede ser igual a la fecha de compensación. Debe seleccionar una fecha de descanso diferente.`
        );
        return;
      }

      const employeeComps = compensationService.getByEmployee(compensation.empleadoId);
      const duplicate = employeeComps.find(
        (c) => c.id !== compensation.id && c.fechaCompensacion === fechaCompensacion && c.estado !== 'ANULADO'
      );
      if (duplicate) {
        setErrorMessage(
          `El trabajador ya tiene una compensación asignada para el ${formatDate(fechaCompensacion)} (${duplicate.estado}). No se pueden registrar dos compensaciones en la misma fecha para el mismo trabajador.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const dto: ProgramarCompensacionDto = {
      fechaCompensacion: formaCompensacion === 'DESCANSO' ? fechaCompensacion : null,
      formaCompensacion,
      observacion: observacion.trim()
    };

    const res = compensationService.scheduleCompensation(compensation.id, dto);
    setIsSubmitting(false);

    if (res.success && res.data) {
      if (formaCompensacion === 'REMUNERACION') {
        success(
          `Compensación registrada como Pago en Remuneración exitosamente.`,
          'Pago en Remuneración'
        );
      } else if (formaCompensacion === 'LIQUIDACION') {
        success(
          `Compensación registrada en Liquidación de Beneficios exitosamente.`,
          'Liquidación de Beneficios'
        );
      } else {
        success(
          `Compensación programada para el ${formatDate(fechaCompensacion)} exitosamente.`,
          'Compensación Programada'
        );
      }
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMessage(res.error || 'Error al procesar la compensación.');
      error(res.error || 'Error al procesar la compensación.');
    }
  };

  const isEditing = compensation.estado === 'PROGRAMADO';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarCheck size={22} style={{ color: '#2563eb' }} />
          <span>{isEditing ? 'Modificar Compensación' : 'Registrar Compensación de Día'}</span>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            icon={<Save size={16} />}
          >
            {formaCompensacion === 'REMUNERACION'
              ? 'Compensar por Remuneración'
              : formaCompensacion === 'LIQUIDACION'
              ? 'Compensar en Liquidación'
              : isEditing
              ? 'Actualizar Programación'
              : 'Registrar Compensación'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Info Box */}
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem'
          }}
        >
          {employee && (
            <div style={{ fontSize: '0.875rem', color: '#1e3a8a', fontWeight: 600 }}>
              Trabajador: <span style={{ color: '#0f172a' }}>{employee.apellidosNombres}</span>
            </div>
          )}
          <div style={{ fontSize: '0.925rem', color: '#1e3a8a' }}>
            <strong>Día trabajado / pendiente:</strong>{' '}
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1d4ed8' }}>
              {formatDate(compensation.fechaGenerada)}
            </span>
          </div>
          {compensation.observacion && (
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              <strong>Detalle de origen:</strong> {compensation.observacion}
            </div>
          )}
        </div>

        {/* Modalidad de Compensación */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.4rem' }}>
            Modalidad / Forma de Compensación:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${formaCompensacion === 'DESCANSO' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                textAlign: 'center',
                border: formaCompensacion === 'DESCANSO' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
              }}
              onClick={() => { setFormaCompensacion('DESCANSO'); setErrorMessage(''); }}
            >
              <Calendar size={16} />
              <span style={{ fontWeight: formaCompensacion === 'DESCANSO' ? 700 : 500 }}>Día de Descanso</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${formaCompensacion === 'REMUNERACION' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                textAlign: 'center',
                border: formaCompensacion === 'REMUNERACION' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
              }}
              onClick={() => { setFormaCompensacion('REMUNERACION'); setErrorMessage(''); }}
            >
              <Banknote size={16} />
              <span style={{ fontWeight: formaCompensacion === 'REMUNERACION' ? 700 : 500 }}>Pago en Remuneración</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${formaCompensacion === 'LIQUIDACION' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '0.6rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                textAlign: 'center',
                border: formaCompensacion === 'LIQUIDACION' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
              }}
              onClick={() => { setFormaCompensacion('LIQUIDACION'); setErrorMessage(''); }}
            >
              <FileText size={16} />
              <span style={{ fontWeight: formaCompensacion === 'LIQUIDACION' ? 700 : 500 }}>Liquidación BB.SS.</span>
            </button>
          </div>
        </div>

        {/* Dynamic input depending on modality */}
        {formaCompensacion === 'DESCANSO' ? (
          <Input
            type="date"
            label="Fecha en que será compensado (Día de descanso)"
            required
            value={fechaCompensacion}
            onChange={(e) => {
              const val = e.target.value;
              setFechaCompensacion(val);
              if (!val) {
                setErrorMessage('');
              } else if (val === compensation.fechaGenerada) {
                setErrorMessage(
                  `El día generado trabajado (${formatDate(compensation.fechaGenerada)}) no puede ser igual a la fecha de compensación.`
                );
              } else {
                const employeeComps = compensationService.getByEmployee(compensation.empleadoId);
                const duplicate = employeeComps.find(
                  (c) => c.id !== compensation.id && c.fechaCompensacion === val && c.estado !== 'ANULADO'
                );
                if (duplicate) {
                  setErrorMessage(
                    `El trabajador ya tiene una compensación asignada para el ${formatDate(val)} (${duplicate.estado}).`
                  );
                } else {
                  setErrorMessage('');
                }
              }
            }}
            error={errorMessage}
            helper="El registro pasará al estado PROGRAMADO y quedará listo para ejecutarse."
          />
        ) : formaCompensacion === 'REMUNERACION' ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#166534' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Banknote size={15} /> Compensación por Pago en su Remuneración
            </div>
            <p style={{ margin: 0, color: '#374151' }}>
              Este día de compensación se pagará en la planilla / remuneración del trabajador. Es <strong>descriptivo</strong>: no se ingresan montos ni se coloca fecha de descanso. Al guardar, quedará registrado como <strong>COMPENSADO</strong>.
            </p>
          </div>
        ) : (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#0369a1' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={15} /> Compensación en Liquidación de Beneficios Sociales
            </div>
            <p style={{ margin: 0, color: '#374151' }}>
              Este día pendiente se cancelará en la liquidación de beneficios sociales por cese del trabajador. Es <strong>descriptivo</strong>: no se coloca fecha de descanso. Al guardar, quedará registrado como <strong>COMPENSADO</strong>.
            </p>
          </div>
        )}

        {/* Observación Input */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Observación / Detalle descriptivo <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder={
              formaCompensacion === 'REMUNERACION'
                ? 'Ej. Incluido en boleta de pago / planilla del mes de agosto...'
                : formaCompensacion === 'LIQUIDACION'
                ? 'Ej. Reconocido en liquidación de beneficios sociales por cese...'
                : 'Ej. Compensará turno coordinado con supervisión...'
            }
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
