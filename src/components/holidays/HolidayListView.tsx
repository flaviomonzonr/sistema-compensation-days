import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Edit2,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar
} from 'lucide-react';
import { Feriado } from '../../types';
import { holidayService } from '../../services';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ConfirmModal } from '../common/ConfirmModal';
import { HolidayFormModal } from './HolidayFormModal';

export const HolidayListView: React.FC = () => {
  const { refreshKey, triggerRefresh } = useApp();
  const { success, error } = useToast();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<Feriado | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Feriado | null>(null);

  const availableYears = useMemo(() => holidayService.getAvailableYears(), [refreshKey]);

  const holidays = useMemo(() => {
    return holidayService.getAll(selectedYear > 0 ? selectedYear : undefined);
  }, [selectedYear, refreshKey]);

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dayName = d.toLocaleDateString('es-PE', { weekday: 'long' });
      return {
        formatted: `${parts[2]}/${parts[1]}/${parts[0]}`,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1)
      };
    }
    return { formatted: dateStr, dayName: '' };
  };

  const handleOpenCreate = () => {
    setHolidayToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (h: Feriado) => {
    setHolidayToEdit(h);
    setIsFormModalOpen(true);
  };

  const handleToggleStatus = (h: Feriado) => {
    const res = holidayService.toggleStatus(h.id);
    if (res.success) {
      success(
        `Feriado ${h.descripcion} ahora está ${res.data?.estado}.`,
        'Estado Modificado'
      );
      triggerRefresh();
    } else {
      error(res.error || 'Error al cambiar estado.');
    }
  };

  const handlePromptDelete = (h: Feriado) => {
    setHolidayToDelete(h);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!holidayToDelete) return;
    const res = holidayService.delete(holidayToDelete.id);
    if (res.success) {
      success(`Feriado "${holidayToDelete.descripcion}" eliminado.`);
      triggerRefresh();
    } else {
      error(res.error || 'Error al eliminar feriado.');
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header Controls */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            Catálogo Oficial de Feriados
          </h2>
          <span style={{ fontSize: '0.775rem', color: '#64748b' }}>
            Feriados registrados: {holidays.length}
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          icon={<CalendarPlus size={15} />}
        >
          Registrar Feriado
        </Button>
      </div>

      {/* Filter by Year Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={15} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#0f172a' }}>
              Periodo / Año:
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                className={`btn btn-sm ${selectedYear === yr ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedYear(yr)}
              >
                Año {yr}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-sm ${selectedYear === 0 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedYear(0)}
            >
              Ver Todos
            </button>
          </div>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="table-wrapper">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Fecha</th>
                <th style={{ width: '130px' }}>Día</th>
                <th>Descripción / Festividad</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <CalendarDays className="empty-state-icon" />
                      <div className="empty-state-title">No hay feriados registrados para este año</div>
                      <div className="empty-state-desc">
                        Haga clic en "Registrar Feriado" para agregar uno nuevo a este periodo.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                holidays.map((h) => {
                  const dateInfo = formatDate(h.fecha);
                  return (
                    <tr key={h.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} style={{ color: '#2563eb' }} />
                          <strong style={{ color: '#0f172a', fontSize: '0.825rem' }}>
                            {dateInfo.formatted}
                          </strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#64748b', fontSize: '0.775rem' }}>
                          {dateInfo.dayName}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.825rem' }}>
                          {h.descripcion}
                        </span>
                      </td>
                      <td>
                        <Badge status={h.estado} />
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          {/* Toggle Active/Inactive */}
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              h.estado === 'ACTIVO' ? 'btn-secondary' : 'btn-ghost'
                            }`}
                            onClick={() => handleToggleStatus(h)}
                            title={
                              h.estado === 'ACTIVO'
                                ? 'Desactivar feriado'
                                : 'Activar feriado'
                            }
                            style={
                              h.estado === 'ACTIVO'
                                ? { color: '#059669' }
                                : { color: '#dc2626' }
                            }
                          >
                            {h.estado === 'ACTIVO' ? (
                              <>
                                <CheckCircle size={13} />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={13} />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(h)}
                            title="Editar feriado"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handlePromptDelete(h)}
                            title="Eliminar feriado"
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <HolidayFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        holidayToEdit={holidayToEdit}
        onSuccess={() => triggerRefresh()}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Feriado?"
        message={`¿Desea eliminar el feriado "${holidayToDelete?.descripcion}" (${holidayToDelete?.fecha})?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};
