import React, { useState, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { Empleado, CreateEmpleadoDto } from '../../types';
import { employeeService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (emp: Empleado) => void;
  employeeToEdit?: Empleado | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit
}) => {
  const { success, error } = useToast();

  const [codigo, setCodigo] = useState('');
  const [apellidosNombres, setApellidosNombres] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [fechaCese, setFechaCese] = useState('');
  const [tipoTrabajador, setTipoTrabajador] = useState('EMPLEADOS AGRÍCOLAS');
  const [categoria, setCategoria] = useState('');
  const [area, setArea] = useState('CALIDAD');
  const [cargo, setCargo] = useState('');
  const [estado, setEstado] = useState<'ACTIVO' | 'CESADO'>('ACTIVO');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employeeToEdit) {
      setCodigo(employeeToEdit.codigo);
      setApellidosNombres(employeeToEdit.apellidosNombres);
      setDocumentoIdentidad(employeeToEdit.documentoIdentidad);
      setFechaIngreso(employeeToEdit.fechaIngreso);
      setFechaCese(employeeToEdit.fechaCese || '');
      setTipoTrabajador(employeeToEdit.tipoTrabajador);
      setCategoria(employeeToEdit.categoria || '');
      setArea(employeeToEdit.area);
      setCargo(employeeToEdit.cargo);
      setEstado(employeeToEdit.estado);
    } else {
      // Valores iniciales por defecto para nuevo empleado
      setCodigo('');
      setApellidosNombres('');
      setDocumentoIdentidad('');
      setFechaIngreso(new Date().toISOString().split('T')[0]);
      setFechaCese('');
      setTipoTrabajador('EMPLEADOS AGRÍCOLAS');
      setCategoria('');
      setArea('CALIDAD');
      setCargo('');
      setEstado('ACTIVO');
    }
    setErrors({});
  }, [employeeToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const dto: CreateEmpleadoDto = {
      codigo: codigo.trim().toUpperCase(),
      apellidosNombres: apellidosNombres.trim().toUpperCase(),
      documentoIdentidad: documentoIdentidad.trim(),
      fechaIngreso,
      fechaCese: estado === 'CESADO' && fechaCese ? fechaCese : null,
      tipoTrabajador: tipoTrabajador.trim().toUpperCase(),
      categoria: categoria.trim().toUpperCase(),
      area: area.trim().toUpperCase(),
      cargo: cargo.trim().toUpperCase(),
      estado
    };

    if (employeeToEdit) {
      const res = employeeService.update(employeeToEdit.id, dto);
      setIsSubmitting(false);
      if (res.success && res.data) {
        success('Datos del empleado actualizados exitosamente.', 'Empleado Actualizado');
        onSuccess(res.data);
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        error(res.error || 'Error al actualizar empleado.');
      }
    } else {
      const res = employeeService.create(dto);
      setIsSubmitting(false);
      if (res.success && res.data) {
        success('Empleado registrado exitosamente.', 'Empleado Creado');
        onSuccess(res.data);
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        error(res.error || 'Error al registrar empleado.');
      }
    }
  };

  const tipoOptions = [
    { value: 'EMPLEADOS AGRÍCOLAS', label: 'Empleados Agrícolas' },
    { value: 'OBREROS AGRÍCOLAS', label: 'Obreros Agrícolas' },
    { value: 'EMPLEADO', label: 'Empleado' },
    { value: 'OBRERO', label: 'Obrero' },
    { value: 'PRACTICANTE', label: 'Practicante' },
    { value: 'CONTRATADO', label: 'Contratado' },
    { value: 'OTRO', label: 'Otro' }
  ];

  const areaOptions = [
    { value: 'CALIDAD', label: 'Calidad' },
    { value: 'PRODUCCIÓN', label: 'Producción' },
    { value: 'LOGÍSTICA', label: 'Logística' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
    { value: 'ADMINISTRACIÓN', label: 'Administración' },
    { value: 'VENTAS', label: 'Ventas' },
    { value: 'SISTEMAS / TI', label: 'Sistemas / TI' },
    { value: 'SEGURIDAD / HSE', label: 'Seguridad / HSE' }
  ];

  const estadoOptions = [
    { value: 'ACTIVO', label: 'ACTIVO' },
    { value: 'CESADO', label: 'CESADO' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <>
          <User size={20} style={{ color: '#2563eb' }} />
          <span>{employeeToEdit ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</span>
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
            {employeeToEdit ? 'Guardar Cambios' : 'Registrar Empleado'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid-2">
          <Input
            label="Código de Trabajador"
            required
            placeholder="Ej. 12345678 o EMP-001"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            error={errors.codigo}
            helper="Identificador único del empleado"
          />

          <Input
            label="Documento de Identidad (DNI)"
            required
            placeholder="Ej. 12345678"
            value={documentoIdentidad}
            onChange={(e) => setDocumentoIdentidad(e.target.value)}
            error={errors.documentoIdentidad}
            helper="DNI de 8 dígitos o documento único"
          />
        </div>

        <Input
          label="Apellidos y Nombres"
          required
          placeholder="Ej. PEREZ ROJAS JUAN CARLOS"
          value={apellidosNombres}
          onChange={(e) => setApellidosNombres(e.target.value)}
          error={errors.apellidosNombres}
          helper="Ingrese apellidos y nombres completos en mayúsculas"
        />

        <div className="form-grid-2">
          <Input
            type="date"
            label="Fecha de Ingreso"
            required
            value={fechaIngreso}
            onChange={(e) => setFechaIngreso(e.target.value)}
            error={errors.fechaIngreso}
          />

          <Select
            label="Tipo de Trabajador"
            required
            value={tipoTrabajador}
            onChange={(e) => setTipoTrabajador(e.target.value)}
            options={tipoOptions}
            error={errors.tipoTrabajador}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="Categoría"
            placeholder="Ej. EMPLEADOS AGRÍCOLAS o STAFF"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            helper="Categoría laboral de la empresa (opcional)"
          />

          <Select
            label="Área de Trabajo"
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            options={areaOptions}
            error={errors.area}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="Cargo"
            required
            placeholder="Ej. JEFE DE ASEGURAMIENTO DE CALIDAD"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            error={errors.cargo}
          />

          <Select
            label="Estado"
            required
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'ACTIVO' | 'CESADO')}
            options={estadoOptions}
            error={errors.estado}
            helper={
              estado === 'CESADO'
                ? 'El empleado cesado se conservará en historial pero no generará nuevas compensaciones.'
                : undefined
            }
          />
        </div>

        {estado === 'CESADO' && (
          <div style={{ marginTop: '0.5rem' }}>
            <Input
              type="date"
              label="Fecha de Cese"
              value={fechaCese}
              onChange={(e) => setFechaCese(e.target.value)}
              error={errors.fechaCese}
              helper="Fecha en la que el trabajador fue cesado"
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
