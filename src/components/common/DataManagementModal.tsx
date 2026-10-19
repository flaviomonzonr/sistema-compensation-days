import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Database, Upload, Download, CheckCircle2, Table,
  FileSpreadsheet, Info, AlertTriangle, XCircle, Eye, Trash2
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { db, employeeRepository, compensationRepository } from '../../storage';
import { employeeService, compensationService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { CreateEmpleadoDto, EstadoCompensacion, FormaCompensacion } from '../../types';
import { parseDateString, formatDateDisplay, excelSerialToDateString } from '../../utils/dateUtils';

export type DataManagementMode = 'all' | 'employees' | 'compensations' | 'backup';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: DataManagementMode;
  defaultTab?: 'employees' | 'compensations' | 'backup';
}

// ─────────────────────────────────────────────────────────────────────────────
// Types for Employee preview table
// ─────────────────────────────────────────────────────────────────────────────
interface EmpPreviewRow {
  rowNum: number;
  codigo: string;
  apellidosNombres: string;
  documentoIdentidad: string;
  fechaIngreso: string;
  tipoTrabajador: string;
  categoria: string;
  area: string;
  cargo: string;
  estado: 'ACTIVO' | 'CESADO';
  fechaCese: string | null;
  isExisting: boolean;
  status: 'ok' | 'invalid_data' | 'empty';
  statusMsg: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse raw text for Employees into preview rows
// ─────────────────────────────────────────────────────────────────────────────
const parseEmployeePreview = (
  text: string,
  existingEmployees: ReturnType<typeof employeeRepository.getAll>
): EmpPreviewRow[] => {
  if (!text.trim()) return [];

  const lines = text.trim().split(/\r?\n/);
  const rows: EmpPreviewRow[] = [];

  let headerMap: {
    codigo: number;
    apellidosNombres: number;
    documentoIdentidad: number;
    fechaIngreso: number;
    tipoTrabajador: number;
    categoria: number;
    area: number;
    cargo: number;
    estado: number;
    fechaCese: number;
  } | null = null;

  let rowCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('#')) continue;

