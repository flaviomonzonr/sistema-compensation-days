import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Edit2,
  History,
  CalendarClock,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Empleado, FilterOptions } from '../../types';
import { employeeService } from '../../services';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchBar } from '../common/SearchBar';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeeHistoryModal } from './EmployeeHistoryModal';
import { EntryHistoryModal } from './EntryHistoryModal';
import { DataManagementModal } from '../common/DataManagementModal';
import { formatDateDisplay } from '../../utils/dateUtils';
import { exportEmployeesToExcel } from '../../utils/excelExport';

export const EmployeeListView: React.FC = () => {
  const { openEmployeeCompensations, refreshKey, triggerRefresh } = useApp();
  const { success, error, warning } = useToast();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('TODOS');
  const [selectedTipo, setSelectedTipo] = useState('TODOS');
  const [selectedCategoria, setSelectedCategoria] = useState('TODOS');
  const [selectedEstado, setSelectedEstado] = useState('TODOS');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Empleado | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<Empleado | null>(null);

  // Entry Dates History Modal State
  const [selectedEmployeeIdForEntries, setSelectedEmployeeIdForEntries] = useState<string | null>(null);

  // Status Change Confirmation
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [employeeForStatusChange, setEmployeeForStatusChange] = useState<Empleado | null>(null);

  // Delete Confirmation
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Empleado | null>(null);

  // Data
  const distinctAreas = useMemo(() => employeeService.getDistinctAreas(), [refreshKey]);
  const distinctWorkerTypes = useMemo(() => employeeService.getDistinctWorkerTypes(), [refreshKey]);
  const distinctCategories = useMemo(() => employeeService.getDistinctCategories(), [refreshKey]);

  const employees = useMemo(() => {
    const filters: FilterOptions = {
      search: searchTerm,
      area: selectedArea,
      tipoTrabajador: selectedTipo,
      categoria: selectedCategoria,
      estado: selectedEstado
    };
    return employeeService.getAll(filters);
  }, [searchTerm, selectedArea, selectedTipo, selectedCategoria, selectedEstado, refreshKey]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedTipo, selectedCategoria, selectedEstado]);

  // Paginated employees calculation
  const totalEmployees = employees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEmployees = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return employees.slice(startIdx, startIdx + pageSize);
  }, [employees, safeCurrentPage, pageSize]);

  const selectedEmployeeForEntries = useMemo(
    () => (selectedEmployeeIdForEntries ? employees.find((e) => e.id === selectedEmployeeIdForEntries) || null : null),
    [selectedEmployeeIdForEntries, employees]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setEmployeeToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp: Empleado) => {
    setEmployeeToEdit(emp);
    setIsFormModalOpen(true);
  };

  const handleOpenHistory = (emp: Empleado) => {
    setSelectedEmployeeForHistory(emp);
    setIsHistoryModalOpen(true);
  };

  const handlePromptStatusChange = (emp: Empleado) => {
    setEmployeeForStatusChange(emp);
    setIsStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = () => {
    if (!employeeForStatusChange) return;
    const nextState = employeeForStatusChange.estado === 'ACTIVO' ? 'CESADO' : 'ACTIVO';
    const res = employeeService.changeStatus(employeeForStatusChange.id, nextState);
    if (res.success) {
      success(
        `Estado del empleado ${employeeForStatusChange.apellidosNombres} cambiado a ${nextState}.`,
        'Estado Actualizado'
      );
      triggerRefresh();
    } else {
      error(res.error || 'Error al cambiar estado.');
    }
  };

  const handlePromptDelete = (emp: Empleado) => {
    setEmployeeToDelete(emp);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    const res = employeeService.delete(employeeToDelete.id);
    if (res.success) {
      success(`Empleado ${employeeToDelete.apellidosNombres} eliminado correctamente.`);
      triggerRefresh();
    } else {
      warning(res.error || 'No se pudo eliminar el empleado.', 'Eliminación Bloqueada');
    }
  };

  const handleExportExcel = () => {
    if (employees.length === 0) {
      warning('No hay empleados para exportar con los filtros actuales.', 'Sin datos');
      return;
    }
    exportEmployeesToExcel(employees, 'Directorio_Empleados');
    success(`Se descargó el archivo Excel con ${employees.length} empleado(s).`, 'Descarga Exitosa');
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            Directorio de Empleados
          </h2>
          <span style={{ fontSize: '0.775rem', color: '#64748b' }}>
            {employees.length} empleado(s) {searchTerm || selectedArea !== 'TODOS' || selectedTipo !== 'TODOS' || selectedEstado !== 'TODOS' ? 'filtrado(s)' : 'registrado(s)'}
            {totalPages > 1 && ` • Pág. ${safeCurrentPage}/${totalPages}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            disabled={employees.length === 0}
            icon={<FileSpreadsheet size={14} style={{ color: '#16a34a' }} />}
            title="Descargar directorio de empleados en formato Microsoft Excel (.xlsx)"
          >
            Exportar Excel
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDataModalOpen(true)}
            icon={<Upload size={14} />}
          >
            Carga Masiva Empleados (Excel)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={<UserPlus size={15} />}
          >
            Registrar Empleado
          </Button>
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="filter-bar">
        {/* Real-time search by Código, DNI, Apellidos y nombres */}
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por Código, DNI o Apellidos y nombres..."
        />

        {/* Filter by Area */}
        <select
          className="filter-select"
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
        >
          <option value="TODOS">Todas las Áreas</option>
          {distinctAreas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        {/* Filter by Worker Type */}
        <select
          className="filter-select"
          value={selectedTipo}
          onChange={(e) => setSelectedTipo(e.target.value)}
        >
          <option value="TODOS">Todos los Tipos</option>
          {distinctWorkerTypes.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        {/* Filter by Category */}
        {distinctCategories.length > 0 && (
          <select
            className="filter-select"
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
          >
            <option value="TODOS">Todas las Categorías</option>
            {distinctCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        {/* Filter by Status */}
        <select
          className="filter-select"
          value={selectedEstado}
          onChange={(e) => setSelectedEstado(e.target.value)}
        >
          <option value="TODOS">Todos los Estados</option>
          <option value="ACTIVO">ACTIVOS</option>
          <option value="CESADO">CESADOS</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="table-wrapper">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Apellidos y nombres</th>
                <th>Tipo / Categoría</th>
                <th>Área</th>
                <th>Cargo</th>
                <th>Fecha Ingreso</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Users className="empty-state-icon" />
                      <div className="empty-state-title">No se encontraron empleados</div>
                      <div className="empty-state-desc">
                        Intente ajustar los términos de búsqueda o filtros, o registre un nuevo empleado.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#2563eb',
                          fontFamily: 'monospace',
                          fontSize: '0.825rem'
                        }}
                      >
                        {emp.codigo}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                        {emp.apellidosNombres}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#475569'
                          }}
                        >
                          {emp.tipoTrabajador}
                        </span>
                        {emp.categoria && (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              color: '#64748b',
                              fontWeight: 500
                            }}
                            title={`Categoría: ${emp.categoria}`}
                          >
                            {emp.categoria}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          fontWeight: 700
                        }}
                      >
                        {emp.area}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.8rem' }}>{emp.cargo}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600 }}>
                          {formatDateDisplay(emp.fechaIngreso)}
                        </span>
                        {(() => {
                          const count = emp.fechasIngreso && emp.fechasIngreso.length > 0 ? emp.fechasIngreso.length : 1;
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeIdForEntries(emp.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '9999px',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                background: count > 1 ? '#dbeafe' : '#f1f5f9',
                                color: count > 1 ? '#1d4ed8' : '#64748b',
                                border: count > 1 ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={
                                count > 1
                                  ? `Tiene ${count} fechas de ingreso registradas. Clic para ver historial de reingresos.`
                                  : 'Clic para ver o registrar una nueva fecha de reingreso'
                              }
                            >
                              <Calendar size={11} />
                              <span>{count} {count === 1 ? 'ingreso' : 'ingresos'}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                    <td>
                      <Badge status={emp.estado} />
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        {/* Direct Compensation Panel Access */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openEmployeeCompensations(emp.id)}
                          icon={<CalendarClock size={13} />}
                          title="Gestionar días de compensación"
                        >
                          Compensaciones
                        </Button>

                        {/* History */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenHistory(emp)}
                          title="Ver historial completo"
                        >
                          <History size={13} />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(emp)}
                          title="Editar datos del empleado"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Toggle Status (ACTIVO <-> CESADO) */}
                        <button
                          type="button"
                          className={`btn btn-sm ${emp.estado === 'ACTIVO' ? 'btn-ghost' : 'btn-secondary'
                            }`}
                          onClick={() => handlePromptStatusChange(emp)}
                          title={
                            emp.estado === 'ACTIVO'
                              ? 'Marcar como CESADO'
                              : 'Reactivar a ACTIVO'
                          }
                          style={
                            emp.estado === 'ACTIVO'
                              ? { color: '#ef4444' }
                              : { color: '#10b981' }
                          }
                        >
                          {emp.estado === 'ACTIVO' ? (
                            <XCircle size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                        </button>

                        {/* Delete Guarded */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handlePromptDelete(emp)}
                          title="Eliminar empleado (si no tiene historial)"
                          style={{ color: '#94a3b8' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={safeCurrentPage}
          totalItems={totalEmployees}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 25, 50, 100, 250]}
          itemLabel="empleados"
        />
      </div>

      {/* Form Modal (Create / Edit) */}
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        employeeToEdit={employeeToEdit}
        onSuccess={() => triggerRefresh()}
      />

      {/* History Modal */}
      <EmployeeHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        employee={selectedEmployeeForHistory}
      />

      {/* Status Change Confirmation Modal */}
      <ConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={
          employeeForStatusChange?.estado === 'ACTIVO'
            ? '¿Marcar empleado como CESADO?'
            : '¿Reactivar empleado a ACTIVO?'
        }
        message={
          employeeForStatusChange?.estado === 'ACTIVO'
            ? `El trabajador ${employeeForStatusChange?.apellidosNombres} pasará al estado CESADO. Mantendrá su historial pero no generará nuevas compensaciones activas.`
            : `El trabajador ${employeeForStatusChange?.apellidosNombres} volverá al estado ACTIVO.`
        }
        confirmText={
          employeeForStatusChange?.estado === 'ACTIVO' ? 'Cesarlo' : 'Reactivar'
        }
        variant={employeeForStatusChange?.estado === 'ACTIVO' ? 'warning' : 'primary'}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar registro de empleado?"
        message={`¿Está seguro de eliminar a ${employeeToDelete?.apellidosNombres}? Nota: Por seguridad del sistema, no se permitirá eliminar físicamente a ningún trabajador que posea registros históricos de compensaciones.`}
        confirmText="Intentar Eliminar"
        variant="danger"
      />

      {/* Data Management & Bulk Import Modal - Modo exclusivo Empleados */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        mode="employees"
      />

      {/* Historial de Fechas de Ingreso y Reingresos */}
      <EntryHistoryModal
        isOpen={!!selectedEmployeeForEntries}
        onClose={() => setSelectedEmployeeIdForEntries(null)}
        employee={selectedEmployeeForEntries}
      />
    </div>
  );
};
