import React, { useState, useMemo } from 'react';
import { History, Calendar, FileText, CheckCircle2, Clock, CalendarCheck, Ban } from 'lucide-react';
import { Empleado, Compensacion } from '../../types';
import { compensationService } from '../../services';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatDateDisplay } from '../../utils/dateUtils';

interface EmployeeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Empleado | null;
}

export const EmployeeHistoryModal: React.FC<EmployeeHistoryModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [searchDate, setSearchDate] = useState<string>('');

  const compensations: Compensacion[] = useMemo(() => {
    if (!employee) return [];
    return compensationService.getByEmployee(employee.id, {
      estado: selectedEstado,
      year: selectedYear > 0 ? selectedYear : undefined,
      searchDate: searchDate
    });
  }, [employee, selectedEstado, selectedYear, searchDate, isOpen]);

  const summary = useMemo(() => {
    if (!employee) return { totalGenerados: 0, pendientes: 0, programados: 0, compensados: 0, anulados: 0 };
    return compensationService.getEmployeeSummary(employee.id);
  }, [employee, isOpen]);

  const availableYears = useMemo(() => {
    return compensationService.getAvailableYears();
  }, [isOpen]);

  if (!employee) return null;

  const formatDate = (dateStr?: string | null) => formatDateDisplay(dateStr);

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return <Clock size={16} style={{ color: '#d97706' }} />;
      case 'PROGRAMADO':
        return <CalendarCheck size={16} style={{ color: '#2563eb' }} />;
      case 'COMPENSADO':
        return <CheckCircle2 size={16} style={{ color: '#059669' }} />;
      case 'ANULADO':
        return <Ban size={16} style={{ color: '#64748b' }} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <History size={22} style={{ color: '#2563eb' }} />
          <div>
            <div>Historial de Compensaciones</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              {employee.codigo} - {employee.apellidosNombres} ({employee.tipoTrabajador}{employee.categoria ? ` · ${employee.categoria}` : ''} · {employee.area} / {employee.cargo})
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
      {/* Resumen Superior */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}
      >
        <div className="summary-chip" style={{ borderLeft: '3px solid #3b82f6', background: '#f8fafc' }}>
          <span className="summary-chip-label" style={{ color: '#64748b' }}>Total Generados</span>
          <span className="summary-chip-val" style={{ color: '#0f172a' }}>{summary.totalGenerados}</span>
        </div>
        <div className="summary-chip chip-pending" style={{ background: '#fffbeb' }}>
          <span className="summary-chip-label" style={{ color: '#b45309' }}>Pendientes</span>
          <span className="summary-chip-val" style={{ color: '#b45309' }}>{summary.pendientes}</span>
        </div>
        <div className="summary-chip chip-scheduled" style={{ background: '#eff6ff' }}>
          <span className="summary-chip-label" style={{ color: '#1d4ed8' }}>Programados</span>
          <span className="summary-chip-val" style={{ color: '#1d4ed8' }}>{summary.programados}</span>
        </div>
        <div className="summary-chip chip-compensated" style={{ background: '#ecfdf5' }}>
          <span className="summary-chip-label" style={{ color: '#047857' }}>Compensados</span>
          <span className="summary-chip-val" style={{ color: '#047857' }}>{summary.compensados}</span>
        </div>
        <div className="summary-chip chip-annulled" style={{ background: '#f1f5f9' }}>
          <span className="summary-chip-label" style={{ color: '#475569' }}>Anulados</span>
          <span className="summary-chip-val" style={{ color: '#475569' }}>{summary.anulados}</span>
        </div>
      </div>

      {/* Barra de Filtros del Historial */}
      <div className="filter-bar" style={{ padding: '0.45rem 0.65rem', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', width: '100%' }}>
          {/* Botones rápidos de Estado */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {['TODOS', 'PENDIENTE', 'PROGRAMADO', 'COMPENSADO', 'ANULADO'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${selectedEstado === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                onClick={() => setSelectedEstado(st)}
              >
                {st === 'TODOS' ? 'Todos' : st}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {/* Filtro por Año */}
            <select
              className="filter-select"
              style={{ fontSize: '0.75rem', padding: '0.25rem 1.25rem 0.25rem 0.5rem' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              <option value={0}>Todos los Años</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Año {yr}
                </option>
              ))}
            </select>

            {/* Búsqueda por Fecha */}
            <input
              type="text"
              placeholder="Buscar fecha..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="form-input"
              style={{ width: '140px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>
        </div>
      </div>

      {/* Lista / Timeline del Historial */}
      <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Día Generado (Trabajado)</th>
              <th>Estado</th>
              <th>Fecha de Compensación</th>
              <th>Observación / Detalle</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            {compensations.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                    <FileText className="empty-state-icon" />
                    <div className="empty-state-title">No hay registros con los filtros seleccionados</div>
                    <div className="empty-state-desc">Pruebe cambiando los filtros de estado o año.</div>
                  </div>
                </td>
              </tr>
            ) : (
              compensations.map((comp) => (
                <tr key={comp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} style={{ color: '#2563eb' }} />
                      <strong style={{ color: '#0f172a', fontSize: '0.825rem' }}>
                        {formatDate(comp.fechaGenerada)}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <Badge status={comp.estado} />
                  </td>
                  <td>
                    {comp.fechaCompensacion ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getStatusIcon(comp.estado)}
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {formatDate(comp.fechaCompensacion)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Sin compensar</span>
                    )}
                  </td>
                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {comp.observacion || '-'}
                    </div>
                    {comp.motivoAnulacion && (
                      <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '2px' }}>
                        <strong>Motivo Anulación:</strong> {comp.motivoAnulacion}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(comp.createdAt).toLocaleDateString('es-PE')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
