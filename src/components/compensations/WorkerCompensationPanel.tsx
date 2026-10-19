import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  User,
  PlusCircle,
  CalendarCheck,
  CheckCircle2,
  Edit,
  Ban,
  Clock,
  Eye,
  Calendar,
  Trash2,
  FileSpreadsheet,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownUp,
  Filter,
  Banknote,
  FileText
} from 'lucide-react';
import { Empleado, Compensacion } from '../../types';
import { employeeService, compensationService } from '../../services';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchBar } from '../common/SearchBar';
import { ConfirmModal } from '../common/ConfirmModal';
import { ScheduleCompensationModal } from './ScheduleCompensationModal';
import { RegisterPendingDayModal } from './RegisterPendingDayModal';
import { EditCompensationModal } from './EditCompensationModal';
import { BulkCompensateModal } from './BulkCompensateModal';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatObservationForDisplay } from '../../utils/observationUtils';
import { exportWorkerCompensationsToExcel } from '../../utils/excelExport';

export const WorkerCompensationPanel: React.FC = () => {
  const {
    selectedEmployeeIdForCompensations,
    setSelectedEmployeeIdForCompensations,
    openPermissionSheetForEmployee,
    refreshKey,
    triggerRefresh
  } = useApp();
  const { success, error, warning } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [compensationToSchedule, setCompensationToSchedule] = useState<Compensacion | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [compensationToEdit, setCompensationToEdit] = useState<Compensacion | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [compensationToDelete, setCompensationToDelete] = useState<Compensacion | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkCompensateModalOpen, setIsBulkCompensateModalOpen] = useState(false);



  const [isRegisterDayModalOpen, setIsRegisterDayModalOpen] = useState(false);

  const [isMarkCompensatedConfirmOpen, setIsMarkCompensatedConfirmOpen] = useState(false);
  const [compensationToMarkCompensated, setCompensationToMarkCompensated] = useState<Compensacion | null>(null);

  const [isAnnulConfirmOpen, setIsAnnulConfirmOpen] = useState(false);
  const [compensationToAnnul, setCompensationToAnnul] = useState<Compensacion | null>(null);

  // Detail modal
  const [detailCompensation, setDetailCompensation] = useState<Compensacion | null>(null);

  // Load employee if preselected from context (e.g. from Dashboard or Employee List)
  useEffect(() => {
    if (selectedEmployeeIdForCompensations) {
      const emp = employeeService.getById(selectedEmployeeIdForCompensations);
      if (emp) {
        setSelectedEmployee(emp);
        setSearchTerm('');
      } else {
        setSelectedEmployee(null);
      }
    } else {
      const activeEmployees = employeeService.getAll({ estado: 'ACTIVO' });
      if (activeEmployees.length > 0) {
        if (!selectedEmployee || !activeEmployees.some((e) => e.id === selectedEmployee.id)) {
          setSelectedEmployee(activeEmployees[0]);
        }
      } else {
        setSelectedEmployee(null);
      }
    }
  }, [selectedEmployeeIdForCompensations, refreshKey]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Dropdown search results
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    return employeeService.searchQuick(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Compensations for currently selected employee
  const employeeCompensations = useMemo(() => {
    if (!selectedEmployee) return [];
    return compensationService.getByEmployee(selectedEmployee.id);
  }, [selectedEmployee, refreshKey]);

  // Summary statistics for selected employee
  const summary = useMemo(() => {
    if (!selectedEmployee) {
      return { totalGenerados: 0, pendientes: 0, programados: 0, compensados: 0, anulados: 0 };
    }
    return compensationService.getEmployeeSummary(selectedEmployee.id);
  }, [selectedEmployee, refreshKey]);

  // Selection of compensation days for permission sheet / bulk actions
  const [selectedCompIds, setSelectedCompIds] = useState<Set<string>>(new Set());

  // Clear selection when employee changes
  useEffect(() => {
    setSelectedCompIds(new Set());
  }, [selectedEmployee?.id]);

  // Sorting and filtering state
  type SortField = 'fechaGenerada' | 'estado' | 'fechaCompensacion' | 'observacion';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('fechaGenerada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  const statePriority: Record<string, number> = {
    PENDIENTE: 1,
    PROGRAMADO: 2,
    COMPENSADO: 3,
    ANULADO: 4
  };

  const sortedCompensations = useMemo(() => {
    let list = [...employeeCompensations];

    if (filterStatus !== 'TODOS') {
      list = list.filter((c) => c.estado === filterStatus);
    }

    return list.sort((a, b) => {
      const fgA = a.fechaGenerada || '';
      const fgB = b.fechaGenerada || '';

      if (sortField === 'fechaGenerada') {
        const comp = fgA.localeCompare(fgB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      if (sortField === 'estado') {
        const pA = statePriority[a.estado] || 99;
        const pB = statePriority[b.estado] || 99;
        if (pA !== pB) {
          return sortDirection === 'asc' ? pA - pB : pB - pA;
        }
        return fgB.localeCompare(fgA);
      }

      if (sortField === 'fechaCompensacion') {
        const fA = a.fechaCompensacion || '';
        const fB = b.fechaCompensacion || '';
        if (!fA && !fB) return fgB.localeCompare(fgA);
        if (!fA) return 1;
        if (!fB) return -1;
        const comp = fA.localeCompare(fB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      if (sortField === 'observacion') {
        const oA = (a.observacion || '').toLowerCase();
        const oB = (b.observacion || '').toLowerCase();
        const comp = oA.localeCompare(oB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      return 0;
    });
  }, [employeeCompensations, sortField, sortDirection, filterStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'fechaGenerada' || field === 'fechaCompensacion') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ color: '#94a3b8', opacity: 0.5, marginLeft: '4px', flexShrink: 0 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} style={{ color: '#2563eb', marginLeft: '4px', flexShrink: 0, strokeWidth: 2.5 }} />
    ) : (
      <ArrowDown size={12} style={{ color: '#2563eb', marginLeft: '4px', flexShrink: 0, strokeWidth: 2.5 }} />
    );
  };

  // Selectable items in current sorted list
  const allCurrentSortedSelected = useMemo(() => {
    return (
      sortedCompensations.length > 0 &&
      sortedCompensations.every((c) => selectedCompIds.has(c.id))
    );
  }, [sortedCompensations, selectedCompIds]);

  const handleToggleSelectAll = () => {
    if (allCurrentSortedSelected) {
      setSelectedCompIds(new Set());
    } else {
      setSelectedCompIds(new Set(sortedCompensations.map((c) => c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedCompIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmBulkDelete = () => {
    const ids = Array.from(selectedCompIds);
    if (ids.length === 0) return;

    const res = compensationService.bulkDelete(ids);
    if (res.success) {
      success(
        `Se eliminaron ${res.data?.deletedCount || ids.length} registro(s) de compensación del trabajador.`,
        'Eliminación Masiva Exitosa'
      );
      setSelectedCompIds(new Set());
      triggerRefresh();
    } else {
      error(res.error || 'Error al eliminar los registros seleccionados.');
    }
  };

  const handleOpenPermissionSheet = () => {


    if (!selectedEmployee) return;
    const ids = Array.from(selectedCompIds);
    openPermissionSheetForEmployee(selectedEmployee.id, ids);
  };

  const formatDate = (dateStr?: string | null) => formatDateDisplay(dateStr);

  const handleSelectEmployee = (emp: Empleado) => {
    setSelectedEmployee(emp);
    setSelectedEmployeeIdForCompensations(emp.id);
    setSelectedCompIds(new Set());
    setSearchTerm('');
    success(`Trabajador seleccionado: ${emp.apellidosNombres}`, 'Panel Actualizado');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetEmp = searchResults[selectedIndex] || searchResults[0];
      if (targetEmp) {
        handleSelectEmployee(targetEmp);
      }
    } else if (e.key === 'Escape') {
      setSearchTerm('');
    }
  };

  const handleOpenScheduleModal = (comp: Compensacion) => {
    setCompensationToSchedule(comp);
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditModal = (comp: Compensacion) => {
    setCompensationToEdit(comp);
    setIsEditModalOpen(true);
  };

  const handlePromptDelete = (comp: Compensacion) => {
    setCompensationToDelete(comp);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!compensationToDelete) return;
    const res = compensationService.delete(compensationToDelete.id);
    if (res.success) {
      success(
        `Registro de compensación (${formatDate(compensationToDelete.fechaGenerada)}) eliminado correctamente.`,
        'Registro Eliminado'
      );
      triggerRefresh();
    } else {
      error(res.error || 'Error al eliminar el registro.');
    }
  };

  const handlePromptMarkAsCompensated = (comp: Compensacion) => {
    setCompensationToMarkCompensated(comp);
    setIsMarkCompensatedConfirmOpen(true);
  };

  const handleConfirmMarkAsCompensated = () => {
    if (!compensationToMarkCompensated) return;
    const res = compensationService.markAsCompensated(compensationToMarkCompensated.id);
    if (res.success) {
      success(
        `Compensación del día ${formatDate(
          compensationToMarkCompensated.fechaGenerada
        )} marcada como COMPENSADA.`,
        'Compensación Realizada'
      );
      triggerRefresh();
    } else {
      error(res.error || 'Error al actualizar estado.');
    }
  };

  const handlePromptAnnul = (comp: Compensacion) => {
    setCompensationToAnnul(comp);
    setIsAnnulConfirmOpen(true);
  };

  const handleConfirmAnnul = (reason?: string) => {
    if (!compensationToAnnul) return;
    const res = compensationService.annulCompensation(compensationToAnnul.id, {
      motivoAnulacion: reason || 'Anulado por usuario'
    });
    if (res.success) {
      warning(
        `Registro de compensación del día ${formatDate(
          compensationToAnnul.fechaGenerada
        )} anulado.`,
        'Compensación Anulada'
      );
      triggerRefresh();
    } else {
      error(res.error || 'Error al anular registro.');
    }
  };

  const handleExportExcel = () => {
    if (!selectedEmployee || sortedCompensations.length === 0) {
      warning('No hay registros de compensación para exportar.', 'Sin datos');
      return;
    }

    exportWorkerCompensationsToExcel(selectedEmployee, sortedCompensations);

    success(
      `Se descargó el archivo Excel (.xlsx) con ${sortedCompensations.length} registro(s) de ${selectedEmployee.apellidosNombres}.`,
      'Excel Generado con Éxito'
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. SECCIÓN DE BÚSQUEDA RÁPIDA DE TRABAJADOR */}
      <div
        className="card"
        style={{
          padding: '0.75rem 1rem',
          position: 'relative',
          zIndex: 50,
          border: '1px solid #cbd5e1'
        }}
      >
        <div style={{ marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Search size={14} style={{ color: '#2563eb' }} />
            Buscar Trabajador para gestionar días de compensación
          </label>

          {selectedEmployee && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Actual: <strong style={{ color: '#0f172a' }}>{selectedEmployee.apellidosNombres}</strong> ({selectedEmployee.documentoIdentidad})
            </span>
          )}
        </div>

        <div className="quick-search-box">
          <SearchBar
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Escriba DNI, código o apellidos (ej. 12345678, EMP-001, PEREZ)... presione Enter para seleccionar"
          />

          {searchTerm.trim().length > 0 && (
            <div className="search-results-popover">
              {searchResults.length > 0 ? (
                <>
                  <div className="search-results-header">
                    <span>
                      {searchResults.length} trabajador(es) encontrado(s) para "{searchTerm}"
                    </span>
                    <span style={{ fontSize: '0.675rem', color: '#2563eb', fontWeight: 600 }}>
                      [ENTER] o clic para seleccionar
                    </span>
                  </div>
                  {searchResults.map((emp, index) => (
                    <div
                      key={emp.id}
                      className={`search-result-row ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelectEmployee(emp)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                          {emp.apellidosNombres}
                        </strong>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '1px' }}>
                          <strong>DNI:</strong> {emp.documentoIdentidad} |{' '}
                          <strong>Área:</strong> {emp.area} |{' '}
                          <strong>Cargo:</strong> {emp.cargo}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Badge status={emp.estado} />
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#2563eb',
                            fontWeight: 700,
                            padding: '0.15rem 0.4rem',
                            background: '#eff6ff',
                            borderRadius: '4px'
                          }}
                        >
                          Seleccionar
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-result-empty">
                  No se encontraron trabajadores que coincidan con "<strong>{searchTerm}</strong>".
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. PANEL HERO DEL TRABAJADOR SELECCIONADO */}
      {selectedEmployee ? (
        <>
          <div className="worker-hero">
            <div className="worker-hero-top">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h2 className="worker-hero-name">{selectedEmployee.apellidosNombres}</h2>
                  <Badge status={selectedEmployee.estado} />
                </div>

                <div className="worker-hero-meta">
                  <div className="worker-hero-meta-item">
                    <span>DNI:</span>
                    <strong>{selectedEmployee.documentoIdentidad}</strong>
                  </div>
                  <div className="worker-hero-meta-item">
                    <span>Área:</span>
                    <strong>{selectedEmployee.area}</strong>
                  </div>
                  <div className="worker-hero-meta-item">
                    <span>Cargo:</span>
                    <strong>{selectedEmployee.cargo}</strong>
                  </div>
                  <div className="worker-hero-meta-item">
                    <span>Ingreso:</span>
                    <strong>{formatDate(selectedEmployee.fechaIngreso)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant={selectedCompIds.size > 0 ? "primary" : "secondary"}
                  size="sm"
                  onClick={handleOpenPermissionSheet}
                  icon={<Printer size={14} style={{ color: selectedCompIds.size > 0 ? '#ffffff' : '#2563eb' }} />}
                  title="Generar e imprimir Hoja de Permiso Oficial Chavín para este trabajador con los días seleccionados"
                  style={selectedCompIds.size > 0 ? {
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                    boxShadow: '0 2px 8px rgba(29, 78, 216, 0.4)'
                  } : undefined}
                >
                  Hoja de Permiso {selectedCompIds.size > 0 ? `(${selectedCompIds.size} selec.)` : ''}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={employeeCompensations.length === 0}
                  icon={<FileSpreadsheet size={14} style={{ color: '#16a34a' }} />}
                  title="Descargar reporte en formato Microsoft Excel (.xlsx)"
                >
                  Exportar Excel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRegisterDayModalOpen(true)}
                  icon={<PlusCircle size={15} />}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  + Generar Día Trabajado
                </Button>
              </div>
            </div>

            {/* Chips de Resumen de Compensaciones */}
            <div className="worker-summary-chips">
              <div className="summary-chip" style={{ borderLeft: '3px solid #60a5fa' }}>
                <span className="summary-chip-label">Días Generados</span>
                <span className="summary-chip-val">{summary.totalGenerados}</span>
              </div>
              <div className="summary-chip chip-pending">
                <span className="summary-chip-label" style={{ color: '#fbbf24' }}>
                  Pendientes
                </span>
                <span className="summary-chip-val" style={{ color: '#fbbf24' }}>
                  {summary.pendientes}
                </span>
              </div>
              <div className="summary-chip chip-scheduled">
                <span className="summary-chip-label" style={{ color: '#93c5fd' }}>
                  Programados
                </span>
                <span className="summary-chip-val" style={{ color: '#93c5fd' }}>
                  {summary.programados}
                </span>
              </div>
              <div className="summary-chip chip-compensated">
                <span className="summary-chip-label" style={{ color: '#6ee7b7' }}>
                  Compensados
                </span>
                <span className="summary-chip-val" style={{ color: '#6ee7b7' }}>
                  {summary.compensados}
                </span>
              </div>
              <div className="summary-chip chip-annulled">
                <span className="summary-chip-label">Anulados</span>
                <span className="summary-chip-val">{summary.anulados}</span>
              </div>
            </div>
          </div>

          {/* Banner de Selección Múltiple */}
          {selectedCompIds.size > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 1rem',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #93c5fd',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.12)',
                flexWrap: 'wrap',
                gap: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    background: '#1d4ed8',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  ✓ {selectedCompIds.size} día(s) seleccionado(s)
                </span>
                <span style={{ fontSize: '0.825rem', color: '#1e3a8a', fontWeight: 500 }}>
                  Acciones disponibles para los días marcados:
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBulkCompensateModalOpen(true)}
                  icon={<CalendarCheck size={14} />}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    borderColor: '#15803d',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  Compensar Seleccionados ({selectedCompIds.size})
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenPermissionSheet}
                  icon={<Printer size={14} />}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  Hoja de Permiso ({selectedCompIds.size})
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  icon={<Trash2 size={14} />}
                  style={{
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  Eliminar Seleccionados ({selectedCompIds.size})
                </Button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedCompIds(new Set())}
                  style={{ fontSize: '0.75rem', color: '#64748b' }}
                >
                  Limpiar Selección
                </button>
              </div>
            </div>
          )}

          {/* 3. TABLA DE DÍAS DE COMPENSACIÓN DEL TRABAJADOR */}
          <div className="table-wrapper">
            <div className="card-header" style={{ background: '#ffffff', flexWrap: 'wrap', gap: '0.65rem', padding: '0.75rem 1rem' }}>
              <div className="card-title" style={{ fontSize: '0.9rem' }}>
                <CalendarCheck size={16} style={{ color: '#2563eb' }} />
                <span>Control de Días Pendientes y Compensaciones (1 a 1)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Selector Ordenar por */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <label htmlFor="sort-select" style={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <ArrowDownUp size={13} style={{ color: '#2563eb' }} />
                    <span>Ordenar por:</span>
                  </label>
                  <select
                    id="sort-select"
                    value={`${sortField}_${sortDirection}`}
                    onChange={(e) => {
                      const [f, d] = e.target.value.split('_') as [SortField, SortDirection];
                      setSortField(f);
                      setSortDirection(d);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer',
                      color: '#0f172a',
                      fontWeight: 500
                    }}
                  >
                    <option value="fechaGenerada_desc">Día Generado (Más reciente)</option>
                    <option value="fechaGenerada_asc">Día Generado (Más antiguo)</option>
                    <option value="estado_asc">Estado (Pendientes primero)</option>
                    <option value="estado_desc">Estado (Compensados primero)</option>
                    <option value="fechaCompensacion_desc">Fecha Compensada (Más reciente)</option>
                    <option value="fechaCompensacion_asc">Fecha Compensada (Más antigua)</option>
                    <option value="observacion_asc">Observación (A - Z)</option>
                  </select>
                </div>

                {/* Filtro por Estado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <label htmlFor="filter-select" style={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <Filter size={13} style={{ color: '#64748b' }} />
                    <span>Estado:</span>
                  </label>
                  <select
                    id="filter-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer',
                      color: '#0f172a',
                      fontWeight: 500
                    }}
                  >
                    <option value="TODOS">Todos ({employeeCompensations.length})</option>
                    <option value="PENDIENTE">Pendientes ({summary.pendientes})</option>
                    <option value="PROGRAMADO">Programados ({summary.programados})</option>
                    <option value="COMPENSADO">Compensados ({summary.compensados})</option>
                    <option value="ANULADO">Anulados ({summary.anulados})</option>
                  </select>
                </div>

                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Total: <strong>{sortedCompensations.length}</strong> registro(s)
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={sortedCompensations.length === 0}
                  icon={<FileSpreadsheet size={13} style={{ color: '#16a34a' }} />}
                  title="Descargar archivo Excel (.xlsx)"
                >
                  Exportar Excel
                </Button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '42px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos los días disponibles"
                        checked={allCurrentSortedSelected}
                        onChange={handleToggleSelectAll}
                        disabled={sortedCompensations.length === 0}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        title="Seleccionar / Deseleccionar todos los días disponibles"
                      />
                    </th>
                    <th
                      style={{ width: '140px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('fechaGenerada')}
                      title="Clic para ordenar por Día Generado"
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: sortField === 'fechaGenerada' ? '#2563eb' : 'inherit', fontWeight: sortField === 'fechaGenerada' ? 700 : 'inherit' }}>
                          Día Generado
                        </span>
                        {renderSortIcon('fechaGenerada')}
                      </div>
                    </th>
                    <th
                      style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('estado')}
                      title="Clic para ordenar por Estado"
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: sortField === 'estado' ? '#2563eb' : 'inherit', fontWeight: sortField === 'estado' ? 700 : 'inherit' }}>
                          Estado
                        </span>
                        {renderSortIcon('estado')}
                      </div>
                    </th>
                    <th
                      style={{ width: '165px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('fechaCompensacion')}
                      title="Clic para ordenar por Fecha de Compensación"
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: sortField === 'fechaCompensacion' ? '#2563eb' : 'inherit', fontWeight: sortField === 'fechaCompensacion' ? 700 : 'inherit' }}>
                          Fecha Compensación
                        </span>
                        {renderSortIcon('fechaCompensacion')}
                      </div>
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('observacion')}
                      title="Clic para ordenar por Observación / Motivo"
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: sortField === 'observacion' ? '#2563eb' : 'inherit', fontWeight: sortField === 'observacion' ? 700 : 'inherit' }}>
                          Observación / Motivo
                        </span>
                        {renderSortIcon('observacion')}
                      </div>
                    </th>
                    <th style={{ textAlign: 'right', minWidth: '220px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompensations.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <Clock className="empty-state-icon" style={{ color: '#94a3b8' }} />
                          <div className="empty-state-title">
                            {employeeCompensations.length > 0
                              ? `No hay registros con el estado "${filterStatus}"`
                              : 'No hay días trabajados registrados para este trabajador'}
                          </div>
                          <div className="empty-state-desc">
                            {employeeCompensations.length > 0 ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ marginTop: '0.5rem' }}
                                onClick={() => setFilterStatus('TODOS')}
                              >
                                Ver todos los registros ({employeeCompensations.length})
                              </button>
                            ) : (
                              <>Haga clic en <strong>"+ Generar Día Trabajado"</strong> para registrar una guardia, feriado o día trabajado que generará compensación.</>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedCompensations.map((comp) => {
                      const isChecked = selectedCompIds.has(comp.id);
                      const isAnnulled = comp.estado === 'ANULADO';

                      return (
                        <tr
                          key={comp.id}
                          style={
                            isChecked
                              ? { backgroundColor: '#eff6ff' }
                              : comp.estado === 'PENDIENTE'
                              ? { backgroundColor: '#fffdfa' }
                              : comp.estado === 'PROGRAMADO'
                              ? { backgroundColor: '#f9fbff' }
                              : isAnnulled
                              ? { opacity: 0.75 }
                              : undefined
                          }
                        >
                          {/* Checkbox de Selección */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectOne(comp.id)}
                              disabled={isAnnulled}
                              style={{
                                cursor: isAnnulled ? 'not-allowed' : 'pointer',
                                width: '15px',
                                height: '15px'
                              }}
                              title={isAnnulled ? 'Registro anulado' : 'Seleccionar para Hoja de Permiso'}
                            />
                          </td>

                          {/* Día Generado */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={14} style={{ color: '#2563eb' }} />
                              <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                                {formatDate(comp.fechaGenerada)}
                              </strong>
                            </div>
                          </td>

                        {/* Estado */}
                        <td>
                          <Badge status={comp.estado} />
                        </td>

                        {/* Fecha Compensación */}
                        <td>
                          {comp.fechaCompensacion ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CalendarCheck size={14} style={{ color: '#059669' }} />
                              <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                                {formatDate(comp.fechaCompensacion)}
                              </strong>
                            </div>
                          ) : comp.formaCompensacion === 'REMUNERACION' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                              title="Compensado mediante pago en remuneración (sin fecha de descanso)"
                            >
                              <Banknote size={12} />
                              Pago en Remun.
                            </span>
                          ) : comp.formaCompensacion === 'LIQUIDACION' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                background: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                              title="Compensado en liquidación de beneficios sociales (sin fecha de descanso)"
                            >
                              <FileText size={12} />
                              Liquidación BB.SS.
                            </span>
                          ) : comp.estado === 'COMPENSADO' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                              title="Compensado en periodos anteriores / Histórico (sin fecha asignada)"
                            >
                              Histórico (Sin fecha)
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>-</span>
                          )}
                        </td>

                        {/* Observación */}
                        <td>
                          <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                            {formatObservationForDisplay(comp.observacion)}
                          </div>
                          {comp.motivoAnulacion && (
                            <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '1px' }}>
                              <strong>Anulación:</strong> {comp.motivoAnulacion}
                            </div>
                          )}
                        </td>

                        {/* Acciones Completas para TODOS los estados */}
                        <td>
                          <div className="table-actions-cell">
                            {/* Acción rápida 1: PENDIENTE -> Botón Compensar */}
                            {comp.estado === 'PENDIENTE' && (
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleOpenScheduleModal(comp)}
                                icon={<CalendarCheck size={13} />}
                                title="Programar fecha de compensación"
                              >
                                Compensar
                              </Button>
                            )}

                            {/* Acción rápida 2: PROGRAMADO -> Botón Marcar Compensado */}
                            {comp.estado === 'PROGRAMADO' && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handlePromptMarkAsCompensated(comp)}
                                icon={<CheckCircle2 size={13} />}
                                title="Confirmar que la compensación ya fue ejecutada"
                              >
                                Compensado
                              </Button>
                            )}

                            {/* BOTÓN UNIVERSAL: MODIFICAR / EDITAR (En TODOS los estados) */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEditModal(comp)}
                              icon={<Edit size={13} />}
                              title="Modificar fecha, estado, observación o detalles"
                            >
                              Editar
                            </Button>

                            {/* BOTÓN UNIVERSAL: ELIMINAR (En TODOS los estados) */}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handlePromptDelete(comp)}
                              title="Eliminar permanentemente este registro"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={13} />
                            </button>

                            {/* Anular (si está activo/pendiente/programado) */}
                            {(comp.estado === 'PENDIENTE' || comp.estado === 'PROGRAMADO') && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handlePromptAnnul(comp)}
                                title="Anular compensación"
                                style={{ color: '#94a3b8' }}
                              >
                                <Ban size={13} />
                              </button>
                            )}

                            {/* Ver detalle (si está compensado o anulado) */}
                            {(comp.estado === 'COMPENSADO' || comp.estado === 'ANULADO') && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setDetailCompensation(comp)}
                                title="Ver ficha de detalle"
                                style={{ color: '#64748b' }}
                              >
                                <Eye size={13} />
                              </button>
                            )}
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
        </>
      ) : (
        <div className="card">
          <div className="empty-state">
            <User className="empty-state-icon" />
            <div className="empty-state-title">Seleccione un trabajador</div>
            <div className="empty-state-desc">
              Utilice el buscador superior para seleccionar un empleado y administrar sus días de compensación.
            </div>
          </div>
        </div>
      )}

      {/* Modal: Programar Compensación (Asignar fecha 1:1) */}
      <ScheduleCompensationModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        compensation={compensationToSchedule}
        employee={selectedEmployee}
        onSuccess={() => triggerRefresh()}
      />

      {/* Modal: Modificar / Editar Compensación Total (Para TODOS los estados) */}
      <EditCompensationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        compensation={compensationToEdit}
        employee={selectedEmployee}
        onSuccess={() => triggerRefresh()}
      />

      {/* Modal: Registrar Día Trabajado */}
      <RegisterPendingDayModal
        isOpen={isRegisterDayModalOpen}
        onClose={() => setIsRegisterDayModalOpen(false)}
        preselectedEmployee={selectedEmployee}
        onSuccess={() => triggerRefresh()}
      />

      {/* Confirm Modal: Marcar como COMPENSADO */}
      <ConfirmModal
        isOpen={isMarkCompensatedConfirmOpen}
        onClose={() => setIsMarkCompensatedConfirmOpen(false)}
        onConfirm={handleConfirmMarkAsCompensated}
        title="¿Confirmar compensación realizada?"
        message={`¿Desea marcar como COMPENSADO el día generado el ${formatDate(
          compensationToMarkCompensated?.fechaGenerada
        )} correspondiente a la fecha programada ${formatDate(
          compensationToMarkCompensated?.fechaCompensacion
        )}?`}
        confirmText="Confirmar Compensado"
        variant="primary"
      />

      {/* Confirm Modal: Eliminar Compensación Definitivamente */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar registro de compensación?"
        message={`¿Está seguro de eliminar permanentemente el día generado ${formatDate(
          compensationToDelete?.fechaGenerada
        )} (${compensationToDelete?.estado})?\nEsta acción borrará el registro de la base de datos.`}
        confirmText="Eliminar Definitivamente"
        variant="danger"
      />

      {/* Confirm Modal: Eliminar Masivo de Seleccionados */}
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="¿Eliminar registros seleccionados?"
        message={`¿Está seguro de eliminar permanentemente los ${selectedCompIds.size} registros de compensación seleccionados?\nEsta acción no se puede deshacer.`}
        confirmText="Eliminar Seleccionados"
        variant="danger"
      />

      {/* Modal: Compensar Masivo de Seleccionados */}
      <BulkCompensateModal
        isOpen={isBulkCompensateModalOpen}
        onClose={() => setIsBulkCompensateModalOpen(false)}
        selectedIds={Array.from(selectedCompIds)}
        employeeName={selectedEmployee?.apellidosNombres}
        onSuccess={() => {
          setSelectedCompIds(new Set());
          triggerRefresh();
        }}
      />


      {/* Confirm Modal: Anular compensación */}
      <ConfirmModal
        isOpen={isAnnulConfirmOpen}
        onClose={() => setIsAnnulConfirmOpen(false)}
        onConfirm={handleConfirmAnnul}
        title="¿Anular registro de compensación?"
        message={`Está a punto de anular el día generado ${formatDate(
          compensationToAnnul?.fechaGenerada
        )}. Esta acción cambiará el estado a ANULADO y no podrá compensarse.`}
        confirmText="Anular Registro"
        variant="danger"
        requireReason={true}
        reasonLabel="Motivo de la anulación"
        reasonPlaceholder="Ej. Error de digitación, cambio de disposición gerencial..."
      />

      {/* Detail Modal */}
      {detailCompensation && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDetailCompensation(null)}
          onConfirm={() => setDetailCompensation(null)}
          title="Detalle de Compensación"
          message={`Día trabajado: ${formatDate(
            detailCompensation.fechaGenerada
          )} | Estado: ${detailCompensation.estado} | Fecha compensada: ${
            formatDate(detailCompensation.fechaCompensacion) || 'No aplica'
          }\n\nObservación: ${detailCompensation.observacion || 'Ninguna'}${
            detailCompensation.motivoAnulacion
              ? '\nMotivo de Anulación: ' + detailCompensation.motivoAnulacion
              : ''
          }`}
          confirmText="Aceptar"
          cancelText="Cerrar"
          variant="primary"
        />
      )}
    </div>
  );
};
