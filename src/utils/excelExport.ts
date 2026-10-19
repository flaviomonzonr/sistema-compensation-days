import * as XLSX from 'xlsx';
import { Empleado, Compensacion, CompensacionConEmpleado } from '../types';
import { formatDateDisplay } from './dateUtils';
import { formatObservationForDisplay } from './observationUtils';

const getModalidadLabel = (forma?: string) => {
  if (forma === 'REMUNERACION') return 'Pago en Remuneración';
  if (forma === 'LIQUIDACION') return 'Liquidación BB.SS.';
  return 'Día de Descanso';
};

const getFechaCompensacionLabel = (c: Compensacion | CompensacionConEmpleado) => {
  if (c.fechaCompensacion) return formatDateDisplay(c.fechaCompensacion);
  if (c.formaCompensacion === 'REMUNERACION') return 'Pago en Remuneración';
  if (c.formaCompensacion === 'LIQUIDACION') return 'Liquidación BB.SS.';
  return c.estado === 'COMPENSADO' ? 'Compensado' : (c.estado === 'PENDIENTE' ? 'Pendiente' : '-');
};

/**
 * Exporta las compensaciones de un trabajador específico a formato Excel (.xlsx)
 */
export const exportWorkerCompensationsToExcel = (
  employee: Empleado,
  compensations: Compensacion[]
) => {
  if (!employee || compensations.length === 0) return;

  const data = compensations.map((c, index) => ({
    'N°': index + 1,
    'DNI / Documento': employee.documentoIdentidad,
    'Trabajador': employee.apellidosNombres,
    'Área': employee.area,
    'Cargo': employee.cargo,
    'Día Trabajado (Generado)': formatDateDisplay(c.fechaGenerada),
    'Estado': c.estado,
    'Modalidad / Forma': getModalidadLabel(c.formaCompensacion),
    'Fecha Compensación': getFechaCompensacionLabel(c),
    'Observación / Motivo': formatObservationForDisplay(c.observacion),
    'Motivo de Anulación': c.motivoAnulacion || '-',
    'Fecha de Registro': c.createdAt ? new Date(c.createdAt).toLocaleString('es-PE') : '-',
    'Última Modificación': c.updatedAt ? new Date(c.updatedAt).toLocaleString('es-PE') : '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Ajuste de ancho de columnas
  worksheet['!cols'] = [
    { wch: 5 },   // N°
    { wch: 16 },  // DNI
    { wch: 32 },  // Trabajador
    { wch: 20 },  // Área
    { wch: 22 },  // Cargo
    { wch: 18 },  // Día Generado
    { wch: 15 },  // Estado
    { wch: 22 },  // Modalidad / Forma
    { wch: 22 },  // Fecha Compensación
    { wch: 35 },  // Observación
    { wch: 25 },  // Motivo Anulación
    { wch: 22 },  // Fecha Registro
    { wch: 22 }   // Última Modificación
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Compensaciones');

  const cleanName = employee.apellidosNombres
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');
  const today = new Date().toISOString().split('T')[0];

  const fileName = `Compensaciones_${employee.documentoIdentidad}_${cleanName}_${today}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Exporta el listado global o filtrado de compensaciones a formato Excel (.xlsx)
 */
export const exportGlobalCompensationsToExcel = (
  compensations: CompensacionConEmpleado[],
  filterTitle?: string
) => {
  if (compensations.length === 0) return;

  const data = compensations.map((c, index) => ({
    'N°': index + 1,
    'DNI / Documento': c.empleado?.documentoIdentidad || '-',
    'Código': c.empleado?.codigo || '-',
    'Trabajador': c.empleado?.apellidosNombres || 'Desconocido',
    'Área': c.empleado?.area || '-',
    'Cargo': c.empleado?.cargo || '-',
    'Día Trabajado': formatDateDisplay(c.fechaGenerada),
    'Estado': c.estado,
    'Modalidad / Forma': getModalidadLabel(c.formaCompensacion),
    'Fecha Compensación': getFechaCompensacionLabel(c),
    'Observación': formatObservationForDisplay(c.observacion),
    'Motivo Anulación': c.motivoAnulacion || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 5 },   // N°
    { wch: 16 },  // DNI
    { wch: 12 },  // Código
    { wch: 32 },  // Trabajador
    { wch: 20 },  // Área
    { wch: 22 },  // Cargo
    { wch: 16 },  // Día Trabajado
    { wch: 15 },  // Estado
    { wch: 22 },  // Modalidad / Forma
    { wch: 22 },  // Fecha Compensación
    { wch: 35 },  // Observación
    { wch: 25 }   // Motivo Anulación
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Global');

  const today = new Date().toISOString().split('T')[0];
  const fileName = `${filterTitle || 'Reporte_Global_Compensaciones'}_${today}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Exporta el listado o directorio de empleados a formato Excel (.xlsx)
 */
export const exportEmployeesToExcel = (
  employees: Empleado[],
  customTitle?: string
) => {
  if (!employees || employees.length === 0) return;

  const data = employees.map((e, index) => ({
    'N°': index + 1,
    'Código': e.codigo || '-',
    'DNI / Documento': e.documentoIdentidad || '-',
    'Apellidos y Nombres': e.apellidosNombres || '-',
    'Tipo Trabajador': e.tipoTrabajador || 'EMPLEADO',
    'Categoría': e.categoria || '-',
    'Área': e.area || '-',
    'Cargo': e.cargo || '-',
    'Fecha Ingreso': formatDateDisplay(e.fechaIngreso),
    'Estado': e.estado || 'ACTIVO',
    'Fecha Cese': e.fechaCese ? formatDateDisplay(e.fechaCese) : '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 5 },   // N°
    { wch: 14 },  // Código
    { wch: 16 },  // DNI
    { wch: 38 },  // Apellidos y Nombres
    { wch: 18 },  // Tipo
    { wch: 30 },  // Categoría
    { wch: 32 },  // Área
    { wch: 34 },  // Cargo
    { wch: 16 },  // Fecha Ingreso
    { wch: 14 },  // Estado
    { wch: 16 }   // Fecha Cese
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Directorio Empleados');

  const today = new Date().toISOString().split('T')[0];
  const fileName = `${customTitle || 'Directorio_Empleados'}_${today}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
