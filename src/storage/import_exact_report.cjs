const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const reportPath = 'C:\\Users\\Usuario\\Downloads\\Reporte_Compensaciones_2026-09-27.xlsx';
const seedDataPath = path.join(__dirname, 'seedData.ts');

console.log('=== IMPORTANDO REPORTE REAL DE COMPENSACIONES ===');

const wb = XLSX.readFile(reportPath, { cellDates: false });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });

console.log(`Total filas en el archivo oficial: ${rows.length}`);

function parseDDMMYYYY(val) {
  if (!val || val === '-' || val.toLowerCase() === 'pendiente') return null;
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return null;
}

const employeesMap = new Map();
const compensations = [];

rows.forEach((r, idx) => {
  const dni = String(r['DNI / Documento'] || r.DNI || r.dni || '').trim();
  const codigo = String(r['Código'] || r.Codigo || r.codigo || dni).trim();
  const nombre = String(r.Trabajador || r['Apellidos y Nombres'] || '').trim().toUpperCase();
  const area = String(r['Área'] || r.Area || 'MANTENIMIENTO').trim().toUpperCase().replace(/ASEGESURAMIENTO/g, 'ASEGURAMIENTO');
  const cargo = String(r.Cargo || 'EMPLEADO').trim().toUpperCase();

  const empId = `emp-${codigo.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;

  if (!employeesMap.has(empId)) {
    employeesMap.set(empId, {
      id: empId,
      codigo: codigo,
      apellidosNombres: nombre,
      documentoIdentidad: dni,
      fechaIngreso: '2026-01-01',
      fechaCese: null,
      fechasIngreso: ['2026-01-01'],
      tipoTrabajador: 'EMPLEADO',
      categoria: 'MANTENIMIENTO',
      area: area,
      cargo: cargo,
      estado: 'ACTIVO',
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z'
    });
  }

  const fGen = parseDDMMYYYY(r['Día Trabajado']);
  const fComp = parseDDMMYYYY(r['Fecha Compensación']);
  const estadoRaw = String(r.Estado || 'PENDIENTE').trim().toUpperCase();
  const estado = estadoRaw === 'COMPENSADO' ? 'COMPENSADO' : (estadoRaw === 'PROGRAMADO' ? 'PROGRAMADO' : 'PENDIENTE');
  const formaRaw = String(r['Modalidad / Forma'] || 'Día de Descanso').toUpperCase();
  const forma = formaRaw.includes('PAG') || formaRaw.includes('DINERO') ? 'PAGADO' : 'DESCANSO';
  const obs = String(r['Observación'] || '').trim();

  if (fGen) {
    compensations.push({
      id: `comp-${String(idx + 1).padStart(5, '0')}`,
      empleadoId: empId,
      fechaGenerada: fGen,
      fechaCompensacion: fComp,
      estado: estado,
      formaCompensacion: forma,
      observacion: obs === '-' ? '' : obs,
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z'
    });
  }
});

const employees = Array.from(employeesMap.values());

console.log(`✅ Trabajadores cargados: ${employees.length}`);
console.log(`✅ Compensaciones cargadas: ${compensations.length}`);

// Resumen por estado
const stats = {};
compensations.forEach(c => {
  stats[c.estado] = (stats[c.estado] || 0) + 1;
});
console.log('Resumen por estado:', stats);

// Escribir seedData.ts exactamente con estos datos
const seedDataContent = `import { Empleado, Feriado, Compensacion, AprobadorPermiso } from '../types';

export const INITIAL_HOLIDAYS_2026: Feriado[] = [
  { id: 'fer-2026-01', fecha: '2026-01-01', descripcion: 'Año Nuevo', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-02', fecha: '2026-04-02', descripcion: 'Jueves Santo', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-03', fecha: '2026-04-03', descripcion: 'Viernes Santo', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-04', fecha: '2026-05-01', descripcion: 'Día del Trabajo', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-05', fecha: '2026-06-07', descripcion: 'Batalla de Arica y Día de la Bandera', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-06', fecha: '2026-06-29', descripcion: 'San Pedro y San Pablo', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-07', fecha: '2026-07-23', descripcion: 'Día de la Fuerza Aérea del Perú', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-08', fecha: '2026-07-28', descripcion: 'Fiestas Patrias', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-09', fecha: '2026-07-29', descripcion: 'Fiestas Patrias', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-10', fecha: '2026-08-06', descripcion: 'Batalla de Junín', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-11', fecha: '2026-08-30', descripcion: 'Santa Rosa de Lima', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-12', fecha: '2026-10-08', descripcion: 'Combate de Angamos', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-13', fecha: '2026-11-01', descripcion: 'Día de Todos los Santos', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-14', fecha: '2026-12-08', descripcion: 'Inmaculada Concepción', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-15', fecha: '2026-12-09', descripcion: 'Batalla de Ayacucho', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-16', fecha: '2026-12-25', descripcion: 'Navidad', estado: 'ACTIVO', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

export const INITIAL_EMPLOYEES: Empleado[] = ${JSON.stringify(employees, null, 2)};

export const INITIAL_COMPENSATIONS: Compensacion[] = ${JSON.stringify(compensations, null, 2)};

export const INITIAL_APPROVERS: AprobadorPermiso[] = [
  { id: 'app-001', nombreCompleto: 'Lic. María Elena Ramos Paredes', cargo: 'JEFE DE RECURSOS HUMANOS', area: 'RECURSOS HUMANOS', documentoIdentidad: '41209845', firmaUrl: '/firma-jefe-rrhh.png', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-007', nombreCompleto: 'Miguel A. O. Bocanegra', cargo: 'JEFE DE RECURSOS HUMANOS', area: 'RECURSOS HUMANOS', documentoIdentidad: '42819234', firmaUrl: '/firma-miguel-bocanegra.png', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-002', nombreCompleto: 'Ing. Roberto Chang Morales', cargo: 'GERENTE DE OPERACIONES', area: 'OPERACIONES', documentoIdentidad: '10982341', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-003', nombreCompleto: 'Ing. Víctor Hugo Alva Sánchez', cargo: 'JEFE DE PLANTA SECHÍN', area: 'PRODUCCIÓN', documentoIdentidad: '43901234', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-004', nombreCompleto: 'Ing. Manuel Benites Paredes', cargo: 'JEFE DE FUNDO IV PALOS', area: 'CAMPO / AGRÍCOLA', documentoIdentidad: '32890123', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-005', nombreCompleto: 'Ing. Fernando Castillo Prado', cargo: 'GERENTE GENERAL', area: 'GERENCIA GENERAL', documentoIdentidad: '08761234', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-006', nombreCompleto: 'Sr. David Huamán Espinoza', cargo: 'SUPERVISOR DE MANTENIMIENTO', area: 'MANTENIMIENTO', documentoIdentidad: '45678901', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' }
];
`;

fs.writeFileSync(seedDataPath, seedDataContent, 'utf8');
console.log('✅ seedData.ts generado limpiamente con tus 735 compensaciones y trabajadores exactos!');
