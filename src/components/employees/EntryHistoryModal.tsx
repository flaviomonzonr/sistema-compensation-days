import React, { useState } from 'react';
import { Calendar, PlusCircle, CheckCircle2, History } from 'lucide-react';
import { Empleado } from '../../types';
import { employeeService } from '../../services';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { formatDateDisplay } from '../../utils/dateUtils';

interface EntryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Empleado | null;
}

export const EntryHistoryModal: React.FC<EntryHistoryModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const { success, error } = useToast();
  const { triggerRefresh } = useApp();

  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reactivate, setReactivate] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  if (!employee) return null;

  // Lista de fechas de ingreso ordenada cronológicamente
  const rawDates = employee.fechasIngreso && employee.fechasIngreso.length > 0
    ? employee.fechasIngreso
    : [employee.fechaIngreso];

  const dates = [...rawDates].sort((a, b) => a.localeCompare(b));
  const totalIngresos = dates.length;

  const handleAddReentry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      error('Por favor seleccione una fecha válida.');
      return;
    }

    if (dates.includes(newDate)) {
      error('Esta fecha de ingreso ya se encuentra registrada para este empleado.');
      return;
    }

    setIsSubmitting(true);
    const res = employeeService.addEntryDate(employee.id, newDate, reactivate);
    setIsSubmitting(false);

    if (res.success && res.data) {
      success(
        `Nueva fecha de reingreso (${formatDateDisplay(newDate)}) registrada. Total de ingresos: ${res.data.fechasIngreso?.length || 1}`,
        'Reingreso Registrado'
      );
      triggerRefresh();
      setShowAddForm(false);
      setNewDate(new Date().toISOString().split('T')[0]);
    } else {
      error(res.error || 'No se pudo registrar la nueva fecha de ingreso.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <History size={20} style={{ color: '#2563eb' }} />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Historial de Fechas de Ingreso
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              {employee.codigo} • {employee.apellidosNombres}
            </div>
          </div>
        </div>
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Ficha Resumen */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Trabajador</span>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{employee.apellidosNombres}</strong>
            <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginTop: '2px' }}>
              {employee.cargo} ({employee.area})
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: totalIngresos > 1 ? '#dbeafe' : '#f1f5f9',
                color: totalIngresos > 1 ? '#1e40af' : '#334155',
                border: totalIngresos > 1 ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              <Calendar size={13} />
              <span>{totalIngresos} {totalIngresos === 1 ? 'ingreso registrado' : 'ingresos registrados'}</span>
            </span>
          </div>
        </div>

        {/* Lista de Fechas de Ingreso */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>
            Línea cronológica de ingresos:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {dates.map((dateStr, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === dates.length - 1;

              return (
                <div
                  key={dateStr + '-' + idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: isLast ? '#eff6ff' : '#ffffff',
                    border: isLast ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: isLast ? '#2563eb' : '#94a3b8',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                        {formatDateDisplay(dateStr)}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Fecha de registro: {dateStr}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isLast && totalIngresos > 1 ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        ✓ Último / Vigente
                      </span>
                    ) : isFirst && totalIngresos > 1 ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        Ingreso Inicial
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        Ingreso #{idx + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección para agregar nuevo reingreso */}
        {!showAddForm ? (
          <div style={{ marginTop: '0.25rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              icon={<PlusCircle size={14} />}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              + Registrar Nueva Fecha de Reingreso
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleAddReentry}
            style={{
              marginTop: '0.25rem',
              padding: '0.85rem',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.825rem' }}>
              <PlusCircle size={15} />
              <span>Registrar Fecha de Reingreso</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Nueva Fecha de Ingreso:
              </label>
              <input
                type="date"
                className="form-input"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
              />
            </div>

            {employee.estado === 'CESADO' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.78rem',
                  color: '#166534',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={reactivate}
                  onChange={(e) => setReactivate(e.target.checked)}
                />
                <span>Reactivar automáticamente al trabajador (Estado = ACTIVO)</span>
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                icon={<CheckCircle2 size={14} />}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Reingreso'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
