import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  CheckSquare,
  Square,
  CalendarCheck,
  Search,
  Users,
  Clock,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Save,
  CalendarDays,
  Sun,
  AlertTriangle,
  ArrowRight,
  X,
  Globe,
  Layers,
  Printer
} from 'lucide-react';
import { compensationService } from '../../services/compensationService';
import { CompensacionConEmpleado } from '../../types';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { parseDateString, formatDateDisplay } from '../../utils/dateUtils';

// Helper to normalize any date string to YYYY-MM-DD for reliable comparison
function normalizeDateISO(val?: string | null): string {
  return parseDateString(val);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDateISO(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

type DateFilterMode = 'AMBOS' | 'TRABAJADA' | 'COMPENSACION' | 'TODAS_LAS_FECHAS';
type BulkActionMode = 'COMPENSAR_HOY' | 'COMPENSAR_OTRO_DIA';

export const CompensationByDatePanel: React.FC = () => {
  const { refreshKey, triggerRefresh, openEmployeeCompensations, openBulkPermissionSheetForDate } = useApp();
  const { success, error, warning } = useToast();

  // Fetch all compensations
  const allCompensations = useMemo(() => {
    return compensationService.getAll();
  }, [refreshKey]);

  // Extract distinct dates with count for quick navigation chips
  const datesWithData = useMemo(() => {
    const map = new Map<string, { generadas: number; compensaciones: number }>();
    allCompensations.forEach((c) => {
      const normGen = normalizeDateISO(c.fechaGenerada);
      if (normGen) {
        const curr = map.get(normGen) || { generadas: 0, compensaciones: 0 };
        curr.generadas++;
        map.set(normGen, curr);
      }
      const normComp = normalizeDateISO(c.fechaCompensacion);
      if (normComp) {
        const curr = map.get(normComp) || { generadas: 0, compensaciones: 0 };
        curr.compensaciones++;
        map.set(normComp, curr);
      }
    });

    const list: { date: string; total: number; generadas: number; compensaciones: number }[] = [];
    map.forEach((val, date) => {
      list.push({
        date,
        total: val.generadas + val.compensaciones,
        generadas: val.generadas,
        compensaciones: val.compensaciones
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [allCompensations]);

  // Initial date: use today if it has records, otherwise default to the most recent date with records
  const initialDate = useMemo(() => {
    const today = todayISO();
    const hasTodayData = allCompensations.some(
      (c) => normalizeDateISO(c.fechaGenerada) === today || normalizeDateISO(c.fechaCompensacion) === today
    );
    if (hasTodayData) return today;
    if (datesWithData.length > 0) return datesWithData[0].date;
    return today;
  }, [datesWithData, allCompensations]);

  // Primary filters
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('AMBOS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Update selectedDate if it was empty and initial date becomes available
  useEffect(() => {
    if (!selectedDate && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate, selectedDate]);

  // Records loaded for currently selected date & mode
  const [records, setRecords] = useState<CompensacionConEmpleado[]>([]);

  // Selection state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkActionMode, setBulkActionMode] = useState<BulkActionMode>('COMPENSAR_HOY');
  const [bulkTargetDate, setBulkTargetDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Per-row "Compensar otro día" configuration: id -> { enabled: boolean, date: string }
  const [rowCustomDates, setRowCustomDates] = useState<Record<string, { enabled: boolean; date: string }>>({});

  // Compute live metrics for the CURRENT selected date
  const normSelectedDate = normalizeDateISO(selectedDate);
  const dateMetrics = useMemo(() => {
    if (!normSelectedDate || dateFilterMode === 'TODAS_LAS_FECHAS') {
      return {
        total: allCompensations.length,
        laboraron: allCompensations.length,
        compensan: allCompensations.filter((c) => !!c.fechaCompensacion).length
      };
    }

    const laboraron = allCompensations.filter(
      (c) => normalizeDateISO(c.fechaGenerada) === normSelectedDate
    );
    const compensan = allCompensations.filter(
      (c) => normalizeDateISO(c.fechaCompensacion) === normSelectedDate
    );
    const totalSet = new Set([...laboraron.map((c) => c.id), ...compensan.map((c) => c.id)]);

    return {
      total: totalSet.size,
      laboraron: laboraron.length,
      compensan: compensan.length
    };
  }, [allCompensations, normSelectedDate, dateFilterMode]);

  // Load records based on selectedDate and dateFilterMode
  const loadRecords = useCallback(() => {
    const all = compensationService.getAll();

    if (dateFilterMode === 'TODAS_LAS_FECHAS' || !selectedDate) {
      setRecords(all);
      setCheckedIds(new Set());
      setRowCustomDates({});
      return;
    }

    const normTarget = normalizeDateISO(selectedDate);
    let filteredList: CompensacionConEmpleado[] = [];

    if (dateFilterMode === 'COMPENSACION') {
      // Filtrar trabajadores cuya fecha de compensación (descanso) coincide
      filteredList = all.filter((c) => normalizeDateISO(c.fechaCompensacion) === normTarget);
    } else if (dateFilterMode === 'TRABAJADA') {
      // Filtrar trabajadores cuya fecha generada (jornada laborada) coincide
      filteredList = all.filter((c) => normalizeDateISO(c.fechaGenerada) === normTarget);
    } else {
      // 'AMBOS' (Modo por defecto: Cualquier trabajador asociado a esta fecha)
      filteredList = all.filter(
        (c) =>
          normalizeDateISO(c.fechaGenerada) === normTarget ||
          normalizeDateISO(c.fechaCompensacion) === normTarget
      );
    }

    setRecords(filteredList);
    setCheckedIds(new Set());
    setRowCustomDates({});
  }, [selectedDate, dateFilterMode, refreshKey]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Filter records by state & search text
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterEstado !== 'TODOS' && r.estado !== filterEstado) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const emp = r.empleado;
        const searchPool = `${r.empleadoId} ${emp?.codigo || ''} ${emp?.documentoIdentidad || ''} ${emp?.apellidosNombres || ''} ${emp?.cargo || ''} ${emp?.area || ''} ${r.observacion || ''} ${r.fechaGenerada} ${r.fechaCompensacion || ''}`.toLowerCase();
        return searchPool.includes(q);
      }
      return true;
    });
  }, [records, filterEstado, searchTerm]);

  // Count matches in global database if current date filter yields 0 results for a search term
  const globalSearchMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    return allCompensations.filter((c) => {
      const emp = c.empleado;
      const searchPool = `${c.empleadoId} ${emp?.codigo || ''} ${emp?.documentoIdentidad || ''} ${emp?.apellidosNombres || ''} ${emp?.cargo || ''} ${emp?.area || ''} ${c.observacion || ''} ${c.fechaGenerada} ${c.fechaCompensacion || ''}`.toLowerCase();
      return searchPool.includes(q);
    });
  }, [allCompensations, searchTerm]);

  // Counters for current table records
  const counts = useMemo(() => {
    return {
      total: records.length,
      pendiente: records.filter((r) => r.estado === 'PENDIENTE').length,
      programado: records.filter((r) => r.estado === 'PROGRAMADO').length,
      compensado: records.filter((r) => r.estado === 'COMPENSADO').length,
      anulado: records.filter((r) => r.estado === 'ANULADO').length
    };
  }, [records]);

  // Checkbox Selection logic
  const selectableRecords = useMemo(() => {
    return filteredRecords.filter((r) => r.estado !== 'ANULADO');
  }, [filteredRecords]);

  const allSelected = selectableRecords.length > 0 && selectableRecords.every((r) => checkedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(selectableRecords.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Row-level "Compensar otro día" Checkbox Handlers
  const handleToggleRowCustomDate = (id: string, currentCompDate?: string | null) => {
    setRowCustomDates((prev) => {
      const isAlready = prev[id]?.enabled;
      if (isAlready) {
        const next = { ...prev };
        delete next[id];
        return next;
      } else {
        return {
          ...prev,
          [id]: {
            enabled: true,
            date: prev[id]?.date || currentCompDate || offsetDateISO(1)
          }
        };
      }
    });
  };

  const handleRowCustomDateChange = (id: string, newDate: string) => {
    setRowCustomDates((prev) => ({
      ...prev,
      [id]: {
        enabled: true,
        date: newDate
      }
    }));
  };

  // Single row save for custom compensation date
  const handleSaveSingleRowCustomDate = (record: CompensacionConEmpleado) => {
    const config = rowCustomDates[record.id];
    if (!config?.date) {
      warning('Selecciona una fecha válida para compensar.');
      return;
    }

    const res = compensationService.scheduleCompensation(record.id, {
      fechaCompensacion: config.date,
      observacion: record.observacion
        ? `${record.observacion} (Reprogramado a ${formatDateDisplay(config.date)})`
        : `Compensación programada para el ${formatDateDisplay(config.date)}`
    });

    if (res.success) {
      success(
        `Se programó la compensación de ${record.empleado?.apellidosNombres || 'el trabajador'} para el ${formatDateDisplay(config.date)}.`,
        'Fecha Actualizada'
      );
      setRowCustomDates((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      triggerRefresh();
    } else {
      error(res.error || 'Error al guardar la nueva fecha de compensación.');
    }
  };

  // Single row quick mark as compensated
  const handleMarkSingleCompensated = (record: CompensacionConEmpleado) => {
    if (record.estado === 'PENDIENTE') {
      const targetDate = selectedDate || todayISO();
      if (record.fechaGenerada === targetDate) {
        error(
          `El día generado trabajado (${formatDateDisplay(record.fechaGenerada)}) no puede ser igual a la fecha de compensación. Asigna una fecha de descanso diferente.`
        );
        return;
      }
      const sched = compensationService.scheduleCompensation(record.id, {
        fechaCompensacion: targetDate
      });
      if (!sched.success) {
        error(sched.error || 'No se pudo programar la compensación antes de marcar.');
        return;
      }
    }

    const res = compensationService.markAsCompensated(record.id);
    if (res.success) {
      success(`Se marcó como COMPENSADO a ${record.empleado?.apellidosNombres || 'el trabajador'}.`);
      triggerRefresh();
    } else {
      error(res.error || 'No se pudo marcar como compensado.');
    }
  };

  // Count how many individual rows have custom date enabled with a valid date
  const pendingCustomRowsCount = useMemo(() => {
    return Object.values(rowCustomDates).filter((c) => c.enabled && c.date).length;
  }, [rowCustomDates]);

  // Bulk Apply Handler
  const handleBulkApply = () => {
    const selectedIds = Array.from(checkedIds);
    if (selectedIds.length === 0) {
      warning('Selecciona al menos un trabajador para aplicar la acción.');
      return;
    }

    if (bulkActionMode === 'COMPENSAR_OTRO_DIA' && !bulkTargetDate) {
      warning('Debes ingresar la fecha en que se compensará el día libre.');
      return;
    }

    setIsProcessing(true);
    let ok = 0;
    let fail = 0;
    const errorsList: string[] = [];

    selectedIds.forEach((id) => {
      const rec = records.find((r) => r.id === id);
      if (!rec) return;

      if (bulkActionMode === 'COMPENSAR_HOY') {
        const targetDate = selectedDate || todayISO();
        if (rec.fechaGenerada === targetDate) {
          fail++;
          errorsList.push(
            `${rec.empleado?.apellidosNombres || 'Trabajador'}: No se puede compensar el mismo día generado (${formatDateDisplay(targetDate)}).`
          );
          return;
        }

        if (rec.estado === 'PENDIENTE') {
          const sched = compensationService.scheduleCompensation(id, { fechaCompensacion: targetDate });
          if (!sched.success) {
            fail++;
            if (sched.error) errorsList.push(`${rec.empleado?.apellidosNombres || 'Trabajador'}: ${sched.error}`);
            return;
          }
        }
        const res = compensationService.markAsCompensated(id);
        if (res.success) {
          ok++;
        } else {
          fail++;
          if (res.error) errorsList.push(res.error);
        }
      } else {
        const targetDate = rowCustomDates[id]?.enabled && rowCustomDates[id]?.date
          ? rowCustomDates[id].date
          : bulkTargetDate;

        const res = compensationService.scheduleCompensation(id, {
          fechaCompensacion: targetDate
        });
        if (res.success) {
          ok++;
        } else {
          fail++;
          if (res.error) errorsList.push(`${rec.empleado?.apellidosNombres || 'Trabajador'}: ${res.error}`);
        }
      }
    });

    setIsProcessing(false);
    triggerRefresh();
    setCheckedIds(new Set());
    setRowCustomDates({});

    if (ok > 0) {
      success(
        `${ok} trabajador(es) ${
          bulkActionMode === 'COMPENSAR_HOY'
            ? 'marcados como COMPENSADOS exitosamente'
            : `programados para compensar el ${formatDateDisplay(bulkTargetDate)}`
        }.`
      );
    }
    if (fail > 0) {
      if (errorsList.length > 0) {
        error(errorsList.slice(0, 2).join(' | '));
      } else {
        error(`${fail} registro(s) no pudieron actualizarse.`);
      }
    }
  };

  // Save all custom row dates in one click
  const handleSaveAllCustomDates = () => {
    const entries = Object.entries(rowCustomDates).filter(([, cfg]) => cfg.enabled && cfg.date);
    if (entries.length === 0) return;

    let ok = 0;
    let fail = 0;

    entries.forEach(([id, cfg]) => {
      const res = compensationService.scheduleCompensation(id, {
        fechaCompensacion: cfg.date
      });
      res.success ? ok++ : fail++;
    });

    triggerRefresh();
    setRowCustomDates({});
    if (ok > 0) {
      success(`Se guardaron las fechas personalizadas de ${ok} trabajador(es).`);
    }
    if (fail > 0) {
      error(`${fail} registro(s) presentaron errores.`);
    }
  };

  // Click on quick date chip
  const handleSelectDateChip = (dateStr: string) => {
    const norm = normalizeDateISO(dateStr);
    setSelectedDate(norm);
    setDateFilterMode('AMBOS');
    setSearchTerm('');
  };

  const estadoBadge = (estado: string) => {
    const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
      PENDIENTE: { bg: '#fef9c3', color: '#854d0e', border: '#fef08a', label: 'Pendiente' },
      PROGRAMADO: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'Programado' },
      COMPENSADO: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Compensado' },
      ANULADO: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Anulado' }
    };
    const s = map[estado] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: estado };
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          padding: '3px 9px',
          borderRadius: '99px',
          fontSize: '0.72rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>

      {/* ── CARD PRINCIPAL DE CONTROL Y SELECCIÓN DE FECHA ── */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}
      >
        {/* Fila 1: Selector de Fecha + Modo Dual (Compensación vs Jornada) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          
          {/* Selector de fecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Calendar size={14} style={{ color: '#2563eb' }} />
              1. Seleccionar Fecha a Consultar:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDate(val);
                  if (dateFilterMode === 'TODAS_LAS_FECHAS') {
                    setDateFilterMode('AMBOS');
                  }
                }}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  padding: '0.3rem 0.6rem',
                  minWidth: 150
                }}
              />
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.22rem 0.5rem' }}
                  onClick={() => {
                    setSelectedDate(todayISO());
                    setDateFilterMode('AMBOS');
                  }}
                  title="Seleccionar fecha de hoy"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.22rem 0.5rem' }}
                  onClick={() => {
                    setSelectedDate(offsetDateISO(-1));
                    setDateFilterMode('AMBOS');
                  }}
                  title="Seleccionar día de ayer"
                >
                  Ayer
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.22rem 0.5rem' }}
                  onClick={() => {
                    setSelectedDate(offsetDateISO(1));
                    setDateFilterMode('AMBOS');
                  }}
                  title="Seleccionar día de mañana"
                >
                  Mañana
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${dateFilterMode === 'TODAS_LAS_FECHAS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.22rem 0.5rem', display: 'flex', alignItems: 'center', gap: 3 }}
                  onClick={() => {
                    setDateFilterMode(dateFilterMode === 'TODAS_LAS_FECHAS' ? 'AMBOS' : 'TODAS_LAS_FECHAS');
                  }}
                  title="Ver todos los registros históricos sin filtrar por fecha"
                >
                  <Globe size={12} />
                  Ver Todas ({allCompensations.length})
                </button>
              </div>
            </div>
          </div>

          {/* Selector de Modo de Consulta (Por qué fecha se filtra) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
              2. ¿Qué trabajadores listar {dateFilterMode === 'TODAS_LAS_FECHAS' ? '(Historial Completo)' : `para el ${formatDateDisplay(selectedDate)}`}?
            </label>
            <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              
              {/* Botón 1: TODOS (MODO POR DEFECTO PARA QUE NUNCA SE OCULTE DATA) */}
              <button
                type="button"
                onClick={() => setDateFilterMode('AMBOS')}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: dateFilterMode === 'AMBOS' ? 700 : 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: dateFilterMode === 'AMBOS' ? '#2563eb' : 'transparent',
                  color: dateFilterMode === 'AMBOS' ? '#ffffff' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s'
                }}
              >
                <Layers size={12} />
                <span>Todos en esta fecha</span>
                <span
                  style={{
                    background: dateFilterMode === 'AMBOS' ? '#1d4ed8' : '#e2e8f0',
                    color: dateFilterMode === 'AMBOS' ? '#ffffff' : '#475569',
                    padding: '1px 5px',
                    borderRadius: '99px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {dateMetrics.total}
                </span>
              </button>

              {/* Botón 2: LABORARON ESTE DÍA (JORNADA) */}
              <button
                type="button"
                onClick={() => setDateFilterMode('TRABAJADA')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: dateFilterMode === 'TRABAJADA' ? 700 : 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: dateFilterMode === 'TRABAJADA' ? '#2563eb' : 'transparent',
                  color: dateFilterMode === 'TRABAJADA' ? '#ffffff' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                <Clock size={13} />
                <span>Laboraron (Jornada)</span>
                <span
                  style={{
                    background: dateFilterMode === 'TRABAJADA' ? '#1d4ed8' : '#e2e8f0',
                    color: dateFilterMode === 'TRABAJADA' ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '99px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {dateMetrics.laboraron}
                </span>
              </button>

              {/* Botón 3: SE COMPENSAN ESTE DÍA (DESCANSO) */}
              <button
                type="button"
                onClick={() => setDateFilterMode('COMPENSACION')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: dateFilterMode === 'COMPENSACION' ? 700 : 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: dateFilterMode === 'COMPENSACION' ? '#2563eb' : 'transparent',
                  color: dateFilterMode === 'COMPENSACION' ? '#ffffff' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s'
                }}
              >
                <Sun size={13} />
                <span>Se compensan (Descanso)</span>
                <span
                  style={{
                    background: dateFilterMode === 'COMPENSACION' ? '#1d4ed8' : '#e2e8f0',
                    color: dateFilterMode === 'COMPENSACION' ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '99px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {dateMetrics.compensan}
                </span>
              </button>
            </div>
          </div>

          {/* Filtro por estado y buscador */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Filtrar Estado
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="form-input"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  style={{ paddingRight: '2rem', appearance: 'none', minWidth: 140, fontSize: '0.82rem' }}
                >
                  <option value="TODOS">Todos ({counts.total})</option>
                  <option value="PENDIENTE">Pendientes ({counts.pendiente})</option>
                  <option value="PROGRAMADO">Programados ({counts.programado})</option>
                  <option value="COMPENSADO">Compensados ({counts.compensado})</option>
                  <option value="ANULADO">Anulados ({counts.anulado})</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Buscar en tabla
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: 9, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="DNI, Nombre, Cargo, Área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '1.8rem', paddingRight: searchTerm ? '1.8rem' : '0.5rem', fontSize: '0.82rem', width: 210 }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: 2,
                      display: 'flex'
                    }}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Acceso Rápido: Fechas con Datos Registrados en la Base de Datos */}
        {datesWithData.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              borderTop: '1px dashed var(--border-color)',
              paddingTop: '0.75rem',
              fontSize: '0.75rem'
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={12} style={{ color: '#2563eb' }} /> Fechas con registros recientes:
            </span>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {datesWithData.map((item) => {
                const isSelected = dateFilterMode !== 'TODAS_LAS_FECHAS' && normalizeDateISO(selectedDate) === normalizeDateISO(item.date);
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => handleSelectDateChip(item.date)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#334155',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>{formatDateDisplay(item.date)}</span>
                    <span
                      style={{
                        background: isSelected ? '#2563eb' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}
                    >
                      {item.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── ALERTA SI NO HAY RESULTADOS EN ESTA FECHA PERO SÍ EN OTRAS FECHAS ── */}
      {searchTerm.trim() !== '' && filteredRecords.length === 0 && globalSearchMatches.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.85rem' }}>
            No se encontró <strong>"{searchTerm}"</strong> en la fecha {formatDateDisplay(selectedDate)}, pero existen <strong>{globalSearchMatches.length}</strong> registro(s) en otras fechas.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setDateFilterMode('TODAS_LAS_FECHAS')}
            style={{ fontWeight: 700, fontSize: '0.78rem' }}
          >
            <Globe size={13} /> Ver los {globalSearchMatches.length} en todas las fechas
          </button>
        </div>
      )}

      {/* ── ALERTA DE RESUMEN METRIC ── */}
      {records.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#1e293b' }}>
            <Users size={16} style={{ color: '#2563eb' }} />
            <span>
              <strong>{filteredRecords.length}</strong> trabajador(es) listados{' '}
              {dateFilterMode === 'TODAS_LAS_FECHAS' ? (
                <strong style={{ color: '#2563eb' }}>(Historial Completo)</strong>
              ) : (
                <>
                  para el <strong style={{ color: '#2563eb' }}>{formatDateDisplay(selectedDate)}</strong>
                  {dateFilterMode === 'TRABAJADA' && ' (Jornada laborada)'}
                  {dateFilterMode === 'COMPENSACION' && ' (Día libre programado)'}
                </>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {counts.pendiente > 0 && (
              <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                {counts.pendiente} Pendientes
              </span>
            )}
            {counts.programado > 0 && (
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                {counts.programado} Programados
              </span>
            )}
            {counts.compensado > 0 && (
              <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                {counts.compensado} Compensados
              </span>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openBulkPermissionSheetForDate(selectedDate)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1d4ed8',
                background: '#eff6ff',
                borderColor: '#bfdbfe',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title={`Generar e imprimir Hojas de Permiso en PDF para las compensaciones del ${formatDateDisplay(selectedDate)}`}
            >
              <Printer size={13} />
              <span>PDF Masivo de Permisos</span>
            </button>
          </div>
        </div>
      )}

      {/* ── BARRA DE ACCIÓN FLOTANTE SI HAY FECHAS PERSONALIZADAS POR GUARDAR ── */}
      {pendingCustomRowsCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            flexWrap: 'wrap',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
            <AlertTriangle size={17} style={{ color: '#d97706' }} />
            <span>
              Tienes <strong>{pendingCustomRowsCount}</strong> trabajador(es) con la casilla <u>"Compensar otro día"</u> activada y fecha personalizada lista.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-warning btn-sm"
            onClick={handleSaveAllCustomDates}
            style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={15} /> Guardar las {pendingCustomRowsCount} Fechas Nuevas
          </button>
        </div>
      )}

      {/* ── ESTADO VACÍO SI NO HAY REGISTROS ── */}
      {records.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '3rem 1.5rem',
            background: 'var(--surface-card)',
            border: '1px dashed var(--border-color)',
            borderRadius: '14px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <Search size={40} style={{ opacity: 0.3, color: '#2563eb' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
            No hay trabajadores registrados para el {formatDateDisplay(selectedDate)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: 500 }}>
            {dateFilterMode === 'COMPENSACION' && dateMetrics.laboraron > 0 ? (
              <>
                No hay compensaciones programadas para ejecutarse el {formatDateDisplay(selectedDate)}, pero <strong>hay {dateMetrics.laboraron} trabajadores que laboraron en esta jornada</strong>.
              </>
            ) : (
              'No se encontraron jornadas ni compensaciones registradas para esta fecha. Puedes seleccionar una fecha con datos en los botones de arriba o ver el historial completo.'
            )}
          </p>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {dateFilterMode === 'COMPENSACION' && dateMetrics.laboraron > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setDateFilterMode('TRABAJADA')}
              >
                <Clock size={14} /> Ver los {dateMetrics.laboraron} trabajadores que laboraron este día
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDateFilterMode('TODAS_LAS_FECHAS')}
            >
              <Globe size={14} /> Ver todo el historial ({allCompensations.length})
            </button>
          </div>
        </div>
      )}

      {/* ── TABLA DE RESULTADOS + BARRA DE ACCIÓN MASIVA ── */}
      {filteredRecords.length > 0 && (
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          {/* ── BARRA DE ACCIÓN EN BLOQUE ── */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '0.875rem 1.25rem',
              background: '#f8fafc',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                Acción para seleccionados ({checkedIds.size}):
              </span>

              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  type="button"
                  onClick={() => setBulkActionMode('COMPENSAR_HOY')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    fontSize: '0.78rem',
                    fontWeight: bulkActionMode === 'COMPENSAR_HOY' ? 700 : 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: bulkActionMode === 'COMPENSAR_HOY' ? '#059669' : '#cbd5e1',
                    background: bulkActionMode === 'COMPENSAR_HOY' ? '#059669' : '#ffffff',
                    color: bulkActionMode === 'COMPENSAR_HOY' ? '#ffffff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <CheckCircle2 size={13} />
                  Marcar como COMPENSADO
                </button>

                <button
                  type="button"
                  onClick={() => setBulkActionMode('COMPENSAR_OTRO_DIA')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    fontSize: '0.78rem',
                    fontWeight: bulkActionMode === 'COMPENSAR_OTRO_DIA' ? 700 : 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: bulkActionMode === 'COMPENSAR_OTRO_DIA' ? '#2563eb' : '#cbd5e1',
                    background: bulkActionMode === 'COMPENSAR_OTRO_DIA' ? '#2563eb' : '#ffffff',
                    color: bulkActionMode === 'COMPENSAR_OTRO_DIA' ? '#ffffff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <CalendarDays size={13} />
                  Compensar en otra fecha
                </button>
              </div>

              {bulkActionMode === 'COMPENSAR_OTRO_DIA' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Fecha:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bulkTargetDate}
                    onChange={(e) => setBulkTargetDate(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '3px 8px', maxWidth: 160 }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openBulkPermissionSheetForDate(selectedDate)}
                style={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#1e40af',
                  background: '#eff6ff',
                  borderColor: '#93c5fd'
                }}
                title="Abrir generador de Hojas de Permiso para las compensaciones de esta fecha"
              >
                <Printer size={14} />
                <span>🖨️ PDF Permisos</span>
              </button>

              <button
                type="button"
                disabled={checkedIds.size === 0 || isProcessing || (bulkActionMode === 'COMPENSAR_OTRO_DIA' && !bulkTargetDate)}
                onClick={handleBulkApply}
                className={`btn btn-sm ${bulkActionMode === 'COMPENSAR_HOY' ? 'btn-success' : 'btn-primary'}`}
                style={{ fontWeight: 700, fontSize: '0.82rem' }}
              >
                {bulkActionMode === 'COMPENSAR_HOY' ? (
                  <>
                    <CheckCircle2 size={15} /> Marcar {checkedIds.size} como COMPENSADOS
                  </>
                ) : (
                  <>
                    <CalendarCheck size={15} /> Asignar fecha a {checkedIds.size} trabajador(es)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── TABLA DE DATOS ── */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 36 }}>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos los elegibles'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {allSelected ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#64748b" />}
                    </button>
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DNI</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Apellidos y Nombres</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#334155', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Área / Cargo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Día Trabajado</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha Comp. Actual</th>
                  
                  {/* COLUMNA CLAVE: CHECKBOX "COMPENSAR OTRO DÍA" */}
                  <th
                    style={{
                      padding: '6px 10px',
                      textAlign: 'left',
                      fontWeight: 800,
                      color: '#1e40af',
                      background: '#eff6ff',
                      borderLeft: '1px solid #bfdbfe',
                      borderRight: '1px solid #bfdbfe',
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      minWidth: 200
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarDays size={13} color="#2563eb" />
                      <span>Compensar Otro Día</span>
                    </div>
                  </th>

                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#334155', minWidth: 110, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec, idx) => {
                  const isChecked = checkedIds.has(rec.id);
                  const isAnnulled = rec.estado === 'ANULADO';
                  const isAlreadyCompensated = rec.estado === 'COMPENSADO';

                  // Custom row state
                  const customCfg = rowCustomDates[rec.id];
                  const isCustomActive = !!customCfg?.enabled;
                  const customDateVal = customCfg?.date || '';

                  // Row background styling
                  let rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                  if (isCustomActive) {
                    rowBg = '#fffbeb'; // Soft yellow if custom date checkbox is on
                  } else if (isChecked) {
                    rowBg = bulkActionMode === 'COMPENSAR_HOY' ? '#f0fdf4' : '#eff6ff';
                  }

                  return (
                    <tr
                      key={rec.id}
                      style={{
                        background: rowBg,
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.12s',
                        opacity: isAnnulled ? 0.5 : 1
                      }}
                    >
                      {/* Checkbox de selección */}
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        {!isAnnulled ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(rec.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isChecked ? (
                              <CheckSquare size={15} color={bulkActionMode === 'COMPENSAR_HOY' ? '#059669' : '#2563eb'} />
                            ) : (
                              <Square size={15} color="#94a3b8" />
                            )}
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>

                      {/* DNI / Código */}
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }}>
                        {rec.empleado?.documentoIdentidad || rec.empleadoId}
                      </td>

                      {/* Apellidos y Nombres */}
                      <td style={{ padding: '5px 8px' }}>
                        <button
                          type="button"
                          onClick={() => openEmployeeCompensations(rec.empleadoId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontWeight: 700,
                            color: '#0f172a',
                            fontSize: '0.825rem',
                            textAlign: 'left',
                            display: 'block'
                          }}
                          title="Click para ver panel individual del trabajador"
                        >
                          {rec.empleado?.apellidosNombres || 'Trabajador no registrado'}
                        </button>
                        {rec.observacion && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.observacion}
                          </div>
                        )}
                      </td>

                      {/* Área / Cargo */}
                      <td style={{ padding: '5px 8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                          {rec.empleado?.area || '—'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {rec.empleado?.cargo || '—'}
                        </div>
                      </td>

                      {/* Día Trabajado */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.775rem', fontWeight: 600 }}>
                        {formatDateDisplay(rec.fechaGenerada)}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        {estadoBadge(rec.estado)}
                      </td>

                      {/* Fecha de Compensación Actual */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.775rem' }}>
                        {rec.fechaCompensacion ? (
                          <span style={{ fontWeight: 700, color: rec.estado === 'COMPENSADO' ? '#166534' : '#1e40af' }}>
                            {formatDateDisplay(rec.fechaCompensacion)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.725rem' }}>Sin programar</span>
                        )}
                      </td>

                      {/* ── CELDA INTERACTIVA: CHECKBOX "COMPENSAR OTRO DÍA" ── */}
                      <td
                        style={{
                          padding: '4px 10px',
                          background: isCustomActive ? '#fef3c7' : '#f8fafc',
                          borderLeft: '1px solid #bfdbfe',
                          borderRight: '1px solid #bfdbfe'
                        }}
                      >
                        {!isAlreadyCompensated && !isAnnulled ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {/* Checkbox de activación */}
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer',
                                fontSize: '0.725rem',
                                fontWeight: isCustomActive ? 700 : 500,
                                color: isCustomActive ? '#92400e' : '#475569',
                                userSelect: 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isCustomActive}
                                onChange={() => handleToggleRowCustomDate(rec.id, rec.fechaCompensacion)}
                                style={{ cursor: 'pointer', width: 13, height: 13 }}
                              />
                              <span>Compensar otro día</span>
                            </label>

                            {/* Selector de fecha inline al estar marcado */}
                            {isCustomActive && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <input
                                  type="date"
                                  className="form-input"
                                  value={customDateVal}
                                  onChange={(e) => handleRowCustomDateChange(rec.id, e.target.value)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 4px',
                                    height: '26px',
                                    width: '125px',
                                    background: '#ffffff',
                                    borderColor: '#d97706',
                                    fontWeight: 700
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleRowCustomDate(rec)}
                                  disabled={!customDateVal}
                                  title="Guardar esta nueva fecha"
                                  className="btn btn-warning btn-sm"
                                  style={{
                                    padding: '2px 6px',
                                    height: '26px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700
                                  }}
                                >
                                  <Save size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : isAlreadyCompensated ? (
                          <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={11} /> Ya compensado
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>Anulado</span>
                        )}
                      </td>

                      {/* Acciones Individuales Rápidas */}
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                          {!isAlreadyCompensated && !isAnnulled && (
                            <button
                              type="button"
                              onClick={() => handleMarkSingleCompensated(rec)}
                              title="Marcar como compensado en esta fecha"
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: '#dcfce7',
                                color: '#166534',
                                border: '1px solid #86efac',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                              }}
                            >
                              <CheckCircle2 size={11} /> Compensar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEmployeeCompensations(rec.empleadoId)}
                            title="Ver ficha completa en el panel del trabajador"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: '#ffffff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2
                            }}
                          >
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── FOOTER RESUMEN ── */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.76rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <span>
              Mostrando <strong>{filteredRecords.length}</strong> de {records.length} registro(s) encontrados
            </span>

            {checkedIds.size > 0 && (
              <span style={{ fontWeight: 700, color: bulkActionMode === 'COMPENSAR_HOY' ? '#059669' : '#2563eb' }}>
                • {checkedIds.size} trabajador(es) seleccionado(s)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
