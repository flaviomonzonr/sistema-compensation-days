import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  User,
  Sparkles,
  RotateCcw,
  Layers,
  ChevronDown,
  UserCheck,
  Users,
  Calendar,
  CalendarCheck,
  CheckSquare,
  Square,
  FileText,
  Files,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Empleado, Compensacion } from '../../types';
import { employeeService, compensationService, approverService } from '../../services';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { formatDateDisplay, parseDateString } from '../../utils/dateUtils';
import { ApproversManagementModal } from './ApproversManagementModal';
import {
  OfficialSheetData,
  SedeType,
  MotivoType,
  SEDES_LIST
} from './OfficialPermissionSheetDoc';

import { DualPermissionSheetDoc } from './DualPermissionSheetDoc';
import { cleanObservationForPrint } from '../../utils/observationUtils';
import './permissionPrint.css';

// Helper to normalize any date string to YYYY-MM-DD
function normalizeDateISO(val?: string | null): string {
  return parseDateString(val);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextDayISO(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const RRHH_SIGNATURE_CHOICES = [
  {
    id: 'maria_ramos',
    name: 'Lic. María Elena Ramos Paredes',
    title: 'Jefe de Recursos Humanos',
    url: '/firma-jefe-rrhh.png',
    badge: 'Firma 1'
  },
  {
    id: 'miguel_bocanegra',
    name: 'Miguel A. O. Bocanegra',
    title: 'Jefe de RRHH (Chavín)',
    url: '/firma-miguel-bocanegra.png',
    badge: 'Firma 2'
  }
];

export const PermissionSheetView: React.FC = () => {
  const {
    selectedEmployeeIdForCompensations,
    selectedCompensationIdsForPermissionSheet,
    setSelectedCompensationIdsForPermissionSheet,
    selectedDateForBulkPermissions,
    setSelectedDateForBulkPermissions,
    refreshKey,
    triggerRefresh
  } = useApp();
  const { success, warning, error } = useToast();

  // Mode: Individual (1 worker) vs Bulk (Batch by compensation date)
  const [viewMode, setViewMode] = useState<'individual' | 'bulk'>(
    selectedDateForBulkPermissions ? 'bulk' : 'individual'
  );

  const [approversRefreshKey, setApproversRefreshKey] = useState(0);
  const [isApproversModalOpen, setIsApproversModalOpen] = useState(false);

  const activeEmployees = useMemo(() => {
    return employeeService.getAll().filter((e) => e.estado === 'ACTIVO');
  }, [refreshKey]);

  const allCompensations = useMemo(() => {
    return compensationService.getAll();
  }, [refreshKey]);

  const approvers = useMemo(() => {
    return approverService.getAll({ estado: 'ACTIVO' });
  }, [refreshKey, approversRefreshKey]);

  // Distinct dates with scheduled compensations for quick chips
  const datesWithCompensations = useMemo(() => {
    const map = new Map<string, number>();
    allCompensations.forEach((c) => {
      if (c.fechaCompensacion && (c.estado === 'PROGRAMADO' || c.estado === 'COMPENSADO')) {
        const norm = normalizeDateISO(c.fechaCompensacion);
        if (norm) {
          map.set(norm, (map.get(norm) || 0) + 1);
        }
      }
    });

    const list: { date: string; count: number }[] = [];
    map.forEach((count, date) => {
      list.push({ date, count });
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allCompensations]);

  // -------------------------------------------------------------
  // COMMON CONFIG STATE (Aprobador único, Sede, Emisión, etc.)
  // -------------------------------------------------------------
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');
  const [aprobadoPor, setAprobadoPor] = useState<string>('Lic. María Elena Ramos Paredes');
  const [cargoAprobador, setCargoAprobador] = useState<string>('JEFE DE RECURSOS HUMANOS');
  const [sede, setSede] = useState<SedeType>('PLANTA SECHIN FRESCO');
  const [fechaEmision, setFechaEmision] = useState<string>(todayISO());
  const [responsableInmediato, setResponsableInmediato] = useState<string>('JEFE DE ÁREA / SUPERVISOR');
  const [tiempoSolicitado, setTiempoSolicitado] = useState<string>('1 DÍA (JORNADA COMPLETA)');
  const [motivo, setMotivo] = useState<MotivoType>('OTROS');
  const [motivoOtroEspecifique, setMotivoOtroEspecifique] = useState<string>('COMPENSACIÓN DE DÍA TRABAJADO');
  const [includeRrhhSignature, setIncludeRrhhSignature] = useState<boolean>(false);
  const [selectedSignatureUrl, setSelectedSignatureUrl] = useState<string>('/firma-jefe-rrhh.png');

  // Preselect approver if available
  useEffect(() => {
    if (approvers.length > 0 && !selectedApproverId) {
      const first = approvers[0];
      setSelectedApproverId(first.id);
      setAprobadoPor(first.nombreCompleto);
      setCargoAprobador(first.cargo);
      if (first.firmaUrl) {
        setSelectedSignatureUrl(first.firmaUrl);
      }
    }
  }, [approvers]);

  // -------------------------------------------------------------
  // INDIVIDUAL MODE STATE
  // -------------------------------------------------------------
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [tipoDocumento, setTipoDocumento] = useState<string>('D.N.I.');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [apellidosNombres, setApellidosNombres] = useState<string>('');
  const [condicionLaboral, setCondicionLaboral] = useState<'OBRERO' | 'EMPLEADO'>('EMPLEADO');
  const [labor, setLabor] = useState<string>('');
  const [inicia, setInicia] = useState<string>('');
  const [finaliza, setFinaliza] = useState<string>('');
  const [diaRetorno, setDiaRetorno] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [registerCompDate, setRegisterCompDate] = useState<string>('');
  const [isSavingComps, setIsSavingComps] = useState<boolean>(false);

  // Selected Employee object (Individual)
  const selectedEmployee: Empleado | undefined = useMemo(() => {
    return activeEmployees.find((e) => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, activeEmployees]);

  // Compensations of selected employee (Individual)
  const employeeCompensations: Compensacion[] = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return compensationService.getByEmployee(selectedEmployeeId);
  }, [selectedEmployeeId, refreshKey]);

  // Preselect employee from context or default
  useEffect(() => {
    if (selectedEmployeeIdForCompensations) {
      setSelectedEmployeeId(selectedEmployeeIdForCompensations);
    } else if (activeEmployees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(activeEmployees[0].id);
    }
  }, [selectedEmployeeIdForCompensations, activeEmployees]);

  // Helper to recompute observations and dates from selected IDs
  const applySelectedCompensations = (
    compsList: Compensacion[],
    selectedIds: string[],
    overrideDate?: string
  ) => {
    if (selectedIds.length === 0) {
      setObservaciones('');
      setTiempoSolicitado('1 DÍA (JORNADA COMPLETA)');
      return;
    }

    const selectedComps = compsList.filter((c) => selectedIds.includes(c.id));
    const count = selectedComps.length;
    setTiempoSolicitado(`${count} DÍA${count > 1 ? 'S' : ''} (JORNADA COMPLETA)`);

    // Extract dates
    const withDates = selectedComps
      .filter((c) => c.fechaCompensacion)
      .map((c) => normalizeDateISO(c.fechaCompensacion))
      .filter(Boolean)
      .sort();

    let effStartDate = '';
    let effEndDate = '';

    if (withDates.length > 0) {
      effStartDate = withDates[0];
      effEndDate = withDates[withDates.length - 1];
    } else if (overrideDate) {
      effStartDate = normalizeDateISO(overrideDate);
      effEndDate = effStartDate;
    } else if (inicia) {
      effStartDate = normalizeDateISO(inicia);
      effEndDate = finaliza ? normalizeDateISO(finaliza) : effStartDate;
    }

    if (effStartDate) {
      setInicia(effStartDate);
      setFinaliza(effEndDate || effStartDate);
      setDiaRetorno(getNextDayISO(effEndDate || effStartDate));
    }

    const lines = selectedComps.map((c, idx) => {
      const num = selectedComps.length > 1 ? `${idx + 1}. ` : '';
      const cCompDate = c.fechaCompensacion ? normalizeDateISO(c.fechaCompensacion) : effStartDate;
      const compDateStr = cCompDate ? formatDateDisplay(cCompDate) : 'POR ASIGNAR';
      const cleanObs = cleanObservationForPrint(c.observacion);
      return `${num}COMPENSACIÓN DE DÍA TRABAJADO (${formatDateDisplay(c.fechaGenerada)}) POR DÍA DE DESCANSO (${compDateStr})${cleanObs ? ' - ' + cleanObs : ''}.`;
    });

    setObservaciones(lines.join('\n'));
  };

  // Consume preselected compensation IDs when provided
  useEffect(() => {
    if (selectedCompensationIdsForPermissionSheet && selectedCompensationIdsForPermissionSheet.length > 0) {
      setSelectedCompIds(selectedCompensationIdsForPermissionSheet);
      if (selectedEmployeeId) {
        const comps = compensationService.getByEmployee(selectedEmployeeId);
        applySelectedCompensations(comps, selectedCompensationIdsForPermissionSheet);
      }
      setSelectedCompensationIdsForPermissionSheet(null);
    }
  }, [selectedCompensationIdsForPermissionSheet, selectedEmployeeId]);

  // When selected employee changes, update auto-filled fields
  useEffect(() => {
    if (selectedEmployee) {
      setApellidosNombres(selectedEmployee.apellidosNombres);
      setNumeroDocumento(selectedEmployee.documentoIdentidad);
      setTipoDocumento('D.N.I.');
      setLabor(selectedEmployee.cargo || selectedEmployee.area || '');
      setCondicionLaboral(selectedEmployee.tipoTrabajador === 'OBRERO' ? 'OBRERO' : 'EMPLEADO');

      const compensations = compensationService.getByEmployee(selectedEmployee.id);

      // If we don't already have a selection arriving from context
      if (!selectedCompensationIdsForPermissionSheet || selectedCompensationIdsForPermissionSheet.length === 0) {
        // Prioritize compensations that HAVE a compensation date assigned, and sort most recent first
        const activeComps = compensations
          .filter((c) => c.estado !== 'ANULADO')
          .sort((a, b) => {
            const hasA = Boolean(a.fechaCompensacion);
            const hasB = Boolean(b.fechaCompensacion);
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            const dateA = a.fechaCompensacion || a.fechaGenerada || '';
            const dateB = b.fechaCompensacion || b.fechaGenerada || '';
            return dateB.localeCompare(dateA);
          });

        if (activeComps.length > 0) {
          // Preselect the first active compensation (prioritizing scheduled/compensated ones)
          const first = activeComps[0];
          setSelectedCompIds([first.id]);
          applySelectedCompensations(compensations, [first.id]);
        } else {
          setSelectedCompIds([]);
          setObservaciones('');
          setInicia('');
          setFinaliza('');
          setDiaRetorno('');
        }
      }
    }
  }, [selectedEmployeeId]);

  // Toggle selection of compensation records for individual mode
  const handleToggleCompensation = (comp: Compensacion) => {
    const isSelected = selectedCompIds.includes(comp.id);
    let newSelected: string[];
    if (isSelected) {
      newSelected = selectedCompIds.filter((id) => id !== comp.id);
    } else {
      newSelected = [...selectedCompIds, comp.id];
    }
    setSelectedCompIds(newSelected);
    applySelectedCompensations(employeeCompensations, newSelected);
  };

  // Direct action: Save / Schedule compensation date for selected pending records
  const handleSaveCompensationDates = () => {
    if (!registerCompDate) {
      warning('Seleccione la fecha en que se compensará el/los día(s) libre(s).');
      return;
    }

    if (selectedCompIds.length === 0) {
      warning('Debe seleccionar al menos un día trabajado para asignarle fecha de compensación.');
      return;
    }

    setIsSavingComps(true);
    let okCount = 0;
    const errorsList: string[] = [];

    selectedCompIds.forEach((id) => {
      const comp = employeeCompensations.find((c) => c.id === id);
      if (!comp) return;

      if (comp.fechaGenerada === registerCompDate) {
        errorsList.push(`El día generado (${formatDateDisplay(comp.fechaGenerada)}) no puede ser igual a la fecha de compensación.`);
        return;
      }

      const res = compensationService.scheduleCompensation(id, {
        fechaCompensacion: registerCompDate,
        observacion: comp.observacion || 'Compensación de día trabajado'
      });

      if (res.success) {
        okCount++;
      } else if (res.error) {
        errorsList.push(res.error);
      }
    });

    setIsSavingComps(false);

    if (okCount > 0) {
      success(
        `Se registró la fecha de compensación (${formatDateDisplay(registerCompDate)}) para ${okCount} día(s).`,
        'Compensación Programada'
      );
      setInicia(registerCompDate);
      setFinaliza(registerCompDate);
      setDiaRetorno(getNextDayISO(registerCompDate));
      triggerRefresh();
      const updated = compensationService.getByEmployee(selectedEmployeeId);
      applySelectedCompensations(updated, selectedCompIds, registerCompDate);
    }

    if (errorsList.length > 0) {
      error(errorsList.slice(0, 2).join(' | '));
    }
  };

  // -------------------------------------------------------------
  // BULK MODE STATE (Generación Masiva por Día de Compensación)
  // -------------------------------------------------------------
  const initialBulkDate = useMemo(() => {
    if (selectedDateForBulkPermissions) {
      return selectedDateForBulkPermissions;
    }
    if (datesWithCompensations.length > 0) {
      return datesWithCompensations[0].date;
    }
    return todayISO();
  }, [selectedDateForBulkPermissions, datesWithCompensations]);

  const [bulkCompensationDate, setBulkCompensationDate] = useState<string>(initialBulkDate);
  const [selectedBulkRecordIds, setSelectedBulkRecordIds] = useState<Set<string>>(new Set());
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<'all' | 'paginated'>('paginated');

  // Handle preloaded date from context
  useEffect(() => {
    if (selectedDateForBulkPermissions) {
      setViewMode('bulk');
      setBulkCompensationDate(selectedDateForBulkPermissions);
      setSelectedDateForBulkPermissions(null);
    }
  }, [selectedDateForBulkPermissions]);

  // Find all compensations that have fechaCompensacion === bulkCompensationDate
  const bulkDateCompensations = useMemo(() => {
    const normTarget = normalizeDateISO(bulkCompensationDate);
    if (!normTarget) return [];
    return allCompensations.filter((c) => {
      const normComp = normalizeDateISO(c.fechaCompensacion);
      return normComp === normTarget && c.estado !== 'ANULADO';
    });
  }, [allCompensations, bulkCompensationDate]);

  // Auto-select all records when the date changes
  useEffect(() => {
    const ids = new Set(bulkDateCompensations.map((c) => c.id));
    setSelectedBulkRecordIds(ids);
    setBulkPreviewIndex(0);
  }, [bulkDateCompensations]);

  const toggleBulkSelectAll = () => {
    if (selectedBulkRecordIds.size === bulkDateCompensations.length) {
      setSelectedBulkRecordIds(new Set());
    } else {
      setSelectedBulkRecordIds(new Set(bulkDateCompensations.map((c) => c.id)));
    }
  };

  const toggleBulkSelectOne = (id: string) => {
    setSelectedBulkRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group selected compensations by employee for bulk generation
  const bulkGeneratedSheetsData: OfficialSheetData[] = useMemo(() => {
    if (viewMode !== 'bulk') return [];

    const normCompDate = normalizeDateISO(bulkCompensationDate);
    const returnDate = getNextDayISO(normCompDate);

    // Filter to checked items
    const selectedComps = bulkDateCompensations.filter((c) => selectedBulkRecordIds.has(c.id));

    // Group by employee
    const byEmp = new Map<string, typeof selectedComps>();
    selectedComps.forEach((c) => {
      const empId = c.empleadoId;
      const list = byEmp.get(empId) || [];
      list.push(c);
      byEmp.set(empId, list);
    });

    const sheets: OfficialSheetData[] = [];

    byEmp.forEach((comps, empId) => {
      const emp = comps[0]?.empleado || activeEmployees.find((e) => e.id === empId);

      const lines = comps.map((c, idx) => {
        const prefix = comps.length > 1 ? `${idx + 1}. ` : '';
        const workedStr = formatDateDisplay(c.fechaGenerada);
        const compStr = formatDateDisplay(c.fechaCompensacion || normCompDate);
        const cleanObs = cleanObservationForPrint(c.observacion);
        return `${prefix}COMPENSACIÓN DE DÍA TRABAJADO (${workedStr}) POR DÍA DE DESCANSO (${compStr})${cleanObs ? '. MOTIVO: ' + cleanObs : ''}.`;
      });

      sheets.push({
        id: empId,
        fechaEmision,
        sede,
        tipoDocumento: 'D.N.I.',
        numeroDocumento: emp?.documentoIdentidad || '',
        apellidosNombres: emp?.apellidosNombres || 'TRABAJADOR NO ENCONTRADO',
        condicionLaboral: emp?.tipoTrabajador === 'OBRERO' ? 'OBRERO' : 'EMPLEADO',
        labor: emp?.cargo || emp?.area || '',
        responsableInmediato,
        tiempoSolicitado: `${comps.length} DÍA(S) (JORNADA COMPLETA)`,
        motivo,
        motivoOtroEspecifique,
        aprobadoPor,
        cargoAprobador,
        inicia: normCompDate,
        finaliza: normCompDate,
        diaRetorno: returnDate,
        observaciones: lines.join('\n')
      });
    });

    return sheets;
  }, [
    viewMode,
    bulkCompensationDate,
    bulkDateCompensations,
    selectedBulkRecordIds,
    activeEmployees,
    fechaEmision,
    sede,
    responsableInmediato,
    motivo,
    motivoOtroEspecifique,
    aprobadoPor,
    cargoAprobador
  ]);

  // Individual Sheet Data Object
  const individualSheetData: OfficialSheetData = useMemo(() => {
    return {
      fechaEmision,
      sede,
      tipoDocumento,
      numeroDocumento,
      apellidosNombres,
      condicionLaboral,
      labor,
      responsableInmediato,
      tiempoSolicitado,
      motivo,
      motivoOtroEspecifique,
      aprobadoPor,
      cargoAprobador,
      inicia,
      finaliza,
      diaRetorno,
      observaciones
    };
  }, [
    fechaEmision,
    sede,
    tipoDocumento,
    numeroDocumento,
    apellidosNombres,
    condicionLaboral,
    labor,
    responsableInmediato,
    tiempoSolicitado,
    motivo,
    motivoOtroEspecifique,
    aprobadoPor,
    cargoAprobador,
    inicia,
    finaliza,
    diaRetorno,
    observaciones
  ]);

  // Print Action
  const handlePrint = () => {
    if (viewMode === 'bulk' && bulkGeneratedSheetsData.length === 0) {
      warning('Selecciona al menos un trabajador para imprimir.');
      return;
    }
    window.print();
  };

  const handleResetForm = () => {
    setFechaEmision(todayISO());
    setSede('PLANTA SECHIN FRESCO');
    setTiempoSolicitado('1 DÍA (JORNADA COMPLETA)');
    setMotivo('OTROS');
    setMotivoOtroEspecifique('COMPENSACIÓN DE DÍA TRABAJADO');
    if (approvers.length > 0) {
      setSelectedApproverId(approvers[0].id);
      setAprobadoPor(approvers[0].nombreCompleto);
      setCargoAprobador(approvers[0].cargo);
    }
    setInicia('');
    setFinaliza('');
    setDiaRetorno('');
    setObservaciones('');
    setSelectedCompIds([]);
    success('Formato restablecido.', 'Listo');
  };

  return (
    <div className="permission-sheet-page">
      {/* ── HEADER SUPERIOR Y BARRA DE ACCIÓN ── */}
      <div
        className="flex items-center justify-between no-print"
        style={{
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.65rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, margin: 0 }}>
              Hoja de Permiso del Personal
            </h2>
            <span
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.725rem',
                fontWeight: 700
              }}
            >
              Formato Chavín AGCH-R-RH-770-02
            </span>
          </div>
          <span style={{ fontSize: '0.775rem', color: '#64748b' }}>
            Generación e impresión directa en papel A4 / Guardar como PDF
          </span>
        </div>

        {/* SELECTOR DE MODO: INDIVIDUAL vs MASIVO */}
        <div className="permission-mode-tabs">
          <button
            type="button"
            className={`permission-mode-tab-btn ${viewMode === 'individual' ? 'active' : ''}`}
            onClick={() => setViewMode('individual')}
          >
            <FileText size={15} />
            <span>Permiso Individual (1 a 1)</span>
          </button>

          <button
            type="button"
            className={`permission-mode-tab-btn ${viewMode === 'bulk' ? 'active' : ''}`}
            onClick={() => setViewMode('bulk')}
          >
            <Files size={15} />
            <span>Generación Masiva por Fecha</span>
          </button>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsApproversModalOpen(true)}
            icon={<Users size={14} style={{ color: '#2563eb' }} />}
            title="Administrar la lista de jefes y gerentes autorizados para firmar permisos"
          >
            Configurar Aprobadores
          </Button>

          {viewMode === 'individual' && (
            <Button variant="secondary" size="sm" onClick={handleResetForm} icon={<RotateCcw size={14} />}>
              Restablecer
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer size={15} />}
            style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
              boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
              fontWeight: 700
            }}
          >
            {viewMode === 'individual'
              ? '🖨️ Imprimir Permiso A4 (Original + Copia en 1 Sola Hoja)'
              : `🖨️ Imprimir Lote A4 (${bulkGeneratedSheetsData.length} Hojas A4: 1 Hoja por Trabajador con Original + Copia)`}
          </Button>
        </div>
      </div>

      {/* ====================================================================
          MODO 1: PERMISO INDIVIDUAL (1 TRABAJADOR)
         ==================================================================== */}
      {viewMode === 'individual' && (
        <div className="permission-workspace">
          {/* PANEL DE FORMULARIO / CONTROLES INDIVIDUAL */}
          <div className="permission-controls-card no-print">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.5rem'
              }}
            >
              <Layers size={16} style={{ color: '#2563eb' }} />
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Datos para el Llenado Automático</strong>
            </div>

            {/* 1. Selector de Trabajador */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{ fontWeight: 700, fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <User size={13} style={{ color: '#2563eb' }} />
                1. Seleccionar Trabajador:
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="form-input"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    background: '#eff6ff',
                    borderColor: '#93c5fd',
                    paddingRight: '2rem'
                  }}
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.apellidosNombres} (DNI: {emp.documentoIdentidad} - {emp.area})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2563eb',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            {/* 2. Sede y Emisión */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.725rem' }}>
                  2. Sede Laboral:
                </label>
                <select
                  className="form-input"
                  value={sede}
                  onChange={(e) => setSede(e.target.value as SedeType)}
                  style={{ fontSize: '0.75rem' }}
                >
                  {SEDES_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.725rem' }}>
                  Fecha de Emisión:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                />
              </div>
            </div>

            {/* 3. Labor y Responsable Inmediato */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                  Labor / Cargo:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                  Responsable Inmediato:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={responsableInmediato}
                  onChange={(e) => setResponsableInmediato(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                />
              </div>
            </div>

            {/* 4. Tiempo Solicitado y Condición */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                  Condición:
                </label>
                <select
                  className="form-input"
                  value={condicionLaboral}
                  onChange={(e) => setCondicionLaboral(e.target.value as 'OBRERO' | 'EMPLEADO')}
                  style={{ fontSize: '0.75rem' }}
                >
                  <option value="EMPLEADO">EMPLEADO</option>
                  <option value="OBRERO">OBRERO</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                  Tiempo Solicitado:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={tiempoSolicitado}
                  onChange={(e) => setTiempoSolicitado(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                />
              </div>
            </div>

            {/* 5. Fechas del Permiso (Inicia, Finaliza, Retorno) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Inicia:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={inicia}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInicia(val);
                    if (!finaliza || finaliza < val) setFinaliza(val);
                    setDiaRetorno(getNextDayISO(val));
                    if (selectedCompIds.length > 0) {
                      applySelectedCompensations(employeeCompensations, selectedCompIds, val);
                    }
                  }}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.35rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Finaliza:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={finaliza}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFinaliza(val);
                    setDiaRetorno(getNextDayISO(val));
                  }}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.35rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Día de Retorno:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={diaRetorno}
                  onChange={(e) => setDiaRetorno(e.target.value)}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.35rem' }}
                />
              </div>
            </div>

            {/* 6. Selección de Aprobador */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <UserCheck size={13} style={{ color: '#2563eb' }} />
                6. Aprobado Por (Jefe o Gerente):
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="form-input"
                  value={selectedApproverId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedApproverId(val);
                    if (val && val !== 'manual') {
                      const found = approvers.find((a) => a.id === val);
                      if (found) {
                        setAprobadoPor(found.nombreCompleto);
                        setCargoAprobador(found.cargo);
                        if (found.firmaUrl) {
                          setSelectedSignatureUrl(found.firmaUrl);
                        } else if (found.nombreCompleto.toLowerCase().includes('bocanegra')) {
                          setSelectedSignatureUrl('/firma-miguel-bocanegra.png');
                        } else if (found.nombreCompleto.toLowerCase().includes('ramos')) {
                          setSelectedSignatureUrl('/firma-jefe-rrhh.png');
                        }
                      }
                    }
                  }}
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    background: '#eff6ff',
                    borderColor: '#93c5fd',
                    paddingRight: '2rem'
                  }}
                >
                  <option value="">-- Seleccionar Aprobador Registrado --</option>
                  {approvers.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.nombreCompleto} — [{app.cargo}]
                    </option>
                  ))}
                  <option value="manual">✍️ Ingresar manualmente / Otro...</option>
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2563eb',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Nombre del Aprobador:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={aprobadoPor}
                  onChange={(e) => {
                    setAprobadoPor(e.target.value);
                    setSelectedApproverId('manual');
                  }}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Cargo del Aprobador:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={cargoAprobador}
                  onChange={(e) => {
                    setCargoAprobador(e.target.value);
                    setSelectedApproverId('manual');
                  }}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                />
              </div>
            </div>

            {/* Días compensados del trabajador (Selector interactivo con registro de fecha) */}
            {employeeCompensations.length > 0 && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={13} style={{ color: '#2563eb' }} />
                    Días disponibles del trabajador ({selectedCompIds.length}/{employeeCompensations.filter(c => c.estado !== 'ANULADO').length}):
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const activeIds = employeeCompensations.filter(c => c.estado !== 'ANULADO').map(c => c.id);
                        setSelectedCompIds(activeIds);
                        applySelectedCompensations(employeeCompensations, activeIds);
                      }}
                      style={{ fontSize: '0.675rem', padding: '1px 5px', color: '#2563eb' }}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSelectedCompIds([]);
                        applySelectedCompensations(employeeCompensations, []);
                      }}
                      style={{ fontSize: '0.675rem', padding: '1px 5px', color: '#64748b' }}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Lista de compensaciones con estados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '130px', overflowY: 'auto', paddingRight: '2px' }}>
                  {employeeCompensations.map((c) => {
                    const isChecked = selectedCompIds.includes(c.id);
                    const isPending = c.estado === 'PENDIENTE';
                    const isScheduled = c.estado === 'PROGRAMADO';
                    const isCompensated = c.estado === 'COMPENSADO';
                    const isAnnulled = c.estado === 'ANULADO';

                    return (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem',
                          fontSize: '0.7rem',
                          cursor: isAnnulled ? 'not-allowed' : 'pointer',
                          background: isChecked ? '#eff6ff' : '#ffffff',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${isChecked ? '#93c5fd' : '#e2e8f0'}`,
                          opacity: isAnnulled ? 0.6 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isAnnulled}
                            onChange={() => handleToggleCompensation(c)}
                            style={{ width: 13, height: 13, cursor: isAnnulled ? 'not-allowed' : 'pointer' }}
                          />
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              Trabajado: {formatDateDisplay(c.fechaGenerada)}
                            </span>
                            <span style={{ color: '#64748b', marginLeft: '4px' }}>
                              → Compensa: <strong>{c.fechaCompensacion ? formatDateDisplay(c.fechaCompensacion) : 'Sin fecha (Pendiente)'}</strong>
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isPending
                              ? '#fef3c7'
                              : isScheduled
                              ? '#dbeafe'
                              : isCompensated
                              ? '#dcfce7'
                              : '#f1f5f9',
                            color: isPending
                              ? '#b45309'
                              : isScheduled
                              ? '#1d4ed8'
                              : isCompensated
                              ? '#15803d'
                              : '#64748b'
                          }}
                        >
                          {c.estado}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Sub-panel interactivo para registrar / programar fecha de compensación */}
                {selectedCompIds.length > 0 && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px dashed #93c5fd',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      marginTop: '0.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CalendarCheck size={12} />
                      Registrar qué día se compensa ({selectedCompIds.length} selec.):
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        className="form-input"
                        value={registerCompDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegisterCompDate(val);
                          if (val) {
                            setInicia(val);
                            setFinaliza(val);
                            setDiaRetorno(getNextDayISO(val));
                          }
                        }}
                        style={{ fontSize: '0.725rem', padding: '0.2rem 0.4rem', flex: 1 }}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveCompensationDates}
                        disabled={!registerCompDate || isSavingComps}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', whiteSpace: 'nowrap' }}
                      >
                        {isSavingComps ? 'Guardando...' : '💾 Guardar Fecha'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. Firma Digital de RRHH y Selección de Sello */}
            <div
              style={{
                background: includeRrhhSignature ? '#f8fafc' : '#f8fafc',
                border: `1px solid ${includeRrhhSignature ? '#93c5fd' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
                onClick={() => setIncludeRrhhSignature(!includeRrhhSignature)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>✍️</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: includeRrhhSignature ? '#1e40af' : '#475569' }}>
                      Firma Digital Jefe de RRHH
                    </div>
                    <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                      {includeRrhhSignature ? 'Incluir sello y firma en el formato' : 'Desactivada (recuadro vacío para firma manual)'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeRrhhSignature}
                  onChange={(e) => setIncludeRrhhSignature(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </div>

              {includeRrhhSignature && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                  {RRHH_SIGNATURE_CHOICES.map((choice) => {
                    const isSelected = selectedSignatureUrl === choice.url;
                    return (
                      <div
                        key={choice.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSignatureUrl(choice.url);
                          setAprobadoPor(choice.name);
                          setCargoAprobador(choice.title.toUpperCase());
                        }}
                        style={{
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          padding: '0.4rem 0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.2)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              background: isSelected ? '#2563eb' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : '#475569',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}
                          >
                            {choice.badge}
                          </span>
                          {isSelected && <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 800 }}>✓ Activa</span>}
                        </div>
                        <div
                          style={{
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#ffffff',
                            borderRadius: '4px',
                            border: '1px solid #f1f5f9',
                            padding: '2px'
                          }}
                        >
                          <img
                            src={choice.url}
                            alt={choice.name}
                            style={{ maxHeight: '38px', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.15 }}>
                          {choice.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 8. Copia Automática del Formato (Original + Copia/Cargo) */}
            {/* 8. Formato Duplicado Oficial (2 en 1) */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.9rem' }}>📑</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af' }}>
                  Formato 2 en 1 (Original + Copia en 1 Sola Hoja A4)
                </div>
              </div>
              <div style={{ fontSize: '0.675rem', color: '#475569', lineHeight: 1.25 }}>
                Al imprimir, se emite 1 sola hoja A4 con el <strong>ORIGINAL (RRHH)</strong> arriba y la <strong>COPIA (TRABAJADOR)</strong> abajo, separados por línea de corte punteada ✂️.
              </div>
            </div>

            {/* Observaciones */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                Observaciones (Impresas en el documento):
              </label>
              <textarea
                className="form-input"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalle de días compensados o motivo..."
                style={{ fontSize: '0.75rem', lineHeight: 1.3 }}
              />
            </div>
          </div>

          {/* VISTA PREVIA Y CONTENEDOR DE IMPRESIÓN INDIVIDUAL */}
          <div className="permission-preview-wrapper">
            {/* BARRA DE VISTA PREVIA EN PANTALLA */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                width: '100%',
                maxWidth: '198mm'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af' }}>
                  📄 Hoja A4 (Original + Copia en 1 Sola Hoja con línea de corte ✂️)
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                icon={<Printer size={14} />}
                style={{ fontWeight: 700 }}
              >
                Imprimir Hoja A4
              </Button>
            </div>

            {/* VISTA PREVIA EN PANTALLA (no-print) */}
            <div className="no-print" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <DualPermissionSheetDoc
                data={individualSheetData}
                showRrhhSignature={includeRrhhSignature}
                rrhhSignatureUrl={selectedSignatureUrl}
              />
            </div>

            {/* CONTENEDOR DE IMPRESIÓN (PRINT MEDIA ONLY) */}
            <div className="print-only-container" style={{ width: '100%' }}>
              <DualPermissionSheetDoc
                data={individualSheetData}
                isPrintable
                showRrhhSignature={includeRrhhSignature}
                rrhhSignatureUrl={selectedSignatureUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODO 2: GENERACIÓN MASIVA POR DÍA DE COMPENSACIÓN (PDF MASIVO)
         ==================================================================== */}
      {viewMode === 'bulk' && (
        <div className="permission-workspace-bulk">
          {/* PANEL DE CONTROL MASIVO (IZQUIERDA) */}
          <div className="permission-controls-card no-print">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} style={{ color: '#2563eb' }} />
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                  Lote por Día de Compensación
                </strong>
              </div>
              <span
                style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '99px'
                }}
              >
                {selectedBulkRecordIds.size} de {bulkDateCompensations.length} seleccionados
              </span>
            </div>

            {/* 1. SELECCIÓN DEL DÍA DE COMPENSACIÓN */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{ fontWeight: 700, fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Calendar size={13} style={{ color: '#2563eb' }} />
                1. Seleccionar Día de Compensación (Descanso):
              </label>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-input"
                  value={bulkCompensationDate}
                  onChange={(e) => setBulkCompensationDate(e.target.value)}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    padding: '0.35rem 0.6rem',
                    flex: 1
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBulkCompensationDate(todayISO())}
                  style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem', fontWeight: 600 }}
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* Chips de fechas con compensaciones programadas */}
            {datesWithCompensations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={11} style={{ color: '#2563eb' }} /> Fechas con compensaciones programadas:
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {datesWithCompensations.slice(0, 6).map((item) => {
                    const isSelected = normalizeDateISO(bulkCompensationDate) === normalizeDateISO(item.date);
                    return (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => setBulkCompensationDate(item.date)}
                        style={{
                          padding: '2px 7px',
                          borderRadius: '5px',
                          border: '1px solid',
                          borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>{formatDateDisplay(item.date)}</span>
                        <span
                          style={{
                            background: isSelected ? '#2563eb' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#475569',
                            padding: '0 4px',
                            borderRadius: '3px',
                            fontSize: '0.65rem',
                            fontWeight: 700
                          }}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. TABLA DE TRABAJADORES A COMPENSAR EN ESA FECHA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 0 }}>
                  2. Trabajadores que compensan el {formatDateDisplay(bulkCompensationDate)}:
                </label>
                {bulkDateCompensations.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleBulkSelectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {selectedBulkRecordIds.size === bulkDateCompensations.length
                      ? 'Deseleccionar Todos'
                      : 'Seleccionar Todos'}
                  </button>
                )}
              </div>

              {bulkDateCompensations.length === 0 ? (
                <div
                  style={{
                    padding: '1.25rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    textAlign: 'center',
                    color: '#64748b'
                  }}
                >
                  <AlertCircle size={24} style={{ color: '#94a3b8', margin: '0 auto 0.35rem auto' }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    No hay trabajadores con compensación para el {formatDateDisplay(bulkCompensationDate)}
                  </div>
                  <div style={{ fontSize: '0.725rem', marginTop: '0.2rem' }}>
                    Elige una fecha con datos en los accesos rápidos de arriba o programa descansos en el módulo de Compensaciones.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#ffffff'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: 30, padding: '4px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={toggleBulkSelectAll}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {selectedBulkRecordIds.size === bulkDateCompensations.length ? (
                              <CheckSquare size={14} color="#2563eb" />
                            ) : (
                              <Square size={14} color="#94a3b8" />
                            )}
                          </button>
                        </th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>
                          Trabajador / DNI
                        </th>
                        <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                          Día Laborado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkDateCompensations.map((rec) => {
                        const isChecked = selectedBulkRecordIds.has(rec.id);
                        return (
                          <tr
                            key={rec.id}
                            style={{
                              background: isChecked ? '#eff6ff' : '#ffffff',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer'
                            }}
                            onClick={() => toggleBulkSelectOne(rec.id)}
                          >
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by tr onClick
                                style={{ cursor: 'pointer', width: 13, height: 13 }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.75rem' }}>
                                {rec.empleado?.apellidosNombres || 'Trabajador'}
                              </div>
                              <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                                DNI: {rec.empleado?.documentoIdentidad} • {rec.empleado?.area || ''}
                              </div>
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.725rem', fontWeight: 700, color: '#1e40af' }}>
                              {formatDateDisplay(rec.fechaGenerada)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. CONFIGURACIÓN DEL APROBADOR ÚNICO (COMÚN A TODO EL LOTE) */}
            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label
                  className="form-label"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginBottom: 0,
                    color: '#0f172a'
                  }}
                >
                  <UserCheck size={13} style={{ color: '#2563eb' }} />
                  3. Aprobador Único para el Lote:
                </label>
                <button
                  type="button"
                  onClick={() => setIsApproversModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  + Administrar Aprobadores
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <select
                  className="form-input"
                  value={selectedApproverId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedApproverId(val);
                    if (val && val !== 'manual') {
                      const found = approvers.find((a) => a.id === val);
                      if (found) {
                        setAprobadoPor(found.nombreCompleto);
                        setCargoAprobador(found.cargo);
                      }
                    }
                  }}
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    background: '#eff6ff',
                    borderColor: '#93c5fd',
                    paddingRight: '2rem'
                  }}
                >
                  <option value="">-- Seleccionar Aprobador Oficial --</option>
                  {approvers.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.nombreCompleto} — [{app.cargo}]
                    </option>
                  ))}
                  <option value="manual">✍️ Ingresar manualmente / Otro...</option>
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2563eb',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
                <div>
                  <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#475569' }}>
                    Nombre del Aprobador:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={aprobadoPor}
                    onChange={(e) => {
                      setAprobadoPor(e.target.value);
                      setSelectedApproverId('manual');
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#475569' }}>
                    Cargo del Aprobador:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={cargoAprobador}
                    onChange={(e) => {
                      setCargoAprobador(e.target.value);
                      setSelectedApproverId('manual');
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. DATOS COMUNES DEL FORMATO (SEDE, EMISIÓN, RESPONSABLE) */}
            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.6rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.35rem'
              }}
            >
              <div>
                <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#475569' }}>
                  Sede Laboral:
                </label>
                <select
                  className="form-input"
                  value={sede}
                  onChange={(e) => setSede(e.target.value as SedeType)}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.35rem' }}
                >
                  {SEDES_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#475569' }}>
                  Fecha de Emisión:
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.35rem' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.675rem', fontWeight: 600, color: '#475569' }}>
                  Responsable Inmediato:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={responsableInmediato}
                  onChange={(e) => setResponsableInmediato(e.target.value)}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.35rem' }}
                />
              </div>

              {/* Selector de Firma Digital de RRHH en Lote */}
              <div
                style={{
                  gridColumn: 'span 2',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  padding: '0.5rem',
                  background: includeRrhhSignature ? '#f8fafc' : '#f8fafc',
                  border: `1px solid ${includeRrhhSignature ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: '6px',
                  marginTop: '0.25rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIncludeRrhhSignature(!includeRrhhSignature)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>✍️</span>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: includeRrhhSignature ? '#1e40af' : '#475569' }}>
                        Firma Jefe de RRHH en Lote
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                        {includeRrhhSignature ? 'Se incluirá en todas las hojas generadas' : 'Desactivada'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeRrhhSignature}
                    onChange={(e) => setIncludeRrhhSignature(e.target.checked)}
                    style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                  />
                </div>

                {includeRrhhSignature && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    {RRHH_SIGNATURE_CHOICES.map((choice) => {
                      const isSelected = selectedSignatureUrl === choice.url;
                      return (
                        <div
                          key={choice.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSignatureUrl(choice.url);
                          }}
                          style={{
                            border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            borderRadius: '5px',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            padding: '0.35rem 0.4rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                background: isSelected ? '#2563eb' : '#e2e8f0',
                                color: isSelected ? '#ffffff' : '#475569',
                                padding: '1px 4px',
                                borderRadius: '3px'
                              }}
                            >
                              {choice.badge}
                            </span>
                            {isSelected && <span style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: 800 }}>✓</span>}
                          </div>
                          <div
                            style={{
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#ffffff',
                              borderRadius: '3px',
                              border: '1px solid #f1f5f9'
                            }}
                          >
                            <img
                              src={choice.url}
                              alt={choice.name}
                              style={{ maxHeight: '28px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                            {choice.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Información de Duplicado Masivo (1 Hoja A4 por Trabajador) */}
              <div
                style={{
                  gridColumn: 'span 2',
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  marginTop: '0.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>📑</span>
                  <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#1e40af' }}>
                    Formato 2 en 1 por Trabajador (1 Hoja A4 c/u)
                  </div>
                </div>
                <div style={{ fontSize: '0.625rem', color: '#475569' }}>
                  Al imprimir, cada trabajador obtiene 1 sola hoja A4 con su <strong>Original (arriba)</strong> y <strong>Copia (abajo)</strong> con línea de corte punteada ✂️. Total: {bulkGeneratedSheetsData.length} hoja(s) A4.
                </div>
              </div>
            </div>
          </div>

          {/* VISTA PREVIA Y CONTENEDOR MULTIPÁGINA DE IMPRESIÓN (DERECHA) */}
          <div className="permission-preview-wrapper">
            {bulkGeneratedSheetsData.length === 0 ? (
              <div
                style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: '#64748b',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1',
                  maxWidth: 500
                }}
              >
                <FileText size={40} style={{ opacity: 0.3, color: '#2563eb', margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
                  Ningún trabajador seleccionado para el PDF Masivo
                </h4>
                <p style={{ fontSize: '0.825rem', margin: '0.35rem 0 0 0' }}>
                  Selecciona una fecha con compensaciones o marca los trabajadores en el panel izquierdo para generar sus hojas de permiso.
                </p>
              </div>
            ) : (
              <>
                {/* BARRA DE NAVEGACIÓN DE PÁGINAS Y MODO DE VISTA PREVIA */}
                <div
                  className="no-print"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    width: '100%',
                    maxWidth: '198mm'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('paginated')}
                        style={{
                          border: 'none',
                          background: previewMode === 'paginated' ? '#ffffff' : 'transparent',
                          color: previewMode === 'paginated' ? '#1d4ed8' : '#64748b',
                          fontWeight: previewMode === 'paginated' ? 700 : 500,
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          boxShadow: previewMode === 'paginated' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                        }}
                      >
                        Página por Página
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('all')}
                        style={{
                          border: 'none',
                          background: previewMode === 'all' ? '#ffffff' : 'transparent',
                          color: previewMode === 'all' ? '#1d4ed8' : '#64748b',
                          fontWeight: previewMode === 'all' ? 700 : 500,
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          boxShadow: previewMode === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                        }}
                      >
                        Ver Todas ({bulkGeneratedSheetsData.length})
                      </button>
                    </div>

                    {previewMode === 'paginated' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setBulkPreviewIndex((i) => Math.max(0, i - 1))}
                          disabled={bulkPreviewIndex === 0}
                          style={{ padding: '2px 6px' }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '70px', textAlign: 'center' }}>
                          {bulkPreviewIndex + 1} / {bulkGeneratedSheetsData.length}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setBulkPreviewIndex((i) => Math.min(bulkGeneratedSheetsData.length - 1, i + 1))
                          }
                          disabled={bulkPreviewIndex >= bulkGeneratedSheetsData.length - 1}
                          style={{ padding: '2px 6px' }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePrint}
                    icon={<Printer size={14} />}
                    style={{ fontWeight: 700 }}
                  >
                    Imprimir Lote ({bulkGeneratedSheetsData.length} Hojas A4)
                  </Button>
                </div>

                {/* CONTENEDOR MULTIHOJA */}
                <div className="bulk-sheets-container">
                  {/* EN PANTALLA: Mostrar según el modo de preview seleccionado */}
                  {previewMode === 'paginated' ? (
                    <div className="no-print" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div className="bulk-sheet-page-indicator">
                        Trabajador {bulkPreviewIndex + 1} de {bulkGeneratedSheetsData.length} • {bulkGeneratedSheetsData[bulkPreviewIndex]?.apellidosNombres}
                      </div>

                      <DualPermissionSheetDoc
                        data={bulkGeneratedSheetsData[bulkPreviewIndex]}
                        showRrhhSignature={includeRrhhSignature}
                        rrhhSignatureUrl={selectedSignatureUrl}
                      />
                    </div>
                  ) : (
                    bulkGeneratedSheetsData.map((sheetData, idx) => (
                      <div key={sheetData.id || idx} className="no-print" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e40af', width: '198mm', maxWidth: '100%', marginBottom: '0.5rem' }}>
                          Trabajador {idx + 1} de {bulkGeneratedSheetsData.length}: {sheetData.apellidosNombres} (DNI: {sheetData.numeroDocumento})
                        </div>

                        <DualPermissionSheetDoc
                          data={sheetData}
                          showRrhhSignature={includeRrhhSignature}
                          rrhhSignatureUrl={selectedSignatureUrl}
                        />
                      </div>
                    ))
                  )}

                  {/* PARA IMPRESIÓN (PRINT MEDIA ONLY): Renderizar SIEMPRE todas las hojas duales para que el navegador genere 1 página por trabajador */}
                  <div className="bulk-print-only-container" style={{ width: '100%' }}>
                    {bulkGeneratedSheetsData.map((sheetData, idx) => (
                      <DualPermissionSheetDoc
                        key={`bulk-print-dual-${sheetData.id || idx}`}
                        data={sheetData}
                        isPrintable
                        showRrhhSignature={includeRrhhSignature}
                        rrhhSignatureUrl={selectedSignatureUrl}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Gestión de Aprobadores de Permisos */}
      <ApproversManagementModal
        isOpen={isApproversModalOpen}
        onClose={() => setIsApproversModalOpen(false)}
        onApproversChange={() => setApproversRefreshKey((k) => k + 1)}
      />
    </div>
  );
};
