const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

// True Excel serial date converter
function excelSerialToYMD(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    if (val >= 202000 && val <= 203000) {
      const s = String(val);
      const y = s.substring(0, 4);
      const m = s.substring(4, 6);
      return `${y}-${m}-01`;
    }
    if (val > 20000 && val < 60000) {
      const d = XLSX.SSF.parse_date_code(val);
      if (!d) return '';
      const y = String(d.y).padStart(4, '0');
      const m = String(d.m).padStart(2, '0');
      const day = String(d.d).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'pendiente' || str === '-' || str === 'null' || str.toLowerCase() === 'no') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{6}$/.test(str)) {
    const y = str.substring(0, 4);
    const m = str.substring(4, 6);
    return `${y}-${m}-01`;
  }
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    const d = XLSX.SSF.parse_date_code(num);
    if (!d) return '';
    const y = String(d.y).padStart(4, '0');
    const m = String(d.m).padStart(2, '0');
    const day = String(d.d).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}

// Clean Area Normalizer
function normalizeArea(rawArea, cargo = '') {
  const cleanA = cleanStr(rawArea).toUpperCase();
  const cleanC = cleanStr(cargo).toUpperCase();

  if (/ELECTRIC|FRIGOR|MANTENIM|MTTO|MEC[AÁ]NIC|ELECTR[OÓ]N|PLANNER/i.test(cleanC)) return 'MANTENIMIENTO';
  if (/CALIDAD|ASEGURAMIENTO|MICROBIOL|INSPECTOR DE ASEG/i.test(cleanC)) return 'CALIDAD';
  if (/BIENESTAR|RRHH|RECURSOS HUMANOS|RECLUTAMIENTO|ASISTENTA|PERSONAL|N[OÓ]MINA/i.test(cleanC)) return 'RECURSOS HUMANOS';
  if (/LOG[IÍ]STICA|ALMAC[EÉ]N|COMPRAS|INVENTARIO|DESPACHO/i.test(cleanC)) return 'LOGISTICA';
  if (/CAMPO|RIEGO|FITOSANITARIO|COSECHA|AGR[OÓ]NOM|SANIDAD/i.test(cleanC)) return 'CAMPO';
  if (/SEGURIDAD|PATRIMONIAL|SST|PREVENCI[OÓ]N/i.test(cleanC)) return 'SEGURIDAD Y SALUD';
  if (/CONTAB|FINANZ|TESORER|COSTOS/i.test(cleanC)) return 'FINANZAS';
  if (/SISTEMA|TI|INFORM[AÁ]TICA/i.test(cleanC)) return 'SISTEMAS';
  if (/PRODUCCI[OÓ]N|PROCESO|ENVASADO|SELECCI[OÓ]N|CORTADOR|OPERARI|ESTIVADOR|DESPENDUC|INSPECTOR DE PROD|CAMARA/i.test(cleanC)) return 'PRODUCCION';
  if (/PLANTA/i.test(cleanC)) return 'PLANTA';

  if (cleanA && !/SECHIN|FUNDO|CASMA|CA3|ORP|ERA|SUCURSAL|\d+/i.test(cleanA)) {
    return cleanA;
  }

  return 'PRODUCCION';
}

const employeeMap = new Map();
const nameToDniMap = new Map();
const codeToDniMap = new Map();
const compMap = new Map();