    const rawCols = line.includes('\t')
      ? line.split('\t').map((c) => c.trim().replace(/^['\"`]+|['\"`]+$/g, ''))
      : line.split(/[,;]/).map((c) => c.trim().replace(/^['\"`]+|['\"`]+$/g, ''));

    const lower = line.toLowerCase();
    const isHeader =
      lower.includes('apellidos') ||
      lower.includes('doc ident') ||
      lower.includes('fecha ingr') ||
      lower.includes('estado trabajador') ||
      (lower.includes('codigo') && (lower.includes('area') || lower.includes('área') || lower.includes('tipo') || lower.includes('nombres')));

    if (isHeader) {
      headerMap = {
        codigo: -1,
        apellidosNombres: -1,
        documentoIdentidad: -1,
        fechaIngreso: -1,
        tipoTrabajador: -1,
        categoria: -1,
        area: -1,
        cargo: -1,
        estado: -1,
        fechaCese: -1
      };

      rawCols.forEach((colHeader, hIdx) => {
        const h = colHeader.toLowerCase().trim();
        if (!h) return;

        // 1. ESTADO TRABAJADOR / ESTADO (Prioridad ALTA para evitar coincidencia con 'trabajador')
        if (h.includes('estado') || h.includes('situacion') || h.includes('situación')) {
          headerMap!.estado = hIdx;
        }
        // 2. TIPO TRABAJADOR / CONDICION
        else if (h.includes('tipo') || h.includes('condicion') || h.includes('condición')) {
          headerMap!.tipoTrabajador = hIdx;
        }
        // 3. FECHA CESE / SALIDA
        else if (h.includes('cese') || h.includes('salida') || h.includes('retiro')) {
          headerMap!.fechaCese = hIdx;
        }
        // 4. FECHA INGRESO / INGRESO
        else if (
          h.includes('ingr') ||
          h.includes('ingreso') ||
          h.includes('f.ingr') ||
          h.includes('f_ingr') ||
          h.includes('inicio') ||
          (h.includes('fecha') && !h.includes('cese'))
        ) {
          headerMap!.fechaIngreso = hIdx;
        }
        // 5. CATEGORIA
        else if (h.includes('categ') || h.includes('cat.') || h.includes('categoría') || h.includes('categoria')) {
          headerMap!.categoria = hIdx;
        }
        // 6. DOC IDENTIDAD / DNI
        else if (
          h.includes('doc') ||
          h.includes('dni') ||
          h.includes('ident') ||
          h.includes('cedula') ||
          h.includes('ruc') ||
          h.includes('nro doc') ||
          h.includes('num doc')
        ) {
          headerMap!.documentoIdentidad = hIdx;
        }
        // 7. CODIGO
        else if (h.includes('codigo') || h.includes('código') || h === 'cod' || h.startsWith('cod_')) {
          headerMap!.codigo = hIdx;
        }
        // 8. AREA / DEPARTAMENTO / SEDE
        else if (
          h.includes('area') ||
          h.includes('área') ||
          h.includes('dpto') ||
          h.includes('departamento') ||
          h.includes('seccion') ||
          h.includes('sección') ||
          h.includes('sede')
        ) {
          headerMap!.area = hIdx;
        }
        // 9. CARGO / LABOR / PUESTO
        else if (
          h.includes('cargo') ||
          h.includes('puesto') ||
          h.includes('labor') ||
          h.includes('ocupacion') ||
          h.includes('ocupación') ||
          h.includes('funcion') ||
          h.includes('función')
        ) {
          headerMap!.cargo = hIdx;
        }
        // 10. APELLIDOS Y NOMBRES (Estricto - Columna B)
        else if (
          h.includes('apellido') ||
          h.includes('nombre') ||
          h === 'trabajador' ||
          h === 'empleado' ||
          h.includes('colaborador') ||
          h.includes('personal') ||
          h.includes('persona')
        ) {
          headerMap!.apellidosNombres = hIdx;
        }
      });

      // Si por alguna razón apellidosNombres no fue mapeado por texto, asignar Columna B (1)
      if (headerMap.apellidosNombres === -1 && rawCols.length >= 2) {
        headerMap.apellidosNombres = 1;
      }
      if (headerMap.codigo === -1 && rawCols.length >= 1) {
        headerMap.codigo = 0;
      }

      continue;
    }

    rowCounter++;

    let codigo = '';
    let apellidosNombres = '';
    let documentoIdentidad = '';
    let fechaIngresoRaw = '';
    let tipoTrabajador = 'EMPLEADO';
    let categoria = '';
    let area = 'GENERAL';
    let cargo = 'OPERADOR';
    let rawEstado = 'ACTIVO';
    let fechaCeseRaw = '';

    if (headerMap && (headerMap.codigo !== -1 || headerMap.apellidosNombres !== -1 || headerMap.documentoIdentidad !== -1)) {
      codigo = headerMap.codigo !== -1 ? rawCols[headerMap.codigo] || '' : rawCols[0] || '';
      // Garantizar que apellidosNombres provenga de la columna de nombres (o Col B / índice 1)
      apellidosNombres = headerMap.apellidosNombres !== -1 ? rawCols[headerMap.apellidosNombres] || '' : (rawCols[1] || '');
      documentoIdentidad = headerMap.documentoIdentidad !== -1 ? rawCols[headerMap.documentoIdentidad] || codigo : codigo;
      fechaIngresoRaw = headerMap.fechaIngreso !== -1 ? rawCols[headerMap.fechaIngreso] || '' : '';
      tipoTrabajador = headerMap.tipoTrabajador !== -1 ? rawCols[headerMap.tipoTrabajador] || 'EMPLEADO' : 'EMPLEADO';
      categoria = headerMap.categoria !== -1 ? rawCols[headerMap.categoria] || '' : '';
      area = headerMap.area !== -1 ? rawCols[headerMap.area] || 'GENERAL' : 'GENERAL';
      cargo = headerMap.cargo !== -1 ? rawCols[headerMap.cargo] || 'OPERADOR' : 'OPERADOR';
      rawEstado = headerMap.estado !== -1 ? (rawCols[headerMap.estado] || '').toUpperCase() : 'ACTIVO';
      fechaCeseRaw = headerMap.fechaCese !== -1 ? rawCols[headerMap.fechaCese] || '' : '';
    } else {
      // Posicional directo según la plantilla oficial (10 columnas):
      // Col 0: Codigo | Col 1: APELLIDOS Y NOMBRES | Col 2: Doc Ident | Col 3: Fecha Ingr | Col 4: Tipo Trab | Col 5: Categoria | Col 6: Area | Col 7: Cargo | Col 8: ESTADO | Col 9: FECHA CESE
      codigo = rawCols[0] || '';
      apellidosNombres = rawCols[1] || ''; // COLUMNA B SIEMPRE
      documentoIdentidad = rawCols[2] || codigo;
      fechaIngresoRaw = rawCols[3] || '';
      tipoTrabajador = rawCols[4] || 'EMPLEADO';
      categoria = rawCols[5] || '';
      area = rawCols[6] || 'GENERAL';
      cargo = rawCols[7] || 'OPERADOR';
      rawEstado = (rawCols[8] || '').toUpperCase();
      fechaCeseRaw = rawCols[9] || '';
    }

    if (!codigo && documentoIdentidad) codigo = documentoIdentidad;
    if (!documentoIdentidad && codigo) documentoIdentidad = codigo;

    if (!codigo && !apellidosNombres) continue;

    area = (area || 'GENERAL').replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO').trim();
    const normTipo = tipoTrabajador.toUpperCase().includes('OBRER') ? 'OBRERO' : 'EMPLEADO';
    const fechaIngreso = parseDateString(fechaIngresoRaw) || new Date().toISOString().split('T')[0];
    const estado: 'ACTIVO' | 'CESADO' = rawEstado.includes('CESAD') ? 'CESADO' : 'ACTIVO';
    const fechaCese = estado === 'CESADO' && fechaCeseRaw ? parseDateString(fechaCeseRaw) : null;

    const isExisting = existingEmployees.some(
      (e) => (codigo && e.codigo.toUpperCase() === codigo.trim().toUpperCase()) || (documentoIdentidad && e.documentoIdentidad === documentoIdentidad.trim())
    );

    let status: 'ok' | 'invalid_data' | 'empty' = 'ok';
    let statusMsg = isExisting ? 'Actualizará datos' : 'Nuevo';

    if (!codigo) {
      status = 'invalid_data';
      statusMsg = 'Sin Código/DNI';
    } else if (!apellidosNombres || apellidosNombres.trim().length < 2) {
      status = 'invalid_data';
      statusMsg = 'Sin Nombres';
    }

    rows.push({
      rowNum: rowCounter,
      codigo,
      apellidosNombres,
      documentoIdentidad,
      fechaIngreso,
      tipoTrabajador: normTipo,
      categoria,
      area,
      cargo,
      estado,
      fechaCese,
      isExisting,
      status,
      statusMsg
    });
  }

  return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types for Compensation preview table
// ─────────────────────────────────────────────────────────────────────────────
type PreviewStatus = 'ok' | 'duplicate' | 'not_found' | 'invalid_date' | 'empty';

interface CompPreviewRow {
  rowNum: number;
  rawDni: string;
  empleadoNombre?: string;
  fechaGenerada: string;    // YYYY-MM-DD
  fechaGeneradaRaw: string; // original
  estado: EstadoCompensacion;
  formaCompensacion?: FormaCompensacion;
  fechaCompensada: string | null; // YYYY-MM-DD
  fechaCompensadaRaw: string;     // original
  observacion: string;
  status: PreviewStatus;
  statusMsg: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse the raw textarea text into compensation preview rows
// ─────────────────────────────────────────────────────────────────────────────
const parseCompensationPreview = (
  text: string,
  employees: ReturnType<typeof employeeRepository.getAll>,
  existingCompensations: ReturnType<typeof compensationRepository.getAll>
): CompPreviewRow[] => {
  if (!text.trim()) return [];

  const lines = text.trim().split(/\r?\n/);
  const rows: CompPreviewRow[] = [];
  const seenPairs = new Set<string>();

  let rowNum = 0;

  lines.forEach((line) => {
    if (!line.trim() || line.startsWith('#')) return;

    // Skip header rows
    const lower = line.toLowerCase();
    if (
      lower.includes('apellidos y nombres') ||
      lower.includes('fecha compensada') ||
      (lower.includes('dni') && lower.includes('fecha')) ||
      (lower.includes('fecha') && lower.includes('estado'))
    ) return;

    rowNum++;

    const raw = line.includes('\t') ? line.split('\t') : line.split(/[,;]/);
    const cols = raw.map((c) => c.trim().replace(/^['\"`]+|['\"`]+$/g, ''));

    if (cols.length === 0 || !cols[0]) return;

    let rawDni = '';
    let nombrePasted = '';
    let fechaGeneradaRaw = '';
    let estadoRaw = 'PENDIENTE';
    let fechaCompensadaRaw = '';
    let observacion = '';

    if (cols.length >= 4) {
      rawDni = cols[0];
      nombrePasted = cols[1];
      fechaGeneradaRaw = cols[2];
      estadoRaw = cols[3] || 'PENDIENTE';
      fechaCompensadaRaw = cols[4] || '';
      observacion = cols[5] || '';
    } else if (cols.length === 3) {
      rawDni = cols[0];
      nombrePasted = cols[1];
      fechaGeneradaRaw = cols[2];
      estadoRaw = 'PENDIENTE';
    } else if (cols.length === 2) {
      rawDni = cols[0];
      fechaGeneradaRaw = cols[1];
      estadoRaw = 'PENDIENTE';
    } else {
      rows.push({
        rowNum,
        rawDni: cols[0] || '',
        fechaGenerada: '',
        fechaGeneradaRaw: '',
        estado: 'PENDIENTE',
        fechaCompensada: null,
        fechaCompensadaRaw: '',
        observacion: '',
        status: 'empty',
        statusMsg: 'Faltan columnas (se requiere al menos DNI y Fecha).'
      });
      return;
    }

    if (!rawDni) {
      rows.push({
        rowNum,
        rawDni: '',
        fechaGenerada: '',
        fechaGeneradaRaw: '',
        estado: 'PENDIENTE',
        fechaCompensada: null,
        fechaCompensadaRaw: '',
        observacion,
        status: 'empty',
        statusMsg: 'DNI / Código vacío.'
      });
      return;
    }

    let estado: EstadoCompensacion = 'PENDIENTE';
    let formaCompensacion: FormaCompensacion = 'DESCANSO';

    const estUpper = estadoRaw.trim().toUpperCase();
    const compUpper = fechaCompensadaRaw.trim().toUpperCase();
    const obsUpper = observacion.trim().toUpperCase();

    const isRemun =
      estUpper.includes('REMUNERAC') ||
      compUpper.includes('REMUNERAC') ||
      obsUpper.includes('REMUNERAC') ||
      estUpper.includes('PLANILLA') ||
      compUpper.includes('PLANILLA');

    const isLiquid =
      estUpper.includes('LIQUIDAC') ||
      compUpper.includes('LIQUIDAC') ||
      obsUpper.includes('LIQUIDAC') ||
      estUpper.includes('BBSS') ||
      compUpper.includes('BBSS') ||
      estUpper.includes('CESE') ||
      compUpper.includes('CESE');

    if (isRemun) {
      estado = 'COMPENSADO';
      formaCompensacion = 'REMUNERACION';
    } else if (isLiquid) {
      estado = 'COMPENSADO';
      formaCompensacion = 'LIQUIDACION';
    } else if (estUpper.includes('COMPENSAD')) {
      estado = 'COMPENSADO';
      formaCompensacion = 'DESCANSO';
    } else if (estUpper.includes('PROGRAMAD')) {
      estado = 'PROGRAMADO';
      formaCompensacion = 'DESCANSO';
    } else if (estUpper.includes('ANULAD')) {
      estado = 'ANULADO';
      formaCompensacion = 'DESCANSO';
    } else {
      estado = 'PENDIENTE';
      formaCompensacion = 'DESCANSO';
    }

    const fechaGenerada = parseDateString(fechaGeneradaRaw);
    if (!fechaGenerada) {
      rows.push({
        rowNum,
        rawDni,
        empleadoNombre: nombrePasted || undefined,
        fechaGenerada: '',
        fechaGeneradaRaw,
        estado,
        formaCompensacion,
        fechaCompensada: null,
        fechaCompensadaRaw,
        observacion,
        status: 'invalid_date',
        statusMsg: `Fecha trabajada "${fechaGeneradaRaw}" no válida. Use DD/MM/AAAA.`
      });
      return;
    }

    let fechaCompensada: string | null = null;
    const isPaidModality = formaCompensacion === 'REMUNERACION' || formaCompensacion === 'LIQUIDACION';

    if (!isPaidModality && fechaCompensadaRaw && fechaCompensadaRaw.trim()) {
      const parsedComp = parseDateString(fechaCompensadaRaw);
      if (parsedComp) {
        fechaCompensada = parsedComp;
      } else {
        // Verificar si era un placeholder de sin fecha
        const rawTrim = fechaCompensadaRaw.trim().toUpperCase();
        const isPlaceholder =
          rawTrim === '-' ||
          rawTrim === '--' ||
          rawTrim === 'N/A' ||
          rawTrim === 'NA' ||
          rawTrim === 'NULL' ||
          rawTrim === 'SN' ||
          rawTrim === 'S/F' ||
          rawTrim === 'SIN FECHA' ||
          rawTrim === 'PENDIENTE' ||
          rawTrim === 'NO' ||
          rawTrim === 'NONE';

        if (!isPlaceholder) {
          rows.push({
            rowNum,
            rawDni,
            empleadoNombre: nombrePasted || undefined,
            fechaGenerada,
            fechaGeneradaRaw,
            estado,
            formaCompensacion,
            fechaCompensada: null,
            fechaCompensadaRaw,
            observacion,
            status: 'invalid_date',
            statusMsg: `Fecha compensada "${fechaCompensadaRaw}" no válida. Use DD/MM/AAAA o deje vacío.`
          });
          return;
        }
        fechaCompensada = null;
      }
    }

    const idTerm = rawDni.trim().toUpperCase();
    let emp = employees.find(
      (e) => e.codigo.toUpperCase() === idTerm || e.documentoIdentidad === idTerm
    );

    if (!emp && nombrePasted) {
      const cleanName = nombrePasted.trim().toUpperCase();
      emp = employees.find((e) => e.apellidosNombres.toUpperCase() === cleanName);
    }

    if (!emp) {
      rows.push({
        rowNum,
        rawDni,
        empleadoNombre: nombrePasted || undefined,
        fechaGenerada,
        fechaGeneradaRaw,
        estado,
        formaCompensacion,
        fechaCompensada,
        fechaCompensadaRaw,
        observacion,
        status: 'not_found',
        statusMsg: `Trabajador DNI "${rawDni}" no está registrado en el sistema.`
      });
      return;
    }

    const dbDuplicate = existingCompensations.find(
      (c) =>
        c.empleadoId === emp.id &&
        c.fechaGenerada === fechaGenerada &&
        c.estado !== 'ANULADO'
    );

    const pairKey = `${emp.id}__${fechaGenerada}`;
    const batchDuplicate = seenPairs.has(pairKey);

    if (batchDuplicate) {
      rows.push({
        rowNum,
        rawDni,
        empleadoNombre: emp.apellidosNombres,
        fechaGenerada,
        fechaGeneradaRaw,
        estado,
        formaCompensacion,
        fechaCompensada,
        fechaCompensadaRaw,
        observacion,
        status: 'duplicate',
        statusMsg: `Fila duplicada en el archivo.`,
      });
      return;
    }

    if (dbDuplicate) {
      const isUpdatingToCompensated =
        (dbDuplicate.estado === 'PENDIENTE' || dbDuplicate.estado === 'PROGRAMADO') &&
        (estado === 'COMPENSADO' || Boolean(fechaCompensada) || formaCompensacion !== 'DESCANSO');

      const isUpdatingDateOrModality =
        Boolean(fechaCompensada && fechaCompensada !== dbDuplicate.fechaCompensacion) ||
        (formaCompensacion && formaCompensacion !== dbDuplicate.formaCompensacion);

      if (isUpdatingToCompensated || isUpdatingDateOrModality) {
        seenPairs.add(pairKey);
        rows.push({
          rowNum,
          rawDni,
          empleadoNombre: emp.apellidosNombres,
          fechaGenerada,
          fechaGeneradaRaw,
          estado: 'COMPENSADO',
          formaCompensacion,
          fechaCompensada,
          fechaCompensadaRaw,
          observacion,
          status: 'ok',
          statusMsg: `🔄 Actualizará a COMPENSADO (${formatDateDisplay(fechaGenerada)})`
        });
        return;
      } else {
        rows.push({
          rowNum,
          rawDni,
          empleadoNombre: emp.apellidosNombres,
          fechaGenerada,
          fechaGeneradaRaw,
          estado,
          formaCompensacion,
          fechaCompensada,
          fechaCompensadaRaw,
          observacion,
          status: 'duplicate',
          statusMsg: `${emp.apellidosNombres} ya tiene el día ${formatDateDisplay(fechaGenerada)} registrado (${dbDuplicate.estado}).`
        });
        return;
      }
    }

    seenPairs.add(pairKey);
    const readyMsg =
      estado === 'COMPENSADO' && !fechaCompensada && !isPaidModality
        ? 'Listo para importar (Compensado histórico)'
        : 'Listo para importar';

    rows.push({
      rowNum,
      rawDni,
      empleadoNombre: emp.apellidosNombres,
      fechaGenerada,
      fechaGeneradaRaw,
      estado,
      formaCompensacion,
      fechaCompensada,
      fechaCompensadaRaw,
      observacion,
      status: 'ok',
      statusMsg: readyMsg
    });
  });

  return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status badge component
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ row: CompPreviewRow }> = ({ row }) => {
  const isUpdate = row.status === 'ok' && row.statusMsg.includes('Actualizará');
  const styles: Record<PreviewStatus, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    ok:           isUpdate
      ? { bg: '#eff6ff', color: '#1d4ed8', icon: <CheckCircle2 size={12} />, label: '🔄 Actualizar' }
      : { bg: '#f0fdf4', color: '#16a34a', icon: <CheckCircle2 size={12} />, label: '✓ Listo' },
    duplicate:    { bg: '#fffbeb', color: '#b45309', icon: <AlertTriangle size={12} />, label: '⚠ Ya registrado' },
    not_found:    { bg: '#fef2f2', color: '#dc2626', icon: <XCircle size={12} />, label: '✗ DNI no existe' },
    invalid_date: { bg: '#fef2f2', color: '#dc2626', icon: <XCircle size={12} />, label: '✗ Fecha inválida' },
    empty:        { bg: '#f8fafc', color: '#64748b', icon: <XCircle size={12} />, label: '✗ Vacío' },
  };
  const s = styles[row.status];
  return (
    <span
      title={row.statusMsg}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: s.bg, color: s.color,
        padding: '2px 7px', borderRadius: '12px',
        fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
        cursor: 'help'
      }}
    >
      {s.icon} {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────────────────────────────────────
export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  mode = 'all',
  defaultTab
}) => {
  const { success, error } = useToast();
  const { triggerRefresh } = useApp();

  const getInitialTab = (): 'employees' | 'compensations' | 'backup' => {
    if (mode && mode !== 'all') return mode;
    return defaultTab || 'employees';
  };

  const [activeTab, setActiveTab] = useState<'employees' | 'compensations' | 'backup'>(getInitialTab);

  React.useEffect(() => {
    if (isOpen) {
      if (mode && mode !== 'all') {
        setActiveTab(mode);
      } else if (defaultTab) {
        setActiveTab(defaultTab);
      }
    }
  }, [isOpen, mode, defaultTab]);

  // Employee CSV / Excel input
  const [employeeText, setEmployeeText] = useState('');
  const [employeeResults, setEmployeeResults] = useState<{ imported: number; errors: string[] } | null>(null);

  // Compensation CSV input
  const [compensationText, setCompensationText] = useState('');
  const [compensationResults, setCompensationResults] = useState<{ imported: number; errors: string[] } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // ── Sample data ──────────────────────────────────────────────────────────
  const sampleEmployeeExcel = `10000001\tPEREZ ROJAS JUAN CARLOS\t10000001\t15/01/2026\tEMPLEADO\tEMPLEADOS AGRÍCOLAS\tCONTABILIDAD\tASISTENTE CONTABLE\tACTIVO\t
10000002\tGARCIA LOPEZ MARIA ELENA\t10000002\t01/02/2026\tOBRERO\tOBREROS AGRÍCOLAS\tPLANTA\tOPERARIO DE PRODUCCION\tACTIVO\t`;

  const sampleCompensationExcel = `DNI\tApellidos y Nombres\tFecha\tESTADO\tFecha Compensada
46356926\tISLA SANTAMARIA RODRIGO RAYMUNDO\t26/04/2026\tCOMPENSADO\t18/05/2026
46356926\tISLA SANTAMARIA RODRIGO RAYMUNDO\t29/06/2026\tPENDIENTE\t
42935726\tVALDEZ ZACARIAS JULIO ARMANDO\t07/05/2023\tCOMPENSADO\t04/04/2026
42935726\tVALDEZ ZACARIAS JULIO ARMANDO\t29/06/2023\tPENDIENTE\t`;

  // ── Live preview for Employees (memoized — recalculates only when text changes) ─
  const previewEmployeeRows = useMemo(() => {
    if (!employeeText.trim() || activeTab !== 'employees') return [];
    const employees = employeeRepository.getAll();
    return parseEmployeePreview(employeeText, employees);
  }, [employeeText, activeTab, employeeResults]);

  const previewEmployeeStats = useMemo(() => {
    const ok = previewEmployeeRows.filter((r) => r.status === 'ok').length;
    const existing = previewEmployeeRows.filter((r) => r.isExisting).length;
    const newItems = previewEmployeeRows.filter((r) => !r.isExisting && r.status === 'ok').length;
    const invalid = previewEmployeeRows.filter((r) => r.status !== 'ok').length;
    return { ok, existing, newItems, invalid, total: previewEmployeeRows.length };
  }, [previewEmployeeRows]);

  // ── Live preview for Compensations (memoized) ─────────────────────────────
  const previewRows = useMemo(() => {
    if (!compensationText.trim() || activeTab !== 'compensations') return [];
    const employees = employeeRepository.getAll();
    const existing = compensationRepository.getAll();
    return parseCompensationPreview(compensationText, employees, existing);
  }, [compensationText, activeTab, compensationResults]);

  const previewStats = useMemo(() => {
    const ok = previewRows.filter((r) => r.status === 'ok').length;
    const dup = previewRows.filter((r) => r.status === 'duplicate').length;
    const notFound = previewRows.filter((r) => r.status === 'not_found').length;
    const invalid = previewRows.filter((r) => r.status === 'invalid_date' || r.status === 'empty').length;
    return { ok, dup, notFound, invalid, total: previewRows.length };
  }, [previewRows]);

  // ── Parse and import employees ───────────────────────────────────────────
  const handleImportEmployees = () => {
    if (!employeeText.trim()) {
      error('Pegue o escriba las filas de empleados desde su Excel.');
      return;
    }

    const preview = parseEmployeePreview(employeeText, employeeRepository.getAll());
    const validRows = preview.filter((r) => r.status === 'ok');

    if (validRows.length === 0) {
      error('No se detectaron registros válidos de empleados para procesar.');
      return;
    }

    const dtos: CreateEmpleadoDto[] = validRows.map((r) => ({
      codigo: r.codigo,
      apellidosNombres: r.apellidosNombres,
      documentoIdentidad: r.documentoIdentidad,
      fechaIngreso: r.fechaIngreso,
      fechaCese: r.fechaCese,
      tipoTrabajador: r.tipoTrabajador,
      categoria: r.categoria,
      area: r.area,
      cargo: r.cargo,
      estado: r.estado
    }));

    const res = employeeService.bulkCreate(dtos);
    setEmployeeResults({
      imported: res.importedCount + (res.updatedCount || 0),
      errors: res.errors
    });

    if (res.importedCount > 0 || (res.updatedCount && res.updatedCount > 0)) {
      const parts: string[] = [];
      if (res.importedCount > 0) parts.push(`${res.importedCount} nuevo(s)`);
      if (res.updatedCount && res.updatedCount > 0) parts.push(`${res.updatedCount} actualizado(s) con nombres reales`);
      success(`Carga de empleados exitosa: ${parts.join(', ')}.`);
      triggerRefresh();
    } else if (res.errors.length > 0) {
      error(`Error al procesar: ${res.errors.slice(0, 2).join(' | ')}`);
    }
  };

  // ── Parse and import compensations ───────────────────────────────────────
  const handleImportCompensations = () => {
    if (!compensationText.trim()) {
      error('Pegue o cargue los datos de compensación para importar.');
      return;
    }

    // Usar directamente las filas validadas en la previsualización
    const toImport = previewRows.filter((r) => r.status === 'ok');

    if (toImport.length === 0) {
      const hasErrors = previewRows.some(
        (r) => r.status === 'not_found' || r.status === 'invalid_date' || r.status === 'empty'
      );
      const hasDups = previewRows.some((r) => r.status === 'duplicate');

      if (hasErrors && !hasDups) {
        error('No hay registros válidos para importar. Revisa los errores en la tabla de previsualización.');
      } else if (hasDups && !hasErrors) {
        error('Todos los registros ya están registrados (duplicados). No hay nada nuevo que importar.');
      } else {
        error('No hay registros nuevos válidos para importar. Revisa la tabla de previsualización.');
      }
      return;
    }

    const items = toImport.map((row) => ({
      identificadorTrabajador: row.rawDni,
      fechaGenerada: row.fechaGenerada,
      estado: row.estado,
      formaCompensacion: row.formaCompensacion || 'DESCANSO',
      fechaCompensacion: row.fechaCompensada || null,
      observacion: row.observacion || ''
    }));

    const res = compensationService.bulkCreate(items);
    setCompensationResults({
      imported: res.importedCount,
      errors: res.errors
    });

    if (res.importedCount > 0) {
      success(`Se importaron ${res.importedCount} día(s) de compensación exitosamente.`);
      triggerRefresh();
    } else if (res.errors.length > 0) {
      error(`No se pudo importar ningún registro. Revise los errores en la tabla.`);
    }
  };

  // ── File Upload Handlers (soporta .xlsx, .xls, .csv, .txt) ───────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'emp' | 'comp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: false,
            raw: true
          });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Extraer filas directamente de la hoja
          const sheetRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: true
          });

          // Normalizar cada celda: convertir seriales de Excel y fechas a DD/MM/YYYY
          const formattedRows = sheetRows.map((row) => {
            return row.map((cell) => {
              if (cell === null || cell === undefined) return '';
              
              // Si es número que corresponde a serial de fecha Excel (e.g. 45480, 46233)
              if (typeof cell === 'number' && cell >= 1000 && cell <= 100000) {
                const dateIso = excelSerialToDateString(cell);
                if (dateIso) {
                  return formatDateDisplay(dateIso);
                }
              }

              const str = String(cell).trim();
              // Si es un texto con formato de fecha, normalizar a DD/MM/YYYY
              if (str && (str.includes('/') || str.includes('-') || str.includes('.'))) {
                const parsed = parseDateString(str);
                if (parsed && parsed.match(/^\d{4}\-\d{2}\-\d{2}$/)) {
                  return formatDateDisplay(parsed);
                }
              }

              return str;
            }).join('\t');
          });

          const tsv = formattedRows.join('\n');
          if (target === 'emp') setEmployeeText(tsv);
          else setCompensationText(tsv);
          success(`Archivo Excel "${file.name}" cargado y normalizado a formato DD/MM/YYYY.`);
        } catch (err: any) {
          error('Error al procesar archivo Excel: ' + (err?.message || 'formato no reconocido'));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          if (target === 'emp') setEmployeeText(text);
          else setCompensationText(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadEmployeeTemplate = () => {
    try {
      const headers = [
        'Codigo',
        'APELLIDOS Y NOMBRES',
        'Doc Ident.',
        'Fecha Ingr.',
        'Tipo Trab.',
        'Categoria',
        'Area',
        'Cargo',
        'ESTADO TRABAJADOR',
        'FECHA CESE'
      ];

      const sampleRows = [
        [
          '10000001',
          'PEREZ ROJAS JUAN CARLOS',
          '10000001',
          '15/01/2026',
          'EMPLEADO',
          'EMPLEADOS AGRÍCOLAS',
          'CONTABILIDAD',
          'ASISTENTE CONTABLE',
          'ACTIVO',
          ''
        ],
        [
          '10000002',
          'GARCIA LOPEZ MARIA ELENA',
          '10000002',
          '01/02/2026',
          'OBRERO',
          'OBREROS AGRÍCOLAS',
          'PLANTA',
          'OPERARIO DE PRODUCCION',
          'ACTIVO',
          ''
        ]
      ];

      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 12 }, // Codigo
        { wch: 35 }, // APELLIDOS Y NOMBRES
        { wch: 14 }, // Doc Ident.
        { wch: 14 }, // Fecha Ingr.
        { wch: 18 }, // Tipo Trab.
        { wch: 22 }, // Categoria
        { wch: 20 }, // Area
        { wch: 30 }, // Cargo
        { wch: 20 }, // ESTADO TRABAJADOR
        { wch: 14 }  // FECHA CESE
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Empleados');
      XLSX.writeFile(wb, 'plantilla_carga_masiva_empleados.xlsx');
      success('Plantilla Excel de empleados descargada exitosamente.', 'Plantilla Descargada');
    } catch (err: any) {
      error('Error al generar la plantilla Excel: ' + (err?.message || 'error desconocido'));
    }
  };

  // ── Download Excel Template for Compensations ────────────────────────────
  const handleDownloadCompensationTemplate = () => {
    try {
      const headers = [
        'DNI',
        'Apellidos y Nombres',
        'Fecha',
        'ESTADO',
        'Fecha Compensada'
      ];

      const sampleRows = [
        ['46356926', 'ISLA SANTAMARIA RODRIGO RAYMUNDO', '26/04/2026', 'COMPENSADO', '18/05/2026'],
        ['46356926', 'ISLA SANTAMARIA RODRIGO RAYMUNDO', '29/06/2026', 'PENDIENTE', ''],
        ['42935726', 'VALDEZ ZACARIAS JULIO ARMANDO', '07/05/2023', 'COMPENSADO', '04/04/2026'],
        ['42935726', 'VALDEZ ZACARIAS JULIO ARMANDO', '29/06/2023', 'PENDIENTE', '']
      ];

      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 14 },
        { wch: 38 },
        { wch: 14 },
        { wch: 16 },
        { wch: 18 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Compensaciones');
      XLSX.writeFile(wb, 'plantilla_carga_masiva_compensaciones.xlsx');
      success('Plantilla Excel de compensaciones descargada exitosamente.', 'Plantilla Descargada');
    } catch (err: any) {
      error('Error al generar la plantilla Excel: ' + (err?.message || 'error desconocido'));
    }
  };

  // ── Export JSON Backup ───────────────────────────────────────────────────
  const handleExportBackup = () => {
    const json = db.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `backup_sistema_compensaciones_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Copia de seguridad descargada exitosamente en formato JSON.', 'Backup');
  };

  // ── Import JSON Backup ───────────────────────────────────────────────────
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = db.importBackup(content);
      if (res.success) {
        success('Copia de seguridad restaurada correctamente.', 'Restauración Exitosa');
        triggerRefresh();
        onClose();
      } else {
        error(res.error || 'Error al restaurar copia de seguridad.');
      }
    };
    reader.readAsText(file);
  };

  // ── Clear Database ───────────────────────────────────────────────────────
  const handleClearDatabase = () => {
    if (
      window.confirm(
        '¿Está seguro de que desea limpiar toda la base de datos? Se eliminarán todos los empleados y compensaciones cargadas. (Se conservarán los feriados oficiales 2026).'
      )
    ) {
      db.clearAllData(true);
      success('Base de datos limpiada correctamente. Se eliminaron todos los empleados y compensaciones.', 'Data Limpiada');
      triggerRefresh();
      onClose();
    }
  };



  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        mode === 'employees' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={22} style={{ color: '#ea580c' }} />
            <span>Carga Masiva de Empleados (Excel / CSV)</span>
          </div>
        ) : mode === 'compensations' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Table size={22} style={{ color: '#2563eb' }} />
            <span>Carga Masiva de Días de Compensación (Excel)</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={22} style={{ color: '#2563eb' }} />
            <span>Gestión de Datos y Carga Masiva (Excel / Backup)</span>
          </div>
        )
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Navigation Tabs (solo visibles en modo general 'all') */}
        {mode === 'all' && (
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('employees')}
            >
              <FileSpreadsheet size={15} />
              Plantilla Empleados (Excel)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'compensations' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('compensations')}
            >
              <Table size={15} />
              Días de Compensación (Excel)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('backup')}
            >
              <Download size={15} />
              Copia de Seguridad (Backup)
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EMPLOYEES BULK IMPORT                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'employees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.875rem 1rem', fontSize: '0.825rem', color: '#166534' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700 }}>
                  <Info size={16} />
                  <span>Compatible 100% con tu Plantilla de Excel:</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadEmployeeTemplate}
                  className="btn btn-sm"
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                  title="Descargar archivo Excel (.xlsx) con los encabezados oficiales y datos de ejemplo"
                >
                  <Download size={13} />
                  <span>Descargar Plantilla Excel (.xlsx)</span>
                </button>
              </div>
              <p style={{ margin: 0 }}>
                Puedes descargar la plantilla oficial en <code>.xlsx</code> o seleccionar y copiar las filas de tu Excel (con o sin encabezado) y pegarlas aquí directamente. El sistema detecta automáticamente fechas como <code>DD/MM/YYYY</code> (ej. <code>15/09/2025</code>) y columnas separadas por tabulaciones.
              </p>
              <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', background: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <thead style={{ background: '#ea580c', color: '#ffffff' }}>
                    <tr>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>1. Codigo</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>2. APELLIDOS Y NOMBRES</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>3. Doc Ident.</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>4. Fecha Ingr.</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>5. Tipo Trab.</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>6. Categoria</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>7. Area</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>8. Cargo</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>9. ESTADO TRABAJADOR</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>10. FECHA CESE</th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label">Pegar filas copiadas de Excel o CSV:</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}
                    onClick={handleDownloadEmployeeTemplate}
                  >
                    <Download size={13} />
                    <span>Descargar Plantilla Excel (.xlsx)</span>
                  </button>
                  <label className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: '#ea580c', cursor: 'pointer' }}>
                    <Upload size={13} />
                    <span>Subir archivo Excel (.xlsx) o CSV</span>
                    <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => handleFileUpload(e, 'emp')} style={{ display: 'none' }} />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: '#ea580c' }}
                    onClick={() => setEmployeeText(sampleEmployeeExcel)}
                  >
                    Ver ejemplo de tu plantilla
                  </button>
                </div>
              </div>
              <textarea
                className="form-textarea"
                rows={7}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre' }}
                placeholder="Pegue aquí las filas copiadas directamente de su Excel (Ctrl + V)..."
                value={employeeText}
                onChange={(e) => setEmployeeText(e.target.value)}
              />
            </div>

            {/* Live Preview Table for Employees */}
            {previewEmployeeRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Eye size={16} style={{ color: '#ea580c' }} />
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      Previsualización de Mapeo ({previewEmployeeRows.length} filas detectadas):
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                    {previewEmployeeStats.existing > 0 && (
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>
                        🔄 {previewEmployeeStats.existing} a actualizar
                      </span>
                    )}
                    {previewEmployeeStats.newItems > 0 && (
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>
                        ➕ {previewEmployeeStats.newItems} nuevos
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff' }}>
                  <table style={{ width: '100%', fontSize: '0.73rem', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid #cbd5e1' }}>
                      <tr>
                        <th style={{ padding: '5px 8px', textAlign: 'center', width: '35px' }}>#</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Código (Col A)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left', color: '#ea580c', fontWeight: 800 }}>APELLIDOS Y NOMBRES (Col B)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>DNI (Col C)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>F. Ingreso (Col D)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Tipo / Categoría (Col E, F)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Área (Col G)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Cargo (Col H)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'center' }}>Estado (Col I)</th>
                        <th style={{ padding: '5px 8px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewEmployeeRows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '4px 8px', textAlign: 'center', color: '#64748b' }}>{row.rowNum}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 700, fontFamily: 'monospace' }}>{row.codigo}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 800, color: '#0f172a' }}>{row.apellidosNombres}</td>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>{row.documentoIdentidad}</td>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>{formatDateDisplay(row.fechaIngreso)}</td>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>{row.tipoTrabajador}{row.categoria ? ` (${row.categoria})` : ''}</td>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>{row.area}</td>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>{row.cargo}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, background: row.estado === 'ACTIVO' ? '#dcfce7' : '#fee2e2', color: row.estado === 'ACTIVO' ? '#15803d' : '#b91c1c' }}>
                              {row.estado}
                            </span>
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: row.isExisting ? '#2563eb' : '#16a34a' }}>
                              {row.isExisting ? '🔄 Actualizar' : '➕ Nuevo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button
                variant="primary"
                onClick={handleImportEmployees}
                icon={<Upload size={16} />}
                disabled={previewEmployeeRows.length > 0 && previewEmployeeStats.ok === 0}
              >
                Procesar y Cargar Empleados
              </Button>
            </div>

            {employeeResults && (
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: employeeResults.imported > 0 ? '#059669' : '#dc2626' }}>
                  <CheckCircle2 size={18} />
                  <span>Resultado: {employeeResults.imported} empleado(s) importados correctamente.</span>
                </div>
                {employeeResults.errors.length > 0 && (
                  <div style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>Advertencias / Errores:</span>
                    <ul style={{ fontSize: '0.75rem', color: '#dc2626', paddingLeft: '1.25rem' }}>
                      {employeeResults.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: COMPENSATIONS BULK IMPORT                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'compensations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Info box */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.875rem 1rem', fontSize: '0.825rem', color: '#166534' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700 }}>
                  <Info size={16} />
                  <span>Estructura de Carga de Compensaciones (5 Columnas)</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCompensationTemplate}
                  className="btn btn-sm"
                  style={{
                    background: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                  title="Descargar archivo Excel (.xlsx) con los encabezados oficiales y datos de ejemplo"
                >
                  <Download size={13} />
                  <span>Descargar Plantilla Excel (.xlsx)</span>
                </button>
              </div>
              <p style={{ margin: '0 0 0.5rem', color: '#374151' }}>
                Sube tu archivo Excel <code>.xlsx</code> directamente, copia y pega las filas, o descarga la plantilla oficial:
              </p>
              {/* Column mapping table matching user's Excel */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', background: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <thead style={{ background: '#0f766e', color: '#ffffff' }}>
                    <tr>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Col A (1)</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Col B (2)</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Col C (3)</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Col D (4)</th>
                      <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>Col E (5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#f1f5f9', fontWeight: 700, color: '#0f172a' }}>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>DNI</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>Apellidos y Nombres</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>Fecha</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>ESTADO</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>Fecha Compensada</td>
                    </tr>
                    <tr style={{ background: '#ffffff', color: '#334155' }}>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>46356926</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>ISLA SANTAMARIA RODRIGO RAYMUNDO</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>26/04/2026</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.68rem' }}>COMPENSADO</span>
                      </td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>18/05/2026</td>
                    </tr>
                    <tr style={{ background: '#f8fafc', color: '#334155' }}>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>46356926</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>ISLA SANTAMARIA RODRIGO RAYMUNDO</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>29/06/2026</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.68rem' }}>PENDIENTE</span>
                      </td>
                      <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1', color: '#94a3b8', fontStyle: 'italic' }}>(vacío)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Textarea */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label">Pegar filas del Excel o subir archivo:</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600 }}
                    onClick={handleDownloadCompensationTemplate}
                  >
                    <Download size={13} />
                    <span>Descargar Plantilla Excel (.xlsx)</span>
                  </button>
                  <label className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: '#0f766e', cursor: 'pointer' }}>
                    <Upload size={13} />
                    <span>Subir archivo Excel (.xlsx)</span>
                    <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => handleFileUpload(e, 'comp')} style={{ display: 'none' }} />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: '#64748b' }}
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    <Eye size={13} />
                    {showPreview ? 'Ocultar' : 'Mostrar'} previsualización
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: '#2563eb' }}
                    onClick={() => setCompensationText(sampleCompensationExcel)}
                  >
                    Cargar texto de ejemplo
                  </button>
                </div>
              </div>
              <textarea
                className="form-textarea"
                rows={5}
                style={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre' }}
                placeholder={"Pega aquí las filas de tu Excel (con o sin encabezado):\n46356926\tISLA SANTAMARIA RODRIGO RAYMUNDO\t26/04/2026\tCOMPENSADO\t18/05/2026\n46356926\tISLA SANTAMARIA RODRIGO RAYMUNDO\t29/06/2026\tPENDIENTE\t\n42935726\tVALDEZ ZACARIAS JULIO ARMANDO\t07/05/2023\tCOMPENSADO\t04/04/2026"}
                value={compensationText}
                onChange={(e) => { setCompensationText(e.target.value); setCompensationResults(null); }}
              />
            </div>

            {/* ── PREVIEW TABLE ──────────────────────────────────────────────── */}
            {showPreview && previewRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Stats bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={14} /> Previsualización ({previewStats.total} fila{previewStats.total !== 1 ? 's' : ''})
                  </span>
                  {previewStats.ok > 0 && (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.72rem' }}>
                      ✓ {previewStats.ok} listas
                    </span>
                  )}
                  {previewStats.dup > 0 && (
                    <span style={{ background: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.72rem' }}>
                      ⚠ {previewStats.dup} duplicada{previewStats.dup !== 1 ? 's' : ''}
                    </span>
                  )}
                  {previewStats.notFound > 0 && (
                    <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.72rem' }}>
                      ✗ {previewStats.notFound} DNI no encontrado{previewStats.notFound !== 1 ? 's' : ''}
                    </span>
                  )}
                  {previewStats.invalid > 0 && (
                    <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.72rem' }}>
                      ✗ {previewStats.invalid} fecha inválida
                    </span>
                  )}
                </div>

                {/* Hint for not-found */}
                {previewStats.notFound > 0 && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
                    padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#b91c1c',
                    display: 'flex', alignItems: 'flex-start', gap: '0.4rem'
                  }}>
                    <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>
                      <strong>{previewStats.notFound} fila{previewStats.notFound !== 1 ? 's' : ''}</strong> tiene{previewStats.notFound !== 1 ? 'n' : ''} un DNI/Código que <strong>no está registrado</strong> en el sistema.
                      Para importarlas primero debes registrar al trabajador en la pestaña <em>"Plantilla Empleados (Excel)"</em> o desde el módulo de Trabajadores.
                    </span>
                  </div>
                )}

                {/* Hint for duplicates */}
                {previewStats.dup > 0 && (
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px',
                    padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#92400e',
                    display: 'flex', alignItems: 'flex-start', gap: '0.4rem'
                  }}>
                    <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>
                      <strong>{previewStats.dup} fila{previewStats.dup !== 1 ? 's' : ''} duplicada{previewStats.dup !== 1 ? 's' : ''}</strong>: ese trabajador ya tiene ese día registrado. Solo se importarán las {previewStats.ok} filas marcadas en verde.
                    </span>
                  </div>
                )}

                {/* Preview table */}
                <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', minWidth: '650px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#1e293b', color: '#ffffff', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>#</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>DNI</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Trabajador</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Fecha Trabajada</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Estado Excel</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Fecha Compensada</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>Validación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => {
                        const rowBg = row.status === 'ok'
                          ? (i % 2 === 0 ? '#f0fdf4' : '#dcfce7')
                          : row.status === 'duplicate'
                          ? (i % 2 === 0 ? '#fffbeb' : '#fef3c7')
                          : (i % 2 === 0 ? '#fef2f2' : '#fee2e2');

                        return (
                          <tr key={i} style={{ background: rowBg }}>
                            <td style={{ padding: '5px 10px', color: '#64748b', fontWeight: 600 }}>{row.rowNum}</td>
                            <td style={{ padding: '5px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                              {row.rawDni || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(vacío)</span>}
                            </td>
                            <td style={{ padding: '5px 10px', color: row.empleadoNombre ? '#1e293b' : '#ef4444' }}>
                              {row.empleadoNombre
                                ? <span style={{ fontWeight: 600 }}>{row.empleadoNombre}</span>
                                : <span style={{ fontStyle: 'italic', color: '#ef4444' }}>No registrado</span>
                              }
                            </td>
                            <td style={{ padding: '5px 10px', fontFamily: 'monospace', color: row.fechaGenerada ? '#1e293b' : '#ef4444' }}>
                              {row.fechaGenerada
                                ? formatDateDisplay(row.fechaGenerada)
                                : <span style={{ color: '#ef4444', fontStyle: 'italic' }}>{row.fechaGeneradaRaw || '(vacío)'}</span>
                              }
                            </td>
                            <td style={{ padding: '5px 10px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: row.estado === 'COMPENSADO' ? '#dcfce7' : row.estado === 'PROGRAMADO' ? '#dbeafe' : '#fef3c7',
                                color: row.estado === 'COMPENSADO' ? '#15803d' : row.estado === 'PROGRAMADO' ? '#1d4ed8' : '#b45309'
                              }}>
                                {row.estado}
                              </span>
                            </td>
                            <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>
                              {row.fechaCompensada ? (
                                <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                  {formatDateDisplay(row.fechaCompensada)}
                                </span>
                              ) : row.formaCompensacion === 'REMUNERACION' ? (
                                <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.72rem' }}>
                                  💵 Pago en Remuneración
                                </span>
                              ) : row.formaCompensacion === 'LIQUIDACION' ? (
                                <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '0.72rem' }}>
                                  📋 Liquidación BB.SS.
                                </span>
                              ) : row.fechaCompensadaRaw ? (
                                <span style={{ color: '#ef4444', fontStyle: 'italic' }}>{row.fechaCompensadaRaw}</span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '5px 10px' }}>
                              <StatusBadge row={row} />
                              {row.status !== 'ok' && (
                                <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px', maxWidth: '200px' }}>
                                  {row.statusMsg}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
              {previewStats.ok > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                  {previewStats.ok} fila{previewStats.ok !== 1 ? 's' : ''} listas para importar
                </span>
              )}
              <Button
                variant="primary"
                onClick={handleImportCompensations}
                icon={<Upload size={16} />}
                disabled={previewRows.length > 0 && previewStats.ok === 0}
              >
                Procesar y Cargar Compensaciones
              </Button>
            </div>

            {/* Results panel */}
            {compensationResults && (
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: compensationResults.imported > 0 ? '#059669' : '#dc2626' }}>
                  <CheckCircle2 size={18} />
                  <span>Resultado: {compensationResults.imported} registro(s) importados correctamente.</span>
                </div>
                {compensationResults.errors.length > 0 && (
                  <div style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>Advertencias / Errores:</span>
                    <ul style={{ fontSize: '0.75rem', color: '#dc2626', paddingLeft: '1.25rem' }}>
                      {compensationResults.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: BACKUP & RESTORE                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'backup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                📥 Descargar Copia de Seguridad Completa
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Guarda un archivo <code>.json</code> con todos tus empleados, feriados y compensaciones registradas para tener respaldo permanente o llevarlo a otra computadora.
              </p>
              <Button variant="primary" onClick={handleExportBackup} icon={<Download size={16} />}>
                Descargar Archivo JSON de Respaldo
              </Button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                📤 Restaurar Copia de Seguridad
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Carga un archivo de respaldo JSON generado previamente para recuperar toda tu información de inmediato.
              </p>
              <label className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                <Upload size={16} />
                <span>Seleccionar archivo JSON...</span>
                <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.25rem' }}>
                🗑️ Limpiar / Vaciar Base de Datos
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#7f1d1d', marginBottom: '1rem' }}>
                Elimina todos los empleados y compensaciones registradas en el sistema. Los feriados oficiales del 2026 se conservarán.
              </p>
              <Button variant="danger" onClick={handleClearDatabase} icon={<Trash2 size={16} />}>
                Limpiar Todos los Datos
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
