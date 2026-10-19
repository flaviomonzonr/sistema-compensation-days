const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

// Excel serial date converter
function excelDateToYMD(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'pendiente' || str === '-' || str === 'null') return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let day = dmy[1].padStart(2, '0');
    let month = dmy[2].padStart(2, '0');
    let year = dmy[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  return str;
}

// Area normalizer
function normalizeArea(rawArea, cargo = '') {
  const cleanA = cleanStr(rawArea).toUpperCase();
  const cleanC = cleanStr(cargo).toUpperCase();

  const numericAreaMap = {
    '001': 'ADMINISTRACION',
    '002': 'FINANZAS Y CONTABILIDAD',
    '003': 'RECURSOS HUMANOS',
    '004': 'SISTEMAS Y TI',
    '005': 'LOGISTICA Y ALMACEN',
    '006': 'SEGURIDAD Y SALUD',
    '007': 'CALIDAD',
    '008': 'MANTENIMIENTO',
    '009': 'PRODUCCION',
    '010': 'CAMPO Y OPERACIONES',
    '011': 'SANIDAD VEGETAL'
  };
  if (numericAreaMap[cleanA]) return numericAreaMap[cleanA];

  if (cleanA && !/^\d+$/.test(cleanA) && !cleanA.startsWith('CA3') && !cleanA.includes('CASMA')) {
    return cleanA;
  }

  // Detect from cargo
  if (/ELECTRIC|FRIGOR|MANTENIM|MECANIC|ELECTR[OÓ]N|PLANNER DE MANT/i.test(cleanC)) return 'MANTENIMIENTO';
  if (/CALIDAD|ASEGURAMIENTO|MICROBIOL|INSPECTOR DE ASEG/i.test(cleanC)) return 'CALIDAD';
  if (/BIENESTAR|RRHH|RECURSOS HUMANOS|RECLUTAMIENTO|ASISTENTA|PERSONAL|NOMINA/i.test(cleanC)) return 'RECURSOS HUMANOS';
  if (/LOGISTICA|ALMACEN|COMPRAS|INVENTARIO|DESPACHO/i.test(cleanC)) return 'LOGISTICA';
  if (/CAMPO|RIEGO|FITOSANITARIO|COSECHA|AGRONOM|SANIDAD/i.test(cleanC)) return 'CAMPO';
  if (/SEGURIDAD|PATRIMONIAL|SST|PREVENCION/i.test(cleanC)) return 'SEGURIDAD Y SALUD';
  if (/CONTAB|FINANZ|TESORER|COSTOS/i.test(cleanC)) return 'FINANZAS';
  if (/SISTEMA|TI|INFORMATICA/i.test(cleanC)) return 'SISTEMAS';
  if (/PRODUCCI[OÓ]N|PROCESO|ENVASADO|SELECCI[OÓ]N|CORTADOR|OPERARI|ESTIVADOR|DESPENDUC/i.test(cleanC)) return 'PRODUCCION';
  if (/PLANTA/i.test(cleanC)) return 'PLANTA';

  return cleanA || 'OPERACIONES';
}

// Maps
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
    const fIngreso = excelDateToYMD(r[11]) || '2026-01-01';
    const fCese = excelDateToYMD(r[12]) || null;
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
  const fGen = excelDateToYMD(fechaGenRaw);
  if (!fGen || !/^\d{4}-\d{2}-\d{2}$/.test(fGen)) return;

  const fComp = excelDateToYMD(fechaCompRaw);
  let estado = 'PENDIENTE';
  const estLower = cleanStr(estadoRaw).toLowerCase();
  if (estLower.includes('compensa') || estLower.includes('gozado') || estLower.includes('si') || estLower.includes('pagado') || fComp) {
    estado = 'COMPENSADO';
  } else if (estLower.includes('anulad')) {
    estado = 'ANULADO';
  }

  const key = `${emp.id}_${fGen}_${fComp || (estado === 'COMPENSADO' ? 'GOZADO' : 'PENDIENTE')}`;
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
  }
}

