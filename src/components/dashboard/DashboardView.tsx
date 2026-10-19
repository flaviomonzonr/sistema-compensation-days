import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Search,
  Filter,
  RotateCcw,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { dashboardService } from '../../services';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';

export const DashboardView: React.FC = () => {
  const { openEmployeeCompensations, setCurrentTab } = useApp();
  const metrics = dashboardService.getMetrics();

  // Filter & Search States
  const [selectedDaysFilter, setSelectedDaysFilter] = useState<string | number>('ALL_PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Unique Areas for filtering
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    metrics.todosTrabajadoresPendientes.forEach((w) => {
      if (w.area && w.area.trim()) {
        areas.add(w.area.trim());
      }
    });
    return Array.from(areas).sort((a, b) => a.localeCompare(b));
  }, [metrics.todosTrabajadoresPendientes]);

  // Filtered workers based on active filters
  const filteredWorkers = useMemo(() => {
    return metrics.todosTrabajadoresPendientes.filter((worker) => {
      // 1. Days filter
      if (selectedDaysFilter === 'ALL_PENDING') {
        if (worker.diasPendientes <= 0) return false;
      } else if (selectedDaysFilter === 'ALL_WORKERS') {
        // Include all
      } else if (selectedDaysFilter === 'MIN_3') {
        if (worker.diasPendientes < 3) return false;
      } else if (selectedDaysFilter === 'MIN_5') {
        if (worker.diasPendientes < 5) return false;
      } else if (typeof selectedDaysFilter === 'number') {
        if (worker.diasPendientes !== selectedDaysFilter) return false;
      }

      // 2. Area filter
      if (selectedArea !== 'ALL') {
        if ((worker.area || '').toLowerCase() !== selectedArea.toLowerCase()) {
          return false;
        }
      }

      // 3. Search query (Nombre, DNI, Código, Cargo)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = (worker.nombre || '').toLowerCase().includes(query);
        const matchDni = (worker.documento || '').toLowerCase().includes(query);
        const matchCode = (worker.codigo || '').toLowerCase().includes(query);
        const matchCargo = (worker.cargo || '').toLowerCase().includes(query);
        if (!matchName && !matchDni && !matchCode && !matchCargo) {
          return false;
        }
      }

      return true;
    });
  }, [metrics.todosTrabajadoresPendientes, selectedDaysFilter, selectedArea, searchQuery]);

  // Aggregate stats of current filtered selection
  const filteredStats = useMemo(() => {
    const totalWorkers = filteredWorkers.length;
    const totalPendingDays = filteredWorkers.reduce((sum, w) => sum + w.diasPendientes, 0);
    const totalScheduledDays = filteredWorkers.reduce((sum, w) => sum + w.diasProgramados, 0);
    const totalCompensatedDays = filteredWorkers.reduce((sum, w) => sum + w.diasCompensados, 0);
    return {
      totalWorkers,
      totalPendingDays,
      totalScheduledDays,
      totalCompensatedDays
    };
  }, [filteredWorkers]);

  // Pagination slicing
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWorkers.slice(start, start + pageSize);
  }, [filteredWorkers, currentPage, pageSize]);

  // Handler to change day filter and reset page
  const handleSelectDayFilter = (filterVal: string | number) => {
    setSelectedDaysFilter(filterVal);
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedDaysFilter('ALL_PENDING');
    setSearchQuery('');
    setSelectedArea('ALL');
    setCurrentPage(1);
  };

  const isFiltered =
    selectedDaysFilter !== 'ALL_PENDING' || searchQuery.trim() !== '' || selectedArea !== 'ALL';

  // Helper for pending badge urgency color
  const getPendingBadgeClass = (dias: number) => {
    if (dias === 1) return 'pending-badge-low';
    if (dias === 2) return 'pending-badge-mid';
    return 'pending-badge-high';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 4 Top KPI Metrics */}
      <div className="stat-grid">
        <StatCard
          label="Trabajadores Activos"
          value={metrics.trabajadoresActivos}
          icon={<Users size={22} />}
          colorTheme="blue"
          onClick={() => setCurrentTab('empleados')}
        />

        <StatCard
          label="Total Días Pendientes"
          value={metrics.totalDiasPendientes}
          icon={<Clock size={22} />}
          colorTheme="amber"
          onClick={() => setCurrentTab('compensaciones')}
        />

        <StatCard
          label="Compensaciones Programadas"
          value={metrics.compensacionesProgramadas}
          icon={<CalendarCheck size={22} />}
          colorTheme="indigo"
          onClick={() => setCurrentTab('compensaciones')}
        />

        <StatCard
          label="Compensaciones Realizadas"
          value={metrics.compensacionesRealizadas}
          icon={<CheckCircle2 size={22} />}
          colorTheme="emerald"
          onClick={() => setCurrentTab('compensaciones')}
        />
      </div>

      {/* Main Card: Resumen de Días Pendientes y Filtro por Cantidad de Días */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="card-title" style={{ fontSize: '1rem' }}>
              <Clock size={18} style={{ color: '#d97706' }} />
              <span>Resumen y Control de Días Pendientes por Compensar</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0 1.5rem' }}>
              Distribución de trabajadores según la cantidad exacta de días pendientes de compensación
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentTab('compensaciones')}
              icon={<ArrowUpRight size={13} />}
              iconPosition="right"
            >
              Ir a Compensaciones
            </Button>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Distribution Cards Section */}
          <div className="pending-dist-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Filtrar por cantidad de días adeudados:
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.725rem', color: '#2563eb', padding: '0.15rem 0.4rem' }}
                >
                  <RotateCcw size={12} style={{ marginRight: '0.25rem' }} />
                  Restablecer filtros
                </button>
              )}
            </div>

            <div className="pending-dist-grid">
              {/* Card 1: Todos con días pendientes */}
              <button
                type="button"
                className={`pending-dist-card all-card ${selectedDaysFilter === 'ALL_PENDING' ? 'active' : ''}`}
                onClick={() => handleSelectDayFilter('ALL_PENDING')}
                title="Mostrar todos los trabajadores que tienen 1 o más días pendientes"
              >
                <div className="pending-dist-header">
                  <span className="pending-dist-title">Todos con Deuda</span>
                  <Layers size={14} style={{ color: '#d97706' }} />
                </div>
                <div className="pending-dist-workers">
                  {metrics.totalTrabajadoresConPendientes}{' '}
                  <span style={{ fontSize: '0.725rem', fontWeight: 500, color: '#64748b' }}>
                    {metrics.totalTrabajadoresConPendientes === 1 ? 'trabajador' : 'trabajadores'}
                  </span>
                </div>
                <div className="pending-dist-footer">
                  <span>Total pendientes:</span>
                  <strong>{metrics.totalDiasPendientes} {metrics.totalDiasPendientes === 1 ? 'día' : 'días'}</strong>
                </div>
              </button>

              {/* Dynamic cards for each day count */}
              {metrics.distribucionDiasPendientes.map((item) => {
                const isSelected = selectedDaysFilter === item.dias;
                return (
                  <button
                    key={`dist-day-${item.dias}`}
                    type="button"
                    className={`pending-dist-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectDayFilter(item.dias)}
                    title={`Filtrar trabajadores que tienen exactamente ${item.dias} ${item.dias === 1 ? 'día pendiente' : 'días pendientes'}`}
                  >
                    <div className="pending-dist-header">
                      <span className="pending-dist-title">
                        {item.dias} {item.dias === 1 ? 'Día Pendiente' : 'Días Pendientes'}
                      </span>
                      <span
                        className={`badge ${getPendingBadgeClass(item.dias)}`}
                        style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}
                      >
                        {item.dias} {item.dias === 1 ? 'd' : 'd'}
                      </span>
                    </div>
                    <div className="pending-dist-workers">
                      {item.cantidadTrabajadores}{' '}
                      <span style={{ fontSize: '0.725rem', fontWeight: 500, color: '#64748b' }}>
                        {item.cantidadTrabajadores === 1 ? 'trabajador' : 'trabajadores'}
                      </span>
                    </div>
                    <div className="pending-dist-footer">
                      <span>Total acumulado:</span>
                      <strong>{item.totalDias} {item.totalDias === 1 ? 'día' : 'días'}</strong>
                    </div>
                  </button>
                );
              })}

              {/* Optional Card: Todos los trabajadores (incluyendo sin deuda) */}
              <button
                type="button"
                className={`pending-dist-card ${selectedDaysFilter === 'ALL_WORKERS' ? 'active' : ''}`}
                onClick={() => handleSelectDayFilter('ALL_WORKERS')}
                title="Mostrar la nómina completa de trabajadores activos e inactivos"
              >
                <div className="pending-dist-header">
                  <span className="pending-dist-title">Toda la Nómina</span>
                  <Users size={14} style={{ color: '#2563eb' }} />
                </div>
                <div className="pending-dist-workers">
                  {metrics.todosTrabajadoresPendientes.length}{' '}
                  <span style={{ fontSize: '0.725rem', fontWeight: 500, color: '#64748b' }}>total</span>
                </div>
                <div className="pending-dist-footer">
                  <span>Incluye 0 días</span>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>Ver todo</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Filter Chips & Search Controls */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            {/* Filter controls row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
              {/* Search Bar */}
              <div className="search-input-container" style={{ minWidth: '220px', flex: 2 }}>
                <Search size={15} className="search-input-icon" />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, DNI, Código o Cargo..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="search-input-field"
                  style={{ backgroundColor: '#ffffff' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Day filter selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: '170px' }}>
                <Filter size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                <select
                  className="form-select"
                  value={String(selectedDaysFilter)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ALL_PENDING' || val === 'ALL_WORKERS' || val === 'MIN_3' || val === 'MIN_5') {
                      handleSelectDayFilter(val);
                    } else {
                      handleSelectDayFilter(Number(val));
                    }
                  }}
                  style={{ padding: '0.38rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#ffffff' }}
                >
                  <option value="ALL_PENDING">Solo con Días Pendientes (&gt; 0)</option>
                  {metrics.distribucionDiasPendientes.map((item) => (
                    <option key={`opt-day-${item.dias}`} value={String(item.dias)}>
                      Exactamente {item.dias} {item.dias === 1 ? 'día pendiente' : 'días pendientes'} ({item.cantidadTrabajadores} trab.)
                    </option>
                  ))}
                  {metrics.distribucionDiasPendientes.some((d) => d.dias >= 3) && (
                    <option value="MIN_3">3 o más días pendientes (≥ 3)</option>
                  )}
                  {metrics.distribucionDiasPendientes.some((d) => d.dias >= 5) && (
                    <option value="MIN_5">5 o más días pendientes (≥ 5)</option>
                  )}
                  <option value="ALL_WORKERS">Todos los trabajadores (incluye 0)</option>
                </select>
              </div>

              {/* Area filter selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: '150px' }}>
                <select
                  className="form-select"
                  value={selectedArea}
                  onChange={(e) => {
                    setSelectedArea(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ padding: '0.38rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#ffffff' }}
                >
                  <option value="ALL">Todas las Áreas</option>
                  {uniqueAreas.map((area) => (
                    <option key={`opt-area-${area}`} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  icon={<RotateCcw size={13} />}
                  title="Limpiar todos los filtros aplicados"
                >
                  Limpiar
                </Button>
              )}
            </div>

            {/* Quick Pills Row */}
            <div className="pending-filter-chips">
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginRight: '0.2rem' }}>
                Acceso rápido:
              </span>
              <button
                type="button"
                className={`pending-filter-pill ${selectedDaysFilter === 'ALL_PENDING' ? 'active' : ''}`}
                onClick={() => handleSelectDayFilter('ALL_PENDING')}
              >
                Con Deuda ({metrics.totalTrabajadoresConPendientes})
              </button>

              {metrics.distribucionDiasPendientes.map((item) => (
                <button
                  key={`pill-day-${item.dias}`}
                  type="button"
                  className={`pending-filter-pill ${selectedDaysFilter === item.dias ? 'active' : ''}`}
                  onClick={() => handleSelectDayFilter(item.dias)}
                >
                  {item.dias} {item.dias === 1 ? 'día' : 'días'} ({item.cantidadTrabajadores})
                </button>
              ))}

              <button
                type="button"
                className={`pending-filter-pill ${selectedDaysFilter === 'ALL_WORKERS' ? 'active' : ''}`}
                onClick={() => handleSelectDayFilter('ALL_WORKERS')}
              >
                Todos ({metrics.todosTrabajadoresPendientes.length})
              </button>
            </div>
          </div>

          {/* Table Summary Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.5rem',
              background: '#f1f5f9',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: '#334155',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>
                Mostrando <strong>{filteredStats.totalWorkers}</strong> {filteredStats.totalWorkers === 1 ? 'trabajador' : 'trabajadores'}
                {typeof selectedDaysFilter === 'number' && (
                  <> con exactamente <strong style={{ color: '#d97706' }}>{selectedDaysFilter} {selectedDaysFilter === 1 ? 'día pendiente' : 'días pendientes'}</strong></>
                )}
                {selectedDaysFilter === 'ALL_PENDING' && (
                  <> con <strong style={{ color: '#d97706' }}>días pendientes por compensar</strong></>
                )}
                {selectedDaysFilter === 'MIN_3' && (
                  <> con <strong style={{ color: '#dc2626' }}>3 o más días pendientes</strong></>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span>
                Total días pendientes: <strong style={{ color: '#d97706' }}>{filteredStats.totalPendingDays}</strong>
              </span>
              <span>•</span>
              <span>
                Programados: <strong style={{ color: '#4f46e5' }}>{filteredStats.totalScheduledDays}</strong>
              </span>
              <span>•</span>
              <span>
                Compensados: <strong style={{ color: '#059669' }}>{filteredStats.totalCompensatedDays}</strong>
              </span>
            </div>
          </div>

          {/* Workers Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Documento (DNI)</th>
                  <th>Área / Cargo</th>
                  <th style={{ textAlign: 'center' }}>Días Pendientes</th>
                  <th style={{ textAlign: 'center' }}>Programados</th>
                  <th style={{ textAlign: 'center' }}>Compensados</th>
                  <th style={{ textAlign: 'center' }}>Total Histórico</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        {isFiltered ? (
                          <>
                            <AlertTriangle className="empty-state-icon" style={{ color: '#f59e0b' }} />
                            <div className="empty-state-title">
                              No se encontraron trabajadores para este filtro
                            </div>
                            <div className="empty-state-desc">
                              Ningún trabajador coincide con los criterios de búsqueda o cantidad de días seleccionados.
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                                Limpiar filtros
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="empty-state-icon" style={{ color: '#10b981' }} />
                            <div className="empty-state-title">
                              No hay trabajadores con días pendientes
                            </div>
                            <div className="empty-state-desc">
                              Todos los días de compensación registrados han sido atendidos o no se han generado días trabajados aún.
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedWorkers.map((item) => (
                    <tr
                      key={item.empleadoId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openEmployeeCompensations(item.empleadoId)}
                      title="Haga clic para abrir y administrar el panel de compensaciones de este trabajador"
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{item.nombre}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Cód: {item.codigo}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        {item.documento}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              width: 'fit-content'
                            }}
                          >
                            {item.area}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.cargo}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.diasPendientes > 0 ? (
                          <span
                            className={`badge ${getPendingBadgeClass(item.diasPendientes)}`}
                            style={{ fontSize: '0.775rem', padding: '0.2rem 0.55rem' }}
                          >
                            <span className="badge-dot" />
                            {item.diasPendientes} {item.diasPendientes === 1 ? 'día' : 'días'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>
                            0 días
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.diasProgramados > 0 ? (
                          <span className="badge badge-scheduled" style={{ fontSize: '0.725rem' }}>
                            {item.diasProgramados} {item.diasProgramados === 1 ? 'día' : 'días'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.diasCompensados > 0 ? (
                          <span className="badge badge-compensated" style={{ fontSize: '0.725rem' }}>
                            {item.diasCompensados} {item.diasCompensados === 1 ? 'día' : 'días'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                          {item.totalGenerados} {item.totalGenerados === 1 ? 'generado' : 'generados'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeCompensations(item.empleadoId);
                          }}
                          icon={<ChevronRight size={13} />}
                          iconPosition="right"
                        >
                          Administrar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredWorkers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredWorkers.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newPageSize) => {
                setPageSize(newPageSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="trabajadores"
            />
          )}
        </div>
      </div>

      {/* Quick System Info Cards at the bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.875rem' }}>
        <div className="card" style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.4rem', borderRadius: '6px' }}>
              <Calendar size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Regla Fundamental del Sistema</h3>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Relación 1 a 1 de Compensaciones</span>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
            Cada <strong>1 día trabajado</strong> genera estrictamente <strong>1 día pendiente</strong> y tiene exactamente <strong>1 fecha de compensación</strong>. No se admiten rangos ni compensaciones fraccionadas.
          </p>
        </div>

        <div className="card" style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '6px' }}>
              <UserCheck size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Flujo de Estados</h3>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Ciclo de vida operativo</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <span className="badge badge-pending">PENDIENTE</span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>➔</span>
            <span className="badge badge-scheduled">PROGRAMADO</span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>➔</span>
            <span className="badge badge-compensated">COMPENSADO</span>
          </div>
        </div>
      </div>
    </div>
  );
};