// 1. Load Master Personal from DATA PERSONAL AL 08.09.2026.xlsx
const fDataPersonal = path.join(downloadsDir, 'DATA PERSONAL AL 08.09.2026.xlsx');
if (fs.existsSync(fDataPersonal)) {
  const wb = XLSX.readFile(fDataPersonal);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Cargando empleados desde DATA PERSONAL (${rows.length} filas)...`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const dni = cleanStr(r[0]).replace(/\D/g, '');
    if (!dni) continue;
    const apPat = cleanStr(r[2]);
    const apMat = cleanStr(r[3]);
    const nom = cleanStr(r[4]);
    const apeNom = cleanStr(r[10]);
    const codigo = cleanStr(r[14]) || dni;
    const fIngreso = excelSerialToYMD(r[11]) || '2026-01-01';
    const fCese = excelSerialToYMD(r[12]) || null;
    const tipoTrab = cleanStr(r[73]).includes('OBRERO') ? 'OBRERO' : 'EMPLEADO';
    const cargo = cleanStr(r[75]) || 'TRABAJADOR';
    let rawArea = cleanStr(r[77]) || cleanStr(r[76]) || cleanStr(r[95]) || 'PLANTA';

    const apellidos = `${apPat} ${apMat}`.trim() || (apeNom.includes(',') ? apeNom.split(',')[0].trim() : apeNom);
    const nombres = nom || (apeNom.includes(',') ? apeNom.split(',')[1].trim() : '');
    const apellidosNombres = apeNom || `${apellidos}, ${nombres}`;

    const empId = `emp-${dni}`;
    const emp = {
      id: empId,
      codigo: codigo,
      apellidosNombres: apellidosNombres,
      documentoIdentidad: dni,
      fechaIngreso: fIngreso,
      fechaCese: fCese,
      fechasIngreso: [fIngreso],
      tipoTrabajador: tipoTrab,
      categoria: cargo,
      area: normalizeArea(rawArea, cargo),
      cargo: cargo,
      estado: fCese ? 'CESADO' : 'ACTIVO',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z'
    };

    employeeMap.set(dni, emp);
    codeToDniMap.set(codigo, dni);
    if (apeNom) nameToDniMap.set(apeNom.toUpperCase(), dni);
    nameToDniMap.set(`${apellidos} ${nombres}`.trim().toUpperCase(), dni);
    nameToDniMap.set(`${nombres} ${apellidos}`.trim().toUpperCase(), dni);
  }
}
console.log(`Master employees cargados: ${employeeMap.size}`);

function registerOrGetEmployee(doc, code, fullName, area, cargo) {
  const dni = cleanStr(doc).replace(/\D/g, '');
  const cleanCode = cleanStr(code);
  const cleanName = cleanStr(fullName).toUpperCase();

  let targetDni = dni;
  if (!targetDni && cleanCode && codeToDniMap.has(cleanCode)) {
    targetDni = codeToDniMap.get(cleanCode);
  }
  if (!targetDni && cleanName && nameToDniMap.has(cleanName)) {
    targetDni = nameToDniMap.get(cleanName);
  }
  if (!targetDni && cleanName) {
    for (const [n, d] of nameToDniMap.entries()) {
      if (n.includes(cleanName) || cleanName.includes(n)) {
        targetDni = d;
        break;
      }
    }
  }

  if (!targetDni) {
    if (!dni && !cleanName) return null;
    targetDni = dni || `EMP_${cleanName.slice(0, 15).replace(/\s/g, '')}`;
  }

  let emp = employeeMap.get(targetDni);
  const normArea = normalizeArea(area, cargo);
  if (!emp) {
    let apellidos = cleanName;
    let nombres = '';
    if (cleanName.includes(',')) {
      const parts = cleanName.split(',');
      apellidos = parts[0].trim();
      nombres = parts[1].trim();
    } else {
      const parts = cleanName.split(' ');
      if (parts.length >= 3) {
        apellidos = `${parts[0]} ${parts[1]}`;
        nombres = parts.slice(2).join(' ');
      }
    }
    const empId = targetDni.startsWith('emp-') ? targetDni : `emp-${targetDni}`;
    emp = {
      id: empId,
      codigo: cleanCode || targetDni,
      apellidosNombres: cleanName.includes(',') ? cleanName : `${apellidos}, ${nombres}`.trim(),
      documentoIdentidad: targetDni.startsWith('EMP_') ? '' : targetDni,
      fechaIngreso: '2026-01-01',
      fechaCese: null,
      fechasIngreso: ['2026-01-01'],
      tipoTrabajador: 'EMPLEADO',
      categoria: cleanStr(cargo) || 'TRABAJADOR',
      area: normArea,
      cargo: cleanStr(cargo) || 'TRABAJADOR',
      estado: 'ACTIVO',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z'
    };
    employeeMap.set(targetDni, emp);
  } else {
    if (normArea && normArea !== 'OPERACIONES' && (emp.area === 'OPERACIONES' || emp.area === 'GENERAL' || !emp.area)) {
      emp.area = normArea;
    }
    if (cleanStr(cargo) && (emp.cargo === 'TRABAJADOR' || !emp.cargo)) {
      emp.cargo = cleanStr(cargo);
      emp.categoria = cleanStr(cargo);
    }
  }

  if (cleanName) nameToDniMap.set(cleanName, targetDni);
  if (cleanCode) codeToDniMap.set(cleanCode, targetDni);
  return emp;
}

let compCounter = 1;

function addCompensation(emp, fechaGenRaw, fechaCompRaw, estadoRaw, motivoRaw) {
  if (!emp) return;
  const fGen = excelSerialToYMD(fechaGenRaw);
  if (!fGen || !/^\d{4}-\d{2}-\d{2}$/.test(fGen)) return;
  if (fGen > '2026-10-03') return; // Guard: No future dates allowed

  let fComp = excelSerialToYMD(fechaCompRaw);
  if (fComp && fComp > '2026-10-03') fComp = fGen;
  let estado = 'PENDIENTE';
  const estLower = cleanStr(estadoRaw).toLowerCase();
  if (estLower.includes('compensa') || estLower.includes('gozado') || estLower.includes('si') || estLower.includes('pagado') || (fComp && fComp.length > 0)) {
    estado = 'COMPENSADO';
  } else if (estLower.includes('anulad')) {
    estado = 'ANULADO';
  }

  const key = `${emp.id}_${fGen}`;
  if (!compMap.has(key)) {
    const padId = String(compCounter++).padStart(5, '0');
    compMap.set(key, {
      id: `comp-${padId}`,
      empleadoId: emp.id,
      fechaGenerada: fGen,
      fechaCompensacion: fComp || (estado === 'COMPENSADO' ? fGen : null),
      estado: estado,
      formaCompensacion: 'DESCANSO',
      observacion: cleanStr(motivoRaw) || (estado === 'COMPENSADO' ? 'Compensación gozada' : 'Día de descanso/feriado pendiente'),
      motivoAnulacion: null,
      createdAt: `${fGen}T00:00:00.000Z`,
      updatedAt: `${fComp || fGen}T00:00:00.000Z`
    });
  } else {
    const existing = compMap.get(key);
    if (existing.estado === 'PENDIENTE' && estado === 'COMPENSADO') {
      existing.estado = 'COMPENSADO';
      existing.fechaCompensacion = fComp || fGen;
    }
    if (!existing.fechaCompensacion && fComp) {
      existing.fechaCompensacion = fComp;
    }
  }
}

function parseDynamicRow(sourceName, row, defaultArea = 'PLANTA', defaultCargo = 'TRABAJADOR') {
  if (!row || row.length === 0) return;
  
  // Find DNI
  let dni = '';
  let name = '';
  let cargo = defaultCargo;
  let area = defaultArea;

  for (let i = 0; i < Math.min(row.length, 5); i++) {
    const s = cleanStr(row[i]).replace(/\D/g, '');
    if (s.length === 8 && !s.startsWith('0000')) {
      dni = s;
      break;
    }
  }
  
  for (let i = 0; i < Math.min(row.length, 5); i++) {
    const s = cleanStr(row[i]);
    if (s.length > 5 && /[A-Z]/.test(s) && !/^\d+$/.test(s) && !s.includes('PLANTA') && !s.includes('EMPLEADOS') && !s.includes('OBREROS')) {
      name = s;
      break;
    }
  }

  // Check for cargo/area in row
  for (let i = 2; i < Math.min(row.length, 6); i++) {
    const s = cleanStr(row[i]);
    if (s.length > 3 && !/^\d+$/.test(s) && !s.startsWith('CA3')) {
      if (/SUPERVISOR|JEFE|COORDINADOR|ASISTENTE|ANALISTA|INSPECTOR|TECNICO|ALMACENERO|PLANNER|PREVENCIONISTA/i.test(s)) {
        cargo = s;
      }
      if (/MANTENIM|CALIDAD|PRODUCCI|LOGIST|RRHH|SST|SISTEMA|FINANZ|CAMPO/i.test(s)) {
        area = s;
      }
    }
  }

  if (!dni && !name) return;

  const emp = registerOrGetEmployee(dni, dni, name || sourceName, area, cargo);
  if (!emp) return;

  // Scan all cells for status and dates
  const dates = [];
  let isGozado = false;
  let isAnulado = false;

  for (let c = 0; c < row.length; c++) {
    const cell = row[c];
    if (cell === undefined || cell === null) continue;
    const strVal = cleanStr(cell).toUpperCase();
    
    if (strVal === 'SI' || strVal === 'COMPENSADO' || strVal.includes('GOZADO') || strVal.includes('PAGADO') || strVal === 'C' || strVal === 'OK') {
      isGozado = true;
    }
    if (strVal.includes('ANULAD')) {
      isAnulado = true;
    }

    const dStr = excelSerialToYMD(cell);
    if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      if (dStr <= '2026-10-03') {
        dates.push({ date: dStr, colIndex: c });
      }
    }
  }

  if (dates.length === 0) return;

  let fGen = dates[0].date;
  let fComp = dates.length > 1 ? dates[1].date : null;

  let estado = 'PENDIENTE';
  if (isAnulado) {
    estado = 'ANULADO';
  } else if (isGozado || fComp) {
    estado = 'COMPENSADO';
  }

  addCompensation(emp, fGen, fComp, estado, `Compensación (${sourceName})`);
}

// 1. Parse plantillas masivas (Mantenimiento, Tania Tarazona, Nayely Maldonado, Julinho Olavarria)
const plantillas = [
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones.xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (1).xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (2).xlsx'
];

for (const fp of plantillas) {
  if (!fs.existsSync(fp)) continue;
  const wb = XLSX.readFile(fp);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  for (let i = 1; i < rows.length; i++) {
    parseDynamicRow(path.basename(fp), rows[i], 'MANTENIMIENTO', 'TECNICO');
  }
}

// 2. Parse COMPENSACIONES_AUTOMATIZADO_v2.xlsx (all worker sheets with exact serial dates)
const autoPath = 'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx';
if (fs.existsSync(autoPath)) {
  const wb = XLSX.readFile(autoPath);
  const exclude = ['DIAS', 'LISTA FERIADOS', 'MARCAS', 'MARCAS_COMPENSABLES', 'Detalle '];
  for (const sn of wb.SheetNames) {
    if (exclude.includes(sn)) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      parseDynamicRow(sn.trim(), rows[i]);
    }
  }
}

// 3. Parse DIAS PENDIENTE POR COMPENSAR MTTO.xlsx
const mttoPendPath = 'C:\\Users\\Usuario\\Downloads\\DIAS PENDIENTE POR COMPENSAR MTTO.xlsx';
if (fs.existsSync(mttoPendPath)) {
  const wb = XLSX.readFile(mttoPendPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['PENDIENTES DE COMPENSACION'], { header: 1 });
  for (let i = 1; i < rows.length; i++) {
    parseDynamicRow('MTTO_PEND', rows[i], 'MANTENIMIENTO', 'TECNICO');
  }
}

// 4. Parse DIAS DE COMPENSACION.xlsx -> DIAS POR COMPENSAR
const diasCompPath = 'C:\\Users\\Usuario\\Downloads\\DIAS DE COMPENSACION.xlsx';
if (fs.existsSync(diasCompPath)) {
  const wb = XLSX.readFile(diasCompPath);
  if (wb.Sheets['DIAS POR COMPENSAR']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['DIAS POR COMPENSAR'], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      parseDynamicRow('DIAS_POR_COMP', rows[i]);
    }
  }
}

console.log(`\n=== CONSOLIDACIÓN COMPLETA SIN ERRORES DE FECHAS ===`);
console.log(`Total Empleados en Padrón: ${employeeMap.size}`);
console.log(`Total Compensaciones Puras Reales: ${compMap.size}`);

const finalEmployees = Array.from(employeeMap.values());
const finalCompensations = Array.from(compMap.values());

// Breakdown by Worker
const workerBreakdown = {};
for (const c of finalCompensations) {
  const emp = finalEmployees.find(e => e.id === c.empleadoId);
  const name = emp ? emp.apellidosNombres : c.empleadoId;
  if (!workerBreakdown[name]) {
    workerBreakdown[name] = { total: 0, pendientes: 0, compensados: 0, area: emp?.area };
  }
  workerBreakdown[name].total++;
  if (c.estado === 'PENDIENTE') workerBreakdown[name].pendientes++;
  if (c.estado === 'COMPENSADO') workerBreakdown[name].compensados++;
}

console.log('\nDesglose por Trabajador Registrado (con VIERA CELI incluido):');
console.table(workerBreakdown);

// Generate clean seedData.ts
const holidaysCode = `export const INITIAL_HOLIDAYS_2026: Feriado[] = [
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
];`;

const approversCode = `export const INITIAL_APPROVERS: AprobadorPermiso[] = [
  { id: 'app-001', nombreCompleto: 'Lic. María Elena Ramos Paredes', cargo: 'JEFE DE RECURSOS HUMANOS', area: 'RECURSOS HUMANOS', documentoIdentidad: '41209845', firmaUrl: '/firma-jefe-rrhh.png', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-007', nombreCompleto: 'Miguel A. O. Bocanegra', cargo: 'JEFE DE RECURSOS HUMANOS', area: 'RECURSOS HUMANOS', documentoIdentidad: '42819234', firmaUrl: '/firma-miguel-bocanegra.png', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-002', nombreCompleto: 'Ing. Roberto Chang Morales', cargo: 'GERENTE DE OPERACIONES', area: 'OPERACIONES', documentoIdentidad: '10982341', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-003', nombreCompleto: 'Ing. Víctor Hugo Alva Sánchez', cargo: 'JEFE DE PLANTA SECHÍN', area: 'PRODUCCIÓN', documentoIdentidad: '43901234', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-004', nombreCompleto: 'Ing. Manuel Benites Paredes', cargo: 'JEFE DE FUNDO IV PALOS', area: 'CAMPO / AGRÍCOLA', documentoIdentidad: '32890123', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-005', nombreCompleto: 'Ing. Fernando Castillo Prado', cargo: 'GERENTE GENERAL', area: 'GERENCIA GENERAL', documentoIdentidad: '08761234', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' },
  { id: 'app-006', nombreCompleto: 'Sr. David Huamán Espinoza', cargo: 'SUPERVISOR DE MANTENIMIENTO', area: 'MANTENIMIENTO', documentoIdentidad: '45678901', estado: 'ACTIVO', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: '2026-01-01T08:00:00.000Z' }
];`;

const fullTs = `import { Empleado, Feriado, Compensacion, AprobadorPermiso } from '../types';

${holidaysCode}

export const INITIAL_EMPLOYEES: Empleado[] = ${JSON.stringify(finalEmployees, null, 2)};

export const INITIAL_COMPENSATIONS: Compensacion[] = ${JSON.stringify(finalCompensations, null, 2)};

${approversCode}
`;

const targetSeedPath = path.join(__dirname, 'seedData.ts');
fs.writeFileSync(targetSeedPath, fullTs, 'utf8');
console.log(`\n✅ seedData.ts regenerado 100% puro en ${targetSeedPath} (${(fs.statSync(targetSeedPath).size / 1024).toFixed(1)} KB)`);