// 2. CONSOLIDADO_TRABAJADORES_LIMPIO.xlsx
const fConsolidado = path.join(downloadsDir, 'CONSOLIDADO_TRABAJADORES_LIMPIO.xlsx');
if (fs.existsSync(fConsolidado)) {
  const wb = XLSX.readFile(fConsolidado);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Procesando CONSOLIDADO_TRABAJADORES_LIMPIO.xlsx (${rows.length} filas)...`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const emp = registerOrGetEmployee(r[0], r[0], r[1], 'PRODUCCION', r[2]);
    addCompensation(emp, r[3], r[5], r[4], 'Consolidado');
  }
}

// 3. plantilla_carga_masiva_compensaciones.xlsx (824 rows)
const fPlantilla = path.join(downloadsDir, 'plantilla_carga_masiva_compensaciones.xlsx');
if (fs.existsSync(fPlantilla)) {
  const wb = XLSX.readFile(fPlantilla);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Procesando plantilla_carga_masiva_compensaciones.xlsx (${rows.length} filas)...`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const emp = registerOrGetEmployee(r[0], r[0], r[1], 'PLANTA', 'OPERARIO');
    addCompensation(emp, r[2], r[4], r[3], 'Carga Masiva');
  }
}

// 4. Reporte_Compensaciones_2026-09-27.xlsx (736 rows)
const fReporte = path.join(downloadsDir, 'Reporte_Compensaciones_2026-09-27.xlsx');
if (fs.existsSync(fReporte)) {
  const wb = XLSX.readFile(fReporte);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Procesando Reporte_Compensaciones_2026-09-27.xlsx (${rows.length} filas)...`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    const emp = registerOrGetEmployee(r[1], r[2], r[3], r[4], r[5]);
    addCompensation(emp, r[6], r[9], r[7], r[8] || 'Reporte Global');
  }
}

// 5. COMPENSACIONES_AUTOMATIZADO_v2.xlsx (59 sheets)
const fAuto = path.join(downloadsDir, 'COMPENSACIONES_AUTOMATIZADO_v2.xlsx');
if (fs.existsSync(fAuto)) {
  const wb = XLSX.readFile(fAuto);
  console.log(`Procesando COMPENSACIONES_AUTOMATIZADO_v2.xlsx (${wb.SheetNames.length} hojas)...`);
  for (const sName of wb.SheetNames) {
    if (['DIAS', 'LISTA FERIADOS', 'MARCAS', 'Detalle '].includes(sName)) continue;
    if (sName === 'MARCAS_COMPENSABLES') {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1 });
      for (let i = 3; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[0]) continue;
        const emp = registerOrGetEmployee(r[0], r[0], r[1], 'PRODUCCION', r[2]);
        addCompensation(emp, r[4], r[7], r[6], r[8] || 'Marca compensable');
      }
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1 });
    if (!rows || rows.length < 2) continue;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const emp = registerOrGetEmployee(r[0], r[0], r[1] || sName, 'PRODUCCION', r[2]);
      const fGen = r[6] || r[3] || r[4];
      const fComp = r[9] || r[5] || r[7];
      const gozado = r[8] || r[4] || r[6];
      addCompensation(emp, fGen, fComp, gozado, r[10] || r[11] || 'Planilla');
    }
  }
}

// 6. COMPENSACIONES_POR_PAGAR_LIMPIO.xlsx (58 sheets)
const fLimpio = path.join(downloadsDir, 'COMPENSACIONES_POR_PAGAR_LIMPIO.xlsx');
if (fs.existsSync(fLimpio)) {
  const wb = XLSX.readFile(fLimpio);
  console.log(`Procesando COMPENSACIONES_POR_PAGAR_LIMPIO.xlsx (${wb.SheetNames.length} hojas)...`);
  for (const sName of wb.SheetNames) {
    if (['DIAS', 'LISTA FERIADOS', 'MARCAS', 'C.NISIRA', 'TAREO', 'Detalle ', 'Hoja1'].includes(sName)) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1 });
    if (!rows || rows.length < 2) continue;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const emp = registerOrGetEmployee(r[0], r[0], r[1] || sName, 'PRODUCCION', r[2]);
      const fGen = r[6] || r[3] || r[4];
      const fComp = r[9] || r[5] || r[7];
      const gozado = r[8] || r[4] || r[6];
      addCompensation(emp, fGen, fComp, gozado, r[10] || r[11] || 'Planilla limpio');
    }
  }
}

// 7. DIAS DE COMPENSACION.xlsx
const fDias = path.join(downloadsDir, 'DIAS DE COMPENSACION.xlsx');
if (fs.existsSync(fDias)) {
  const wb = XLSX.readFile(fDias);
  console.log(`Procesando DIAS DE COMPENSACION.xlsx...`);
  if (wb.Sheets['BD']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['BD'], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      registerOrGetEmployee(r[2], r[0], r[1], r[5], r[6]);
    }
  }
  if (wb.Sheets['DIAS POR COMPENSAR']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['DIAS POR COMPENSAR'], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const emp = registerOrGetEmployee(r[0], r[0], r[1], 'PLANTA', r[2]);
      addCompensation(emp, r[6], null, 'PENDIENTE', 'Día por compensar');
    }
  }
}

// 8. DIAS PENDIENTE POR COMPENSAR MTTO.xlsx
const fMtto = path.join(downloadsDir, 'DIAS PENDIENTE POR COMPENSAR MTTO.xlsx');
if (fs.existsSync(fMtto)) {
  const wb = XLSX.readFile(fMtto);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Procesando DIAS PENDIENTE POR COMPENSAR MTTO.xlsx (${rows.length} filas)...`);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const emp = registerOrGetEmployee(r[0], r[0], r[1], 'MANTENIMIENTO', 'TECNICO');
    addCompensation(emp, r[2], r[4], r[3], 'Pendiente Mtto');
  }
}

