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

// Helper to determine clean area
function normalizeArea(rawArea, cargo = '') {
  const cleanA = cleanStr(rawArea).toUpperCase();
  const cleanC = cleanStr(cargo).toUpperCase();

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


// Map of DNI -> Employee
const employeeMap = new Map();
// Map of Name -> DNI
const nameToDniMap = new Map();
// Map of Code -> DNI
const codeToDniMap = new Map();

// Map of unique compensations: key -> record
const compMap = new Map();

// 1. Load Master Employees from DATA PERSONAL AL 08.09.2026.xlsx
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
    const cargo = cleanStr(r[75]) || 'TRABAJADOR';
    let area = cleanStr(r[77]) || cleanStr(r[96]) || 'OPERACIONES';
    if (!area || area.includes('CASMA')) area = 'PLANTA';

    const apellidos = `${apPat} ${apMat}`.trim() || (apeNom.includes(',') ? apeNom.split(',')[0].trim() : apeNom);
    const nombres = nom || (apeNom.includes(',') ? apeNom.split(',')[1].trim() : '');

    const emp = {
      id: dni,
      codigo: codigo,
      documento: dni,
      nombres: nombres,
      apellidos: apellidos,
      area: normalizeArea(area, cargo),
      cargo: cargo,
      estado: r[12] && cleanStr(r[12]).length > 0 ? 'cesado' : 'activo'
    };

    employeeMap.set(dni, emp);
    codeToDniMap.set(codigo, dni);
    if (apeNom) nameToDniMap.set(apeNom.toUpperCase(), dni);
    nameToDniMap.set(`${apellidos} ${nombres}`.trim().toUpperCase(), dni);
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
    // Try partial matching
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
    emp = {
      id: targetDni,
      codigo: cleanCode || targetDni,
      documento: targetDni.startsWith('EMP_') ? '' : targetDni,
      nombres: nombres || cleanName,
      apellidos: apellidos || cleanName,
      area: normArea,
      cargo: cleanStr(cargo) || 'TRABAJADOR',
      estado: 'activo'
    };
    employeeMap.set(targetDni, emp);
  } else {
    if (normArea && normArea !== 'OPERACIONES' && (emp.area === 'OPERACIONES' || emp.area === 'GENERAL' || !emp.area)) {
      emp.area = normArea;
    }
    if (cleanStr(cargo) && (emp.cargo === 'TRABAJADOR' || !emp.cargo)) {
      emp.cargo = cleanStr(cargo);
    }
  }

  if (cleanName) nameToDniMap.set(cleanName, targetDni);
  if (cleanCode) codeToDniMap.set(cleanCode, targetDni);
  return emp;
}


