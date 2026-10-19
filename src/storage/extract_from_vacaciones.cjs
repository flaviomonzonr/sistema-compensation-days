const fs = require('fs');
const path = require('path');

const datasetPath = 'C:\\apps-flavio\\Sistema de Vacaciones\\initial_dataset.json';
const outputPath = path.join(__dirname, 'imported_employees.json');
const seedDataTsPath = path.join(__dirname, 'seedData.ts');

console.log('Iniciando extracción de trabajadores desde Sistema de Vacaciones...');

if (!fs.existsSync(datasetPath)) {
  console.error('No se encontró el dataset en:', datasetPath);
  process.exit(1);
}

const rawData = fs.readFileSync(datasetPath, 'utf8');
const data = JSON.parse(rawData);

let list = [];
if (Array.isArray(data)) {
  list = data;
} else if (data.employees && Array.isArray(data.employees)) {
  list = data.employees;
} else if (data.trabajadores && Array.isArray(data.trabajadores)) {
  list = data.trabajadores;
} else if (data.personal && Array.isArray(data.personal)) {
  list = data.personal;
} else if (data.data && Array.isArray(data.data)) {
  list = data.data;
} else {
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      list = data[key];
      break;
    }
  }
}

console.log(`Total registros leídos en dataset: ${list.length}`);

const employeesMap = new Map();

for (let i = 0; i < list.length; i++) {
  const item = list[i];
  const codigo = String(item.codigo || item.CODIGO || item.id || `EMP-${i + 1}`).trim().toUpperCase();
  const dni = String(item.documentoIdentidad || item.dni || item.DNI || item.DOCUMENTO || item.num_doc || '').trim();
  const nombre = String(item.apellidosNombres || item.nombres || item.NOMBRE || item.nombresApellidos || item.trabajador || '').trim().toUpperCase();
  
  if (!nombre || nombre === 'UNDEFINED') continue;

  let area = String(item.area || item.AREA || item.departamento || 'GENERAL').trim().toUpperCase();
  area = area.replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO');

  const cargo = String(item.cargo || item.CARGO || item.puesto || 'EMPLEADO').trim().toUpperCase();
  const tipo = String(item.tipoTrabajador || item.tipo || item.TIPO || 'EMPLEADO').trim().toUpperCase();
  const categoria = String(item.categoria || item.CATEGORIA || '').trim().toUpperCase();

  const rawEstado = String(item.estado || '').toUpperCase();
  const estado = (rawEstado.includes('CESA') || rawEstado.includes('INACT')) ? 'CESADO' : 'ACTIVO';

  let fIngreso = String(item.fechaIngreso || item.FECHA_INGRESO || item.fecha_ingreso || item.fec_ing || '').trim();
  if (!fIngreso || fIngreso.length < 8) {
    fIngreso = '2026-01-01';
  } else if (fIngreso.includes('/')) {
    const parts = fIngreso.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        fIngreso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        fIngreso = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  const key = codigo || dni || nombre;
  if (!employeesMap.has(key)) {
    employeesMap.set(key, {
      id: `emp-${codigo.toLowerCase().replace(/[^a-z0-9_-]/g, '') || String(i + 1)}`,
      codigo: codigo,
      apellidosNombres: nombre,
      documentoIdentidad: dni,
      fechaIngreso: fIngreso,
      fechaCese: estado === 'CESADO' ? (item.fechaCese || null) : null,
      fechasIngreso: [fIngreso],
      tipoTrabajador: tipo,
      categoria: categoria,
      area: area,
      cargo: cargo,
      estado: estado,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

const employees = Array.from(employeesMap.values());
console.log(`✅ Trabajadores únicos procesados: ${employees.length}`);

// Guardar JSON
fs.writeFileSync(outputPath, JSON.stringify(employees, null, 2), 'utf8');
console.log('JSON guardado en:', outputPath);

// Actualizar seedData.ts directamente
const seedContent = `import { Empleado, Feriado, Compensacion, AprobadorPermiso } from '../types';

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

export const INITIAL_COMPENSATIONS: Compensacion[] = [];

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

fs.writeFileSync(seedDataTsPath, seedContent, 'utf8');
console.log('✅ seedData.ts actualizado con todos los trabajadores sincronizados!');
