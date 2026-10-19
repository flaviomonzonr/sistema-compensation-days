import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, User, Calendar, Save, Sparkles, ChevronDown } from 'lucide-react';
import { Empleado, CreateCompensacionDto, Compensacion } from '../../types';
import { employeeService, holidayService, compensationService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { SearchBar } from '../common/SearchBar';
import { Badge } from '../common/Badge';

interface RegisterPendingDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newComp: Compensacion) => void;
  preselectedEmployee?: Empleado | null;
}

export const RegisterPendingDayModal: React.FC<RegisterPendingDayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedEmployee
}) => {
  const { success, error } = useToast();

  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [fechaGenerada, setFechaGenerada] = useState('');
  const [selectedHolidayId, setSelectedHolidayId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lista de feriados activos para sugerencia rápida
  const activeHolidays = useMemo(() => {
    return holidayService.getAll().filter((h) => h.estado === 'ACTIVO');
  }, [isOpen]);

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmployee(preselectedEmployee);
    } else {
      setSelectedEmployee(null);
    }
    setEmployeeSearch('');
    const today = new Date().toISOString().split('T')[0];
    setFechaGenerada(today);
    setSelectedHolidayId('');
    setObservacion('');
    setErrors({});
  }, [preselectedEmployee, isOpen]);

  const searchResults = useMemo(() => {
    if (!employeeSearch || employeeSearch.trim().length === 0) {
      return [];
    }
    return employeeService.searchQuick(employeeSearch);
  }, [employeeSearch]);

  const handleSelectHoliday = (holidayId: string) => {
    setSelectedHolidayId(holidayId);
    if (!holidayId) return;

    const found = activeHolidays.find((h) => h.id === holidayId);
    if (found) {
      setFechaGenerada(found.fecha);
      setObservacion(`Feriado: ${found.descripcion}`);
      setErrors({});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setErrors({ empleadoId: 'Debe seleccionar un trabajador.' });
      return;
    }
    if (!fechaGenerada) {
      setErrors({ fechaGenerada: 'Debe ingresar la fecha trabajada.' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const dto: CreateCompensacionDto = {
      empleadoId: selectedEmployee.id,
      fechaGenerada,
      observacion: observacion.trim()
    };

    const res = compensationService.registerPendingDay(dto);
    setIsSubmitting(false);

    if (res.success && res.data) {
      success(
        `Día trabajado (${fechaGenerada}) registrado exitosamente para ${selectedEmployee.apellidosNombres}.`,
        'Día Pendiente Generado'
      );
      onSuccess(res.data);
      onClose();
    } else {
      if (res.errors) setErrors(res.errors);
      error(res.error || 'Error al registrar el día de compensación.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={22} style={{ color: '#2563eb' }} />
          <span>Registrar Día Trabajado / Generar Compensación</span>
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
            disabled={!selectedEmployee}
          >
            Registrar Día Pendiente
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Paso 1: Selección del Trabajador */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            1. Trabajador <span className="required-mark">*</span>
          </label>

          {selectedEmployee ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  <User size={18} />
                </div>
                <div>
                  <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.925rem' }}>
                    {selectedEmployee.apellidosNombres}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    DNI: {selectedEmployee.documentoIdentidad} | Área: {selectedEmployee.area}
                  </span>
                </div>
              </div>

              {!preselectedEmployee && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Cambiar
                </Button>
              )}
            </div>
          ) : (
            <div className="quick-search-box">
              <SearchBar
                value={employeeSearch}
                onChange={setEmployeeSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    e.preventDefault();
                    setSelectedEmployee(searchResults[0]);
                    setEmployeeSearch('');
                    setErrors({});
                  }
                }}
                placeholder="Buscar trabajador por DNI o Apellidos... (Enter para seleccionar)"
                autoFocus
              />

              {employeeSearch.trim().length > 0 && (
                <div className="search-results-popover">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="search-results-header">
                        <span>{searchResults.length} trabajador(es) encontrado(s)</span>
                        <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>[ENTER] para seleccionar</span>
                      </div>
                      {searchResults.map((emp) => (
                        <div
                          key={emp.id}
                          className="search-result-row"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch('');
                            setErrors({});
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0f172a' }}>{emp.apellidosNombres}</strong>
                            <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                              DNI: {emp.documentoIdentidad} | {emp.area} - {emp.cargo}
                            </div>
                          </div>
                          <Badge status={emp.estado} />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="search-result-empty">
                      No se encontraron trabajadores que coincidan con "<strong>{employeeSearch}</strong>".
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {errors.empleadoId && <span className="form-error">{errors.empleadoId}</span>}
        </div>

        {/* Paso 2: Fecha Trabajada */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <Input
            type="date"
            label="2. Fecha trabajada (que genera la compensación)"
            required
            value={fechaGenerada}
            onChange={(e) => {
              setFechaGenerada(e.target.value);
              setErrors({});
            }}
            error={errors.fechaGenerada}
            helper="1 día trabajado = 1 día pendiente (No duplicar misma fecha para el mismo colaborador)"
          />
        </div>

        {/* Feriados rápidos de sugerencia - Selector Desplegable */}
        {activeHolidays.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label
              htmlFor="holiday-select-autofill"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                marginBottom: '0.35rem'
              }}
            >
              <Sparkles size={13} style={{ color: '#2563eb' }} />
              ¿Fue en un día feriado? (Seleccione para autocompletar):
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', color: '#2563eb', pointerEvents: 'none' }} />
              <select
                id="holiday-select-autofill"
                className="form-input"
                value={selectedHolidayId}
                onChange={(e) => handleSelectHoliday(e.target.value)}
                style={{
                  paddingLeft: '2rem',
                  paddingRight: '2rem',
                  fontSize: '0.8125rem',
                  fontWeight: selectedHolidayId ? 700 : 500,
                  color: selectedHolidayId ? '#1d4ed8' : '#64748b',
                  background: selectedHolidayId ? '#eff6ff' : '#ffffff',
                  borderColor: selectedHolidayId ? '#93c5fd' : '#cbd5e1',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Seleccionar feriado del catálogo oficial (Opcional) --</option>
                {activeHolidays.map((h) => {
                  const parts = h.fecha.split('-');
                  const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : h.fecha;
                  return (
                    <option key={h.id} value={h.id}>
                      {formatted} — {h.descripcion}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', color: '#64748b', pointerEvents: 'none' }} />
            </div>
          </div>
        )}

        {/* Paso 3: Observación */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            3. Observación / Motivo <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Ej. Turno de guardia en feriado, apoyo en inventario extraordinario..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
