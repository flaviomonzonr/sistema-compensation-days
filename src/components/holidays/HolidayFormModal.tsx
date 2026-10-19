import React, { useState, useEffect } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { Feriado, CreateFeriadoDto, EstadoFeriado } from '../../types';
import { holidayService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

interface HolidayFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (holiday: Feriado) => void;
  holidayToEdit?: Feriado | null;
}

export const HolidayFormModal: React.FC<HolidayFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  holidayToEdit
}) => {
  const { success, error } = useToast();

  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<EstadoFeriado>('ACTIVO');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (holidayToEdit) {
      setFecha(holidayToEdit.fecha);
      setDescripcion(holidayToEdit.descripcion);
      setEstado(holidayToEdit.estado);
    } else {
      const today = new Date();
      const currentYear = today.getFullYear();
      setFecha(`${currentYear}-01-01`);
      setDescripcion('');
      setEstado('ACTIVO');
    }
    setErrors({});
  }, [holidayToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const dto: CreateFeriadoDto = {
      fecha,
      descripcion: descripcion.trim(),
      estado
    };

    if (holidayToEdit) {
      const res = holidayService.update(holidayToEdit.id, dto);
      setIsSubmitting(false);
      if (res.success && res.data) {
        success('Feriado actualizado correctamente.', 'Feriado Actualizado');
        onSuccess(res.data);
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        error(res.error || 'Error al actualizar feriado.');
      }
    } else {
      const res = holidayService.create(dto);
      setIsSubmitting(false);
      if (res.success && res.data) {
        success('Feriado registrado exitosamente.', 'Feriado Creado');
        onSuccess(res.data);
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        error(res.error || 'Error al registrar feriado.');
      }
    }
  };

  const estadoOptions = [
    { value: 'ACTIVO', label: 'ACTIVO' },
    { value: 'INACTIVO', label: 'INACTIVO' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <CalendarDays size={20} style={{ color: '#2563eb' }} />
          <span>{holidayToEdit ? 'Editar Feriado' : 'Registrar Nuevo Feriado'}</span>
        </>
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
            {holidayToEdit ? 'Guardar Cambios' : 'Registrar Feriado'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Input
          type="date"
          label="Fecha del Feriado"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          error={errors.fecha}
          helper="No se permite registrar dos veces la misma fecha"
        />

        <Input
          label="Descripción / Festividad"
          required
          placeholder="Ej. Día del Trabajo"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          error={errors.descripcion}
        />

        <Select
          label="Estado"
          required
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoFeriado)}
          options={estadoOptions}
          error={errors.estado}
        />
      </form>
    </Modal>
  );
};
