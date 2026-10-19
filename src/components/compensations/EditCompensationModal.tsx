import React, { useState, useEffect } from 'react';
import { Edit3, User, Save, Trash2, Calendar, Banknote, FileText } from 'lucide-react';
import { Compensacion, EstadoCompensacion, Empleado, FormaCompensacion } from '../../types';
import { compensationService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface EditCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  compensation: Compensacion | null;
  employee?: Empleado | null;
}

export const EditCompensationModal: React.FC<EditCompensationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  compensation,
  employee
}) => {
  const { success, error } = useToast();

  const [fechaGenerada, setFechaGenerada] = useState('');
  const [fechaCompensacion, setFechaCompensacion] = useState('');
  const [formaCompensacion, setFormaCompensacion] = useState<FormaCompensacion>('DESCANSO');
  const [estado, setEstado] = useState<EstadoCompensacion>('PENDIENTE');
  const [observacion, setObservacion] = useState('');
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (compensation) {
      setFechaGenerada(compensation.fechaGenerada || '');
      setFechaCompensacion(compensation.fechaCompensacion || '');
      setFormaCompensacion(compensation.formaCompensacion || 'DESCANSO');
      setEstado(compensation.estado || 'PENDIENTE');
      setObservacion(compensation.observacion || '');
      setMotivoAnulacion(compensation.motivoAnulacion || '');
      setErrors({});
    }
  }, [compensation, isOpen]);

  if (!compensation) return null;

  const handleEstadoChange = (newEstado: EstadoCompensacion) => {
    setEstado(newEstado);
    setErrors({});
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fechaGenerada) {
      setErrors({ fechaGenerada: 'La fecha trabajada es obligatoria.' });
      return;
    }

    if (estado === 'PROGRAMADO' && !fechaCompensacion.trim()) {
      setErrors({ fechaCompensacion: 'Un registro en estado PROGRAMADO debe tener fecha de compensación.' });
      return;
    }

    if (estado === 'ANULADO' && !motivoAnulacion.trim()) {
      setErrors({ motivoAnulacion: 'Debe ingresar un motivo de anulación.' });
      return;
    }

    const isPaidModality = estado === 'COMPENSADO' && (formaCompensacion === 'REMUNERACION' || formaCompensacion === 'LIQUIDACION');
    const trimCompDate = isPaidModality ? '' : (estado === 'PENDIENTE' ? '' : fechaCompensacion.trim());

    // Regla A: fechaGenerada != fechaCompensacion
    if (estado !== 'ANULADO' && trimCompDate && fechaGenerada === trimCompDate) {
      setErrors({
        fechaCompensacion: `El día generado trabajado (${fechaGenerada}) no puede ser igual a la fecha de compensación.`
      });
      return;
    }

    // Regla B: Unicidad de fecha de compensación por trabajador
    if (estado !== 'ANULADO' && trimCompDate) {
      const employeeComps = compensationService.getByEmployee(compensation.empleadoId);
      const duplicate = employeeComps.find(
        (c) => c.id !== compensation.id && c.fechaCompensacion === trimCompDate && c.estado !== 'ANULADO'
      );
      if (duplicate) {
        setErrors({
          fechaCompensacion: `El trabajador ya tiene una compensación asignada para el ${trimCompDate} (${duplicate.estado}). No puede haber 2 fechas de compensación iguales.`
        });
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    const res = compensationService.update(compensation.id, {
      fechaGenerada,
      fechaCompensacion: trimCompDate || null,
      estado,
      formaCompensacion: estado === 'COMPENSADO' ? formaCompensacion : 'DESCANSO',
      observacion: observacion.trim(),
      motivoAnulacion: estado === 'ANULADO' ? motivoAnulacion.trim() : null
    });

    setIsSubmitting(false);

    if (res.success) {
      success('Registro de compensación actualizado correctamente.', 'Cambios Guardados');
      onSuccess();
      onClose();
    } else {
      if (res.errors) {
        setErrors(res.errors);
      }
      error(res.error || 'Error al guardar los cambios de la compensación.');
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `¿Está seguro de eliminar permanentemente este registro de compensación (${compensation.fechaGenerada})?\nEsta acción no se puede deshacer.`
      )
    ) {
      const res = compensationService.delete(compensation.id);
      if (res.success) {
        success('Registro de compensación eliminado exitosamente.', 'Registro Eliminado');
        onSuccess();
        onClose();
      } else {
        error(res.error || 'Error al eliminar el registro.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Edit3 size={20} style={{ color: '#2563eb' }} />
          <span>Modificar y Gestionar Compensación</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isSubmitting}
            icon={<Trash2 size={14} />}
          >
            Eliminar Registro
          </Button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSubmitting}
              icon={<Save size={14} />}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Info del Trabajador */}
        {employee && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.6rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={16} />
            </div>
            <div>
              <strong style={{ color: '#0f172a', fontSize: '0.875rem', display: 'block' }}>
                {employee.apellidosNombres}
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                DNI: {employee.documentoIdentidad} | Área: {employee.area}
              </span>
            </div>
          </div>
        )}

        {/* 1. Día Generado (Trabajado) */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <Input
            type="date"
            label="1. Fecha trabajada (que generó la compensación)"
            required
            value={fechaGenerada}
            onChange={(e) => {
              setFechaGenerada(e.target.value);
              setErrors({});
            }}
            error={errors.fechaGenerada}
          />
        </div>

        {/* 2. Estado de la Compensación */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.775rem' }}>
            2. Estado de la Compensación <span className="required-mark">*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleEstadoChange('PENDIENTE')}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1.5px solid',
                borderColor: estado === 'PENDIENTE' ? '#d97706' : '#cbd5e1',
                background: estado === 'PENDIENTE' ? '#fffbeb' : '#ffffff',
                color: estado === 'PENDIENTE' ? '#92400e' : '#475569',
                fontWeight: estado === 'PENDIENTE' ? 800 : 500,
                fontSize: '0.775rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
              <span>PENDIENTE</span>
            </button>

            <button
              type="button"
              onClick={() => handleEstadoChange('PROGRAMADO')}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1.5px solid',
                borderColor: estado === 'PROGRAMADO' ? '#2563eb' : '#cbd5e1',
                background: estado === 'PROGRAMADO' ? '#eff6ff' : '#ffffff',
                color: estado === 'PROGRAMADO' ? '#1e40af' : '#475569',
                fontWeight: estado === 'PROGRAMADO' ? 800 : 500,
                fontSize: '0.775rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
              <span>PROGRAMADO</span>
            </button>

            <button
              type="button"
              onClick={() => handleEstadoChange('COMPENSADO')}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1.5px solid',
                borderColor: estado === 'COMPENSADO' ? '#059669' : '#cbd5e1',
                background: estado === 'COMPENSADO' ? '#f0fdf4' : '#ffffff',
                color: estado === 'COMPENSADO' ? '#166534' : '#475569',
                fontWeight: estado === 'COMPENSADO' ? 800 : 500,
                fontSize: '0.775rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              <span>COMPENSADO</span>
            </button>

            <button
              type="button"
              onClick={() => handleEstadoChange('ANULADO')}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1.5px solid',
                borderColor: estado === 'ANULADO' ? '#dc2626' : '#cbd5e1',
                background: estado === 'ANULADO' ? '#fef2f2' : '#ffffff',
                color: estado === 'ANULADO' ? '#991b1b' : '#475569',
                fontWeight: estado === 'ANULADO' ? 800 : 500,
                fontSize: '0.775rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              <span>ANULADO</span>
            </button>
          </div>
        </div>

        {/* Modalidad de Compensación (Visible cuando estado es COMPENSADO) */}
        {estado === 'COMPENSADO' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.775rem', marginBottom: '0.35rem' }}>
              Modalidad de Compensación:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${formaCompensacion === 'DESCANSO' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.5rem 0.3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.725rem',
                  textAlign: 'center',
                  border: formaCompensacion === 'DESCANSO' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
                }}
                onClick={() => {
                  setFormaCompensacion('DESCANSO');
                  setErrors({});
                }}
              >
                <Calendar size={14} />
                <span style={{ fontWeight: formaCompensacion === 'DESCANSO' ? 700 : 500 }}>Día Descanso</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${formaCompensacion === 'REMUNERACION' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.5rem 0.3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.725rem',
                  textAlign: 'center',
                  border: formaCompensacion === 'REMUNERACION' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
                }}
                onClick={() => {
                  setFormaCompensacion('REMUNERACION');
                  setErrors({});
                }}
              >
                <Banknote size={14} />
                <span style={{ fontWeight: formaCompensacion === 'REMUNERACION' ? 700 : 500 }}>En Remun.</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${formaCompensacion === 'LIQUIDACION' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.5rem 0.3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.725rem',
                  textAlign: 'center',
                  border: formaCompensacion === 'LIQUIDACION' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'
                }}
                onClick={() => {
                  setFormaCompensacion('LIQUIDACION');
                  setErrors({});
                }}
              >
                <FileText size={14} />
                <span style={{ fontWeight: formaCompensacion === 'LIQUIDACION' ? 700 : 500 }}>En Liquidac.</span>
              </button>
            </div>
          </div>
        )}

        {/* Mensaje descriptivo para Pago en Remuneración */}
        {estado === 'COMPENSADO' && formaCompensacion === 'REMUNERACION' && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: '#166534'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Banknote size={14} /> Compensado por Pago en Remuneración
            </div>
            <p style={{ margin: 0, color: '#374151' }}>
              Compensación descriptiva: se abona en la planilla de remuneraciones del trabajador. No requiere fecha ni montos.
            </p>
          </div>
        )}

        {/* Mensaje descriptivo para Liquidación de Beneficios */}
        {estado === 'COMPENSADO' && formaCompensacion === 'LIQUIDACION' && (
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: '#0369a1'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={14} /> Compensado en Liquidación de Beneficios
            </div>
            <p style={{ margin: 0, color: '#374151' }}>
              Compensación descriptiva: se cancela en la liquidación de beneficios sociales por cese. No requiere fecha ni montos.
            </p>
          </div>
        )}

        {/* 3. Fecha de Compensación (solo cuando no es REMUNERACION ni LIQUIDACION) */}
        {!(estado === 'COMPENSADO' && formaCompensacion !== 'DESCANSO') && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.775rem' }}>
                3. Fecha de Compensación / Descanso
              </label>
              {fechaCompensacion && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFechaCompensacion('')}
                  style={{ fontSize: '0.7rem', color: '#64748b', padding: '0 0.3rem', height: '20px' }}
                >
                  Limpiar fecha
                </button>
              )}
            </div>
            <input
              type="date"
              className="form-input"
              value={fechaCompensacion}
              onChange={(e) => {
                setFechaCompensacion(e.target.value);
                setErrors({});
              }}
            />
            {errors.fechaCompensacion && <span className="form-error">{errors.fechaCompensacion}</span>}
          </div>
        )}

        {/* 4. Observación */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.775rem' }}>
            4. Observación / Detalle
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Motivo del día trabajado, guardia, feriado o detalle del descanso..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>

        {/* 5. Motivo de Anulación (si está anulado) */}
        {estado === 'ANULADO' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.775rem', color: '#dc2626' }}>
              5. Motivo de Anulación <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              style={{ borderColor: '#fca5a5' }}
              placeholder="Indique la justificación de anulación..."
              value={motivoAnulacion}
              onChange={(e) => {
                setMotivoAnulacion(e.target.value);
                setErrors({});
              }}
            />
            {errors.motivoAnulacion && <span className="form-error">{errors.motivoAnulacion}</span>}
          </div>
        )}
      </form>
    </Modal>
  );
};
