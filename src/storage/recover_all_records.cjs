const fs = require('fs');
const path = require('path');

const levelDbDir = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB\\http_localhost_5173.indexeddb.leveldb';
const outputCompsPath = path.join(__dirname, 'recovered_compensations.json');
const outputEmpsPath = path.join(__dirname, 'recovered_employees.json');
const seedDataPath = path.join(__dirname, 'seedData.ts');

console.log('--- RECUPERADOR DE DATOS INDEXEDDB DE LOCALHOST:5173 ---');

const files = fs.readdirSync(levelDbDir);
const compensationsMap = new Map();
const employeesMap = new Map();

function parseStringAt(buf, offset) {
  // En V8 Structured Clone: byte 0x22 ('"'), luego varint length, luego bytes de string
  if (buf[offset] !== 0x22) return null;
  const len = buf[offset + 1];
  if (offset + 2 + len > buf.length) return null;
  const str = buf.subarray(offset + 2, offset + 2 + len).toString('utf8');
  return { str, nextOffset: offset + 2 + len };
}

for (const file of files) {
  if (!file.endsWith('.ldb') && !file.endsWith('.log')) continue;
  const filePath = path.join(levelDbDir, file);
  const buf = fs.readFileSync(filePath);
  
  // 1. Extraer Compensaciones
  let pos = 0;
  while ((pos = buf.indexOf(Buffer.from('fechaGenerada'), pos)) !== -1) {
    // Retroceder para encontrar el inicio del objeto
    const searchStart = Math.max(0, pos - 300);
    const searchEnd = Math.min(buf.length, pos + 700);
    const slice = buf.subarray(searchStart, searchEnd);
    const text = slice.toString('latin1');
    
    // Extraer campos usando expresiones regulares sobre el stream ASCII
    const idMatch = text.match(/id["\x00-\x20]+(comp-[a-zA-Z0-9_-]+)/);
    const empIdMatch = text.match(/empleadoId["\x00-\x20]+(emp-[a-zA-Z0-9_-]+)/);
    const fGenMatch = text.match(/fechaGenerada["\x00-\x20]+(\d{4}-\d{2}-\d{2})/);
    const fCompMatch = text.match(/fechaCompensacion["\x00-\x20]+(\d{4}-\d{2}-\d{2})/);
    const estMatch = text.match(/estado["\x00-\x20]+(PENDIENTE|PROGRAMADO|COMPENSADO|ANULADO)/);
    const formaMatch = text.match(/formaCompensacion["\x00-\x20]+(DESCANSO|PAGADO|DINERO)/);
    const obsMatch = text.match(/observacion["\x00-\x20]+([^"\x00-\x1F]{1,80})/);
    const createdMatch = text.match(/createdAt["\x00-\x20]+(\d{4}-\d{2}-\d{2}T[^\x00-\x20"]+)/);
    const updatedMatch = text.match(/updatedAt["\x00-\x20]+(\d{4}-\d{2}-\d{2}T[^\x00-\x20"]+)/);

    if (fGenMatch && (empIdMatch || idMatch)) {
      const compId = idMatch ? idMatch[1] : `comp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
      const empId = empIdMatch ? empIdMatch[1] : '';
      const fechaGen = fGenMatch[1];
      const estado = estMatch ? estMatch[1] : (fCompMatch ? 'COMPENSADO' : 'PENDIENTE');

      const key = `${empId}_${fechaGen}`;
      if (!compensationsMap.has(key) || compensationsMap.get(key).estado === 'PENDIENTE') {
        compensationsMap.set(key, {
          id: compId,
          empleadoId: empId,
          fechaGenerada: fechaGen,
          fechaCompensacion: fCompMatch ? fCompMatch[1] : null,
          estado: estado,
          formaCompensacion: formaMatch ? formaMatch[1] : 'DESCANSO',
          observacion: obsMatch ? obsMatch[1].trim() : '',
          createdAt: createdMatch ? createdMatch[1] : new Date().toISOString(),
          updatedAt: updatedMatch ? updatedMatch[1] : new Date().toISOString()
        });
      }
    }
    pos += 15;
  }

  // 2. Extraer Empleados
  let empPos = 0;
  while ((empPos = buf.indexOf(Buffer.from('apellidosNombres'), empPos)) !== -1) {
    const searchStart = Math.max(0, empPos - 200);
    const searchEnd = Math.min(buf.length, empPos + 800);
    const slice = buf.subarray(searchStart, searchEnd);
    const text = slice.toString('latin1');

    const idMatch = text.match(/id["\x00-\x20]+(emp-[a-zA-Z0-9_-]+)/);
    const codMatch = text.match(/codigo["\x00-\x20]+([a-zA-Z0-9_-]{2,20})/);
    const nomMatch = text.match(/apellidosNombres["\x00-\x20]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\/-]{3,80})/);
    const docMatch = text.match(/documentoIdentidad["\x00-\x20]+(\d{6,12})/);
    const fIngMatch = text.match(/fechaIngreso["\x00-\x20]+(\d{4}-\d{2}-\d{2})/);
    const areaMatch = text.match(/area["\x00-\x20]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\/-]{2,50})/);
    const cargoMatch = text.match(/cargo["\x00-\x20]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\/-]{2,50})/);
    const tipoMatch = text.match(/tipoTrabajador["\x00-\x20]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\/-]{2,30})/);
    const catMatch = text.match(/categoria["\x00-\x20]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\/-]{2,30})/);
    const estMatch = text.match(/estado["\x00-\x20]+(ACTIVO|CESADO)/);

    if (idMatch && nomMatch) {
      const empId = idMatch[1];
      const nombre = nomMatch[1].trim().toUpperCase();
      const cod = codMatch ? codMatch[1].trim().toUpperCase() : empId;
      const doc = docMatch ? docMatch[1].trim() : '';
      const fIng = fIngMatch ? fIngMatch[1] : '2026-01-01';
      const area = areaMatch ? areaMatch[1].trim().toUpperCase().replace(/ASEGESURAMIENTO/g, 'ASEGURAMIENTO') : 'GENERAL';
      const cargo = cargoMatch ? cargoMatch[1].trim().toUpperCase() : 'EMPLEADO';
      const tipo = tipoMatch ? tipoMatch[1].trim().toUpperCase() : 'EMPLEADO';
      const cat = catMatch ? catMatch[1].trim().toUpperCase() : '';
      const est = estMatch ? estMatch[1] : 'ACTIVO';

      if (!employeesMap.has(empId)) {
        employeesMap.set(empId, {
          id: empId,
          codigo: cod,
          apellidosNombres: nombre,
          documentoIdentidad: doc,
          fechaIngreso: fIng,
          fechaCese: est === 'CESADO' ? '2026-01-01' : null,
          fechasIngreso: [fIng],
          tipoTrabajador: tipo,
          categoria: cat,
          area: area,
          cargo: cargo,
          estado: est,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    empPos += 15;
  }
}

const allComps = Array.from(compensationsMap.values());
const allEmps = Array.from(employeesMap.values());

console.log(`\n🎉 TOTAL COMPENSACIONES RECUPERADAS: ${allComps.length}`);
console.log(`🎉 TOTAL EMPLEADOS RECUPERADOS: ${allEmps.length}`);

// Resumen por estado de compensaciones
const stats = {};
allComps.forEach(c => {
  stats[c.estado] = (stats[c.estado] || 0) + 1;
});
console.log('Desglose de compensaciones por estado:', stats);

// Guardar archivos JSON
fs.writeFileSync(outputCompsPath, JSON.stringify(allComps, null, 2), 'utf8');
fs.writeFileSync(outputEmpsPath, JSON.stringify(allEmps, null, 2), 'utf8');

// Leer los 1206 empleados extraídos del sistema principal y fusionarlos con los IDs recuperados
const importedEmpsRaw = fs.readFileSync(path.join(__dirname, 'imported_employees.json'), 'utf8');
const importedEmps = JSON.parse(importedEmpsRaw);

// Crear mapa maestro de empleados
const masterEmpsMap = new Map();
// 1. Añadir empleados de LevelDB (con sus IDs originales)
allEmps.forEach(e => masterEmpsMap.set(e.id, e));
// 2. Añadir/fusionar empleados del dataset
importedEmps.forEach(e => {
  if (!masterEmpsMap.has(e.id)) {
    masterEmpsMap.set(e.id, e);
  }
});

const masterEmps = Array.from(masterEmpsMap.values());

// Escribir seedData.ts con TODO: empleados + compensaciones recuperadas
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

export const INITIAL_EMPLOYEES: Empleado[] = ${JSON.stringify(masterEmps, null, 2)};

export const INITIAL_COMPENSATIONS: Compensacion[] = ${JSON.stringify(allComps, null, 2)};

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
console.log(`\n✅ seedData.ts REGENERADO CON ${masterEmps.length} EMPLEADOS Y ${allComps.length} COMPENSACIONES RECUPERADAS!`);