function addCompensation(employeeDni, fechaGenRaw, fechaCompRaw, estadoRaw, motivoRaw, horas = 8) {
  const fGen = excelDateToYMD(fechaGenRaw);
  if (!fGen || !/^\d{4}-\d{2}-\d{2}$/.test(fGen)) return;

  const fComp = excelDateToYMD(fechaCompRaw);
  let estado = 'pendiente';
  const estLower = cleanStr(estadoRaw).toLowerCase();
  if (estLower.includes('compensa') || estLower.includes('gozado') || estLower.includes('si') || estLower.includes('pagado') || fComp) {
    estado = 'compensado';
  } else if (estLower.includes('vencid')) {
    estado = 'vencido';
  }

  const key = `${employeeDni}_${fGen}_${fComp || (estado === 'compensado' ? 'GOZADO' : 'PENDIENTE')}`;
  if (!compMap.has(key)) {
    compMap.set(key, {
      id: `comp_${employeeDni}_${fGen}_${Math.random().toString(36).substr(2, 6)}`,
      employeeId: employeeDni,
      fechaGenerada: fGen,
      tipo: 'feriado',
      horasGeneradas: horas,
      estado: estado,
      fechaCompensacion: fComp || (estado === 'compensado' ? fGen : undefined),
      observacion: cleanStr(motivoRaw) || (estado === 'compensado' ? 'Compensación gozada' : 'Día de descanso/feriado pendiente'),
      createdAt: `${fGen}T08:00:00.000Z`,
      updatedAt: `${fComp || fGen}T18:00:00.000Z`
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
    const codeOrDni = cleanStr(r[0]);
    const nombre = cleanStr(r[1]);
    const cargo = cleanStr(r[2]);
    const emp = registerOrGetEmployee(codeOrDni, codeOrDni, nombre, 'PRODUCCION', cargo);
    if (emp) {
      addCompensation(emp.id, r[3], r[5], r[4], 'Consolidado Trabajadores');
    }
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
    const dni = cleanStr(r[0]);
    const nombre = cleanStr(r[1]);
    const emp = registerOrGetEmployee(dni, dni, nombre, 'PLANTA', 'OPERARIO');
    if (emp) {
      addCompensation(emp.id, r[2], r[4], r[3], 'Carga Masiva');
    }
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
    const dni = cleanStr(r[1]);
    const codigo = cleanStr(r[2]);
    const nombre = cleanStr(r[3]);
    const area = cleanStr(r[4]);
    const cargo = cleanStr(r[5]);
    const emp = registerOrGetEmployee(dni, codigo, nombre, area, cargo);
    if (emp) {
      addCompensation(emp.id, r[6], r[9], r[7], r[8] || 'Reporte Global');
    }
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
        const dni = cleanStr(r[0]);
        const nombre = cleanStr(r[1]);
        const cargoArea = cleanStr(r[2]);
        const emp = registerOrGetEmployee(dni, dni, nombre, 'PRODUCCION', cargoArea);
        if (emp) {
          addCompensation(emp.id, r[4], r[7], r[6], r[8] || 'Marca compensable');
        }
      }
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1 });
    if (!rows || rows.length < 2) continue;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const codeOrDni = cleanStr(r[0]);
      const nombre = cleanStr(r[1]) || sName;
      const cargo = cleanStr(r[2]);
      const emp = registerOrGetEmployee(codeOrDni, codeOrDni, nombre, 'PRODUCCION', cargo);
      if (emp) {
        const fGen = r[6] || r[3] || r[4];
        const fComp = r[9] || r[5] || r[7];
        const gozado = r[8] || r[4] || r[6];
        addCompensation(emp.id, fGen, fComp, gozado, r[10] || r[11] || 'Planilla individual');
      }
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
      const codeOrDni = cleanStr(r[0]);
      const nombre = cleanStr(r[1]) || sName;
      const cargo = cleanStr(r[2]);
      const emp = registerOrGetEmployee(codeOrDni, codeOrDni, nombre, 'PRODUCCION', cargo);
      if (emp) {
        const fGen = r[6] || r[3] || r[4];
        const fComp = r[9] || r[5] || r[7];
        const gozado = r[8] || r[4] || r[6];
        addCompensation(emp.id, fGen, fComp, gozado, r[10] || r[11] || 'Planilla limpio');
      }
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
      if (emp) {
        addCompensation(emp.id, r[6], null, 'PENDIENTE', 'Día por compensar');
      }
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
    if (emp) {
      addCompensation(emp.id, r[2], r[4], r[3], 'Pendiente Mtto');
    }
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
        addCompensation(emp.id, r[10], r[11] || r[10], 'COMPENSADO', 'Resumen Mattt');
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
        addCompensation(emp.id, r[7], r[7], 'COMPENSADO', 'Compensado Mattt');
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
        addCompensation(emp.id, r[13], null, 'PENDIENTE', 'Edwin Compensación');
      }
    }
  }
}


console.log(`\n=== RESULTADOS DE CONSOLIDACIÓN TOTAL ===`);
console.log(`Total Empleados en Padrón Maestro: ${employeeMap.size}`);
console.log(`Total Compensaciones únicas consolidadas: ${compMap.size}`);

let pendCount = 0;
let compCount = 0;
let vencCount = 0;
for (const c of compMap.values()) {
  if (c.estado === 'pendiente') pendCount++;
  else if (c.estado === 'compensado') compCount++;
  else if (c.estado === 'vencido') vencCount++;
}
console.log(`  -> Pendientes: ${pendCount}`);
console.log(`  -> Compensados: ${compCount}`);
console.log(`  -> Vencidos: ${vencCount}`);

const areaStats = {};
for (const c of compMap.values()) {
  const emp = employeeMap.get(c.employeeId);
  const area = emp?.area || 'DESCONOCIDO';
  areaStats[area] = (areaStats[area] || 0) + 1;
}
console.log('\nCompensaciones por Área:');
console.table(areaStats);