// 9. DETALLE DE DIAS COMPENSACION Y POR COMPENSAR MATTT.xlsx
const fMattt = path.join(downloadsDir, 'DETALLE DE DIAS COMPENSACION Y POR COMPENSAR MATTT.xlsx');
if (fs.existsSync(fMattt)) {
  const wb = XLSX.readFile(fMattt);
  console.log(`Procesando DETALLE DE DIAS COMPENSACION Y POR COMPENSAR MATTT.xlsx...`);
  if (wb.Sheets['resumen']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['resumen'], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const emp = registerOrGetEmployee(r[2], r[0], r[1], 'MANTENIMIENTO', r[5]);
      if (emp && r[10]) {
        addCompensation(emp, r[10], r[11] || r[10], 'COMPENSADO', 'Resumen Mattt');
      }
    }
  }
  if (wb.Sheets['dias compensados']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['dias compensados'], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const emp = registerOrGetEmployee(r[0], r[0], r[1], 'MANTENIMIENTO', 'TECNICO');
      if (emp && r[7]) {
        addCompensation(emp, r[7], r[7], 'COMPENSADO', 'Compensado Mattt');
      }
    }
  }
}

// 10. compensaciones Edwin.xlsx
const fEdwin = path.join(downloadsDir, 'compensaciones Edwin.xlsx');
if (fs.existsSync(fEdwin)) {
  const wb = XLSX.readFile(fEdwin);
  console.log(`Procesando compensaciones Edwin.xlsx...`);
  if (wb.Sheets['Hoja2']) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Hoja2'], { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const emp = registerOrGetEmployee(r[2], r[0], r[1], r[7], r[5]);
      if (emp && r[13]) {
        addCompensation(emp, r[13], null, 'PENDIENTE', 'Edwin Compensación');
      }
    }
  }
}

console.log(`\n=== CONSOLIDACIÓN COMPLETA ===`);
console.log(`Total Empleados: ${employeeMap.size}`);
console.log(`Total Compensaciones: ${compMap.size}`);

const finalEmployees = Array.from(employeeMap.values());
const finalCompensations = Array.from(compMap.values());

// Generate seedData.ts
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
console.log(`✅ Archivo seedData.ts generado exitosamente en ${targetSeedPath} (${(fs.statSync(targetSeedPath).size / 1024).toFixed(1)} KB)`);
