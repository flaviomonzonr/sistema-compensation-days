const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Load Master Employees from DATA PERSONAL AL 08.09.2026.xlsx
const padronPath = 'C:\\Users\\Usuario\\Downloads\\DATA PERSONAL AL 08.09.2026.xlsx';
const padronWb = XLSX.readFile(padronPath);
const padronSheet = padronWb.Sheets[padronWb.SheetNames[0]];
const padronRaw = XLSX.utils.sheet_to_json(padronSheet);

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const y = String(d.y).padStart(4, '0');
      const m = String(d.m).padStart(2, '0');
      const day = String(d.d).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  const s = cleanStr(val);
  if (!s || s === '-' || s.toLowerCase() === 'pendiente') return null;
  
  // Try YYYYMM (e.g. 202412)
  if (/^\d{6}$/.test(s)) {
    const y = s.substring(0, 4);
    const m = s.substring(4, 6);
    return `${y}-${m}-01`;
  }

  // Try DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  return null;
}

function detectArea(cargo, planilla, areaStr) {
  const text = `${cargo} ${planilla} ${areaStr}`.toUpperCase();
  if (/MANTENIMIENTO|MECANIC|MECÁNIC|ELECTR|FRIGORISTA|TORNERO|SOLDADOR|TALLER/i.test(text)) return 'MANTENIMIENTO';
  if (/CALIDAD|ASEGURAMIENTO|INSPECTOR DE ASEG|LABORATORIO|MICROBIOL/i.test(text)) return 'CALIDAD';
  if (/LOGISTICA|LOGÍSTICA|ALMACEN|ALMACÉN|COMPRAS|DESPACHO/i.test(text)) return 'LOGISTICA';
  if (/SISTEMAS|INFORMATIC|INFORMÁTIC|TECNOLOGIA|SOFTWARE/i.test(text)) return 'SISTEMAS';
  if (/SEGURIDAD|PREVENCION|PREVENCIÓN|SSOMA|SALUD|MEDIC/i.test(text)) return 'SEGURIDAD Y SALUD';
  if (/BIENESTAR|RRHH|RECURSOS HUMANOS|PLANILLA|PERSONAL|ADMINIST/i.test(text)) return 'RECURSOS HUMANOS';
  if (/PRODUCCION|PRODUCCIÓN|EMPAQUE|PLANTA|SELECCION|OPERARIO|ENVASADO/i.test(text)) return 'PRODUCCION';
  if (/CAMPO|COSECHA|RIEGO|AGRÍCOLA|AGRICOLA|SANIDAD/i.test(text)) return 'CAMPO';
  return 'GENERAL';
}

const employeesMap = new Map(); // DNI or Code -> Employee
const employeesById = new Map();

for (const row of padronRaw) {
  const dni = cleanStr(row['Doc Ident.'] || row['DNI'] || row['Nro. Documento'] || row['Doc. Identidad']);
  const code = cleanStr(row['Codigo'] || row['Código'] || dni);
  const nombres = cleanStr(row['APELLIDOS Y NOMBRES'] || row['Nombres'] || row['Trabajador']);
  if (!dni && !code) continue;

  const key = dni || code;
  const cargo = cleanStr(row['Cargo'] || row['CARGO']);
  const planilla = cleanStr(row['Tipo Trab.'] || row['Planilla'] || row['TIPO TRABAJADOR']);
  const areaRaw = cleanStr(row['Area'] || row['Área'] || row['DEPARTAMENTO']);
  const area = detectArea(cargo, planilla, areaRaw);
  const fechaIngreso = parseExcelDate(row['Fecha Ingr.'] || row['Fecha Ingreso'] || row['FECHA INGRESO']) || '2026-01-01';
  const fechaCese = parseExcelDate(row['Fecha Cese'] || row['FECHA CESE']);
  const estadoStr = cleanStr(row['ESTADO TRABAJADOR'] || row['Estado'] || row['ESTADO']).toUpperCase();
  const estado = (estadoStr.includes('CESADO') || fechaCese) ? 'CESADO' : 'ACTIVO';

  const empId = `emp-${key.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const emp = {
    id: empId,
    codigo: code || dni,
    numeroDocumento: dni || code,
    tipoDocumento: 'DNI',
    nombreCompleto: nombres,
    cargo: cargo || 'OPERARIO',
    area: area,
    centroCosto: cleanStr(row['Sucursal'] || row['SUCURSAL'] || 'PLANTA SECHIN') || 'PLANTA SECHIN',
    fechaIngreso: fechaIngreso,
    fechaCese: fechaCese || null,
    estado: estado,
    tipoTrabajador: planilla.includes('OBRERO') ? 'OBRERO' : 'EMPLEADO',
    diasCompensacionDisponibles: 0,
    diasCompensacionUtilizados: 0
  };

  employeesMap.set(key, emp);
  if (dni) employeesMap.set(dni, emp);
  if (code) employeesMap.set(code, emp);
  employeesById.set(empId, emp);
}

console.log(`Loaded ${employeesById.size} master employees from padrón.`);

// Data collection for compensations
const compensationsMap = new Map(); // key = `${empId}_${fechaGenerada}` -> Compensacion

function addCompensation(dniOrCode, workerName, rawFechaGen, rawEstado, rawFechaComp, sourceNote, cargoHint) {
  const cleanDni = cleanStr(dniOrCode);
  const cleanName = cleanStr(workerName);
  const fechaGen = parseExcelDate(rawFechaGen);
  if (!fechaGen) return;

  let emp = employeesMap.get(cleanDni);
  if (!emp && cleanName) {
    // Try matching by name
    for (const e of employeesById.values()) {
      if (e.nombreCompleto.toUpperCase() === cleanName.toUpperCase()) {
        emp = e;
        break;
      }
    }
  }

  if (!emp) {
    // Create new employee entry
    const key = cleanDni || `unk-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const empId = `emp-${key.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const area = detectArea(cargoHint || '', '', '');
    emp = {
      id: empId,
      codigo: cleanDni || key,
      numeroDocumento: cleanDni || key,
      tipoDocumento: 'DNI',
      nombreCompleto: cleanName || cleanDni,
      cargo: cargoHint || 'EMPLEADO',
      area: area,
      centroCosto: 'PLANTA SECHIN',
      fechaIngreso: '2026-01-01',
      fechaCese: null,
      estado: 'ACTIVO',
      tipoTrabajador: 'EMPLEADO',
      diasCompensacionDisponibles: 0,
      diasCompensacionUtilizados: 0
    };
    employeesMap.set(key, emp);
    if (cleanDni) employeesMap.set(cleanDni, emp);
    employeesById.set(empId, emp);
  }

  const fechaComp = parseExcelDate(rawFechaComp);
  const estStr = cleanStr(rawEstado).toUpperCase();
  let estado = 'PENDIENTE';
  if (estStr.includes('COMPENSADO') || estStr === 'SI' || estStr === 'GOZADO' || fechaComp) {
    estado = 'COMPENSADO';
  } else if (estStr.includes('PROGRAMADO')) {
    estado = 'PROGRAMADO';
  } else if (estStr.includes('ANULADO')) {
    estado = 'ANULADO';
  }

  const compKey = `${emp.id}_${fechaGen}`;
  const existing = compensationsMap.get(compKey);

  // If already exists, upgrade if this one has more details (e.g. COMPENSADO with fechaComp)
  if (existing) {
    if (existing.estado === 'PENDIENTE' && estado === 'COMPENSADO') {
      existing.estado = 'COMPENSADO';
      existing.fechaCompensacion = fechaComp || existing.fechaCompensacion || fechaGen;
    }
    if (!existing.fechaCompensacion && fechaComp) {
      existing.fechaCompensacion = fechaComp;
    }
    return;
  }

  const compId = `comp-${emp.id}-${fechaGen.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
  const comp = {
    id: compId,
    empleadoId: emp.id,
    fechaGenerada: fechaGen,
    fechaCompensacion: estado === 'COMPENSADO' ? (fechaComp || fechaGen) : null,
    estado: estado,
    formaCompensacion: 'DESCANSO',
    observacion: sourceNote ? cleanStr(sourceNote) : 'Día de descanso laborado compensable',
    motivoAnulacion: null,
    createdAt: `${fechaGen}T08:00:00.000Z`,
    updatedAt: new Date().toISOString()
  };

  compensationsMap.set(compKey, comp);
}

// 2. Parse COMPENSACIONES_AUTOMATIZADO_v2.xlsx (all worker sheets)
const v2Path = 'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx';
if (fs.existsSync(v2Path)) {
  const v2Wb = XLSX.readFile(v2Path);
  const excludeSheets = ['DIAS', 'LISTA FERIADOS', 'MARCAS', 'MARCAS_COMPENSABLES', 'Detalle '];
  for (const sn of v2Wb.SheetNames) {
    if (excludeSheets.includes(sn)) continue;
    const rows = XLSX.utils.sheet_to_json(v2Wb.Sheets[sn]);
    for (const r of rows) {
      const dni = r['Código'] || r['Codigo'] || r['DNI'] || r['Doc Ident.'];
      const name = r['Apellidos y Nombres'] || r['APELLIDOS Y NOMBRES'] || sn;
      const cargo = r['Cargo'] || r['CARGO'];
      const fechaGen = r['Fecha'] || r['FECHA'];
      const gozado = r['GOZADO'] || r['Gozado'] || r['Compensado'] || r['ESTADO'];
      const fechaComp = r['MES GOZADO'] || r['Mes Gozado'] || r['Fecha Compensada'];
      addCompensation(dni, name, fechaGen, gozado, fechaComp, `Compensación v2 (${sn})`, cargo);
    }
  }
}

// 3. Parse FERIADO Y DOMINGO - ARMANDO VALDEZ.xlsx
const valdezPath = 'C:\\Users\\Usuario\\Downloads\\FERIADO Y DOMINGO - ARMANDO VALDEZ.xlsx';
if (fs.existsSync(valdezPath)) {
  const valdezWb = XLSX.readFile(valdezPath);
  for (const sn of valdezWb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(valdezWb.Sheets[sn]);
    for (const r of rows) {
      const dni = r['Código'] || r['Codigo'] || r['DNI'];
      const name = r['Apellidos y Nombres'] || sn;
      const cargo = r['Cargo'];
      const fechaGen = r['Fecha'];
      const gozado = r['GOZADO'] || r['Compensado'];
      const fechaComp = r['MES GOZADO'] || r['Fecha Compensada'];
      addCompensation(dni, name, fechaGen, gozado, fechaComp, `Valdez (${sn})`, cargo);
    }
  }
}

// 4. Parse Reporte_Compensaciones_2026-09-27.xlsx (Mantenimiento official export)
const repPath = 'C:\\Users\\Usuario\\Downloads\\Reporte_Compensaciones_2026-09-27.xlsx';
if (fs.existsSync(repPath)) {
  const repWb = XLSX.readFile(repPath);
  const rows = XLSX.utils.sheet_to_json(repWb.Sheets[repWb.SheetNames[0]]);
  for (const r of rows) {
    const dni = r['DNI / Documento'] || r['Código'];
    const name = r['Trabajador'];
    const cargo = r['Cargo'];
    const fechaGen = r['Día Trabajado'];
    const estado = r['Estado'];
    const fechaComp = r['Fecha Compensación'];
    const obs = r['Observación'];
    addCompensation(dni, name, fechaGen, estado, fechaComp, obs, cargo);
  }
}

// 5. Parse plantilla_carga_masiva_compensaciones.xlsx
const p1Path = 'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones.xlsx';
if (fs.existsSync(p1Path)) {
  const p1Wb = XLSX.readFile(p1Path);
  const rows = XLSX.utils.sheet_to_json(p1Wb.Sheets[p1Wb.SheetNames[0]]);
  for (const r of rows) {
    addCompensation(r['DNI'], r['Apellidos y Nombres'], r['Fecha'], r['ESTADO'], r['Fecha Compensada'], 'Plantilla masiva');
  }
}

// 6. Parse plantilla_carga_masiva_compensaciones (1).xlsx
const p2Path = 'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (1).xlsx';
if (fs.existsSync(p2Path)) {
  const p2Wb = XLSX.readFile(p2Path);
  const rows = XLSX.utils.sheet_to_json(p2Wb.Sheets[p2Wb.SheetNames[0]]);
  for (const r of rows) {
    addCompensation(r['DNI'], r['Apellidos y Nombres'], r['Fecha'], r['ESTADO'], r['Fecha Compensada'], 'Plantilla masiva (1)');
  }
}

// 7. Parse plantilla_carga_masiva_compensaciones (2).xlsx
const p3Path = 'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (2).xlsx';
if (fs.existsSync(p3Path)) {
  const p3Wb = XLSX.readFile(p3Path);
  const rows = XLSX.utils.sheet_to_json(p3Wb.Sheets[p3Wb.SheetNames[0]]);
  for (const r of rows) {
    addCompensation(r['DNI'], r['Apellidos y Nombres'], r['Fecha'], r['ESTADO'], r['Fecha Compensada'], 'Plantilla masiva (2)');
  }
}

// 8. Parse DATOS COMPESACIONES --.xlsx
const datosPath = 'C:\\Users\\Usuario\\Downloads\\DATOS COMPESACIONES --.xlsx';
if (fs.existsSync(datosPath)) {
  const dWb = XLSX.readFile(datosPath);
  const rows = XLSX.utils.sheet_to_json(dWb.Sheets[dWb.SheetNames[0]]);
  for (const r of rows) {
    addCompensation(r['DNI'], r['Apellidos y Nombres'], r['Fecha'], r['Compensado'], r['Fecha Compensada'], 'Datos compensaciones');
  }
}

// 9. Parse DIAS DE COMPENSACION.xlsx (DIAS POR COMPENSAR)
const diasCompPath = 'C:\\Users\\Usuario\\Downloads\\DIAS DE COMPENSACION.xlsx';
if (fs.existsSync(diasCompPath)) {
  const dWb = XLSX.readFile(diasCompPath);
  if (dWb.Sheets['DIAS POR COMPENSAR']) {
    const rows = XLSX.utils.sheet_to_json(dWb.Sheets['DIAS POR COMPENSAR']);
    for (const r of rows) {
      addCompensation(r['Código'] || r['Codigo'], r['Apellidos y Nombres'], r['Fecha'], 'PENDIENTE', null, 'Días por compensar', r['Cargo']);
    }
  }
}

// 10. Parse HORAS POR COMPENSAR MANUEL (1).xlsx and HORAS POR COMPENSAR MANUEL.xlsx
for (const mFile of ['C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL (1).xlsx', 'C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL.xlsx']) {
  if (fs.existsSync(mFile)) {
    const mWb = XLSX.readFile(mFile);
    for (const sn of mWb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(mWb.Sheets[sn]);
      for (const r of rows) {
        const dni = r['Código'] || r['Codigo'] || '72606095';
        const name = r['Apellidos y Nombres'] || 'RENGIFO CONTRERAS, MANUEL ANTHONY';
        const fecha = r['Fecha'] || r['FECHA'];
        addCompensation(dni, name, fecha, 'PENDIENTE', null, 'Horas por compensar Manuel', r['Cargo'] || 'AUXILIAR DE BIENESTAR SOCIAL');
      }
    }
  }
}

// 11. Parse compensaciones Edwin.xlsx
const edwinPath = 'C:\\Users\\Usuario\\Downloads\\compensaciones Edwin.xlsx';
if (fs.existsSync(edwinPath)) {
  const eWb = XLSX.readFile(edwinPath);
  if (eWb.Sheets['Hoja2']) {
    const rows = XLSX.utils.sheet_to_json(eWb.Sheets['Hoja2']);
    for (const r of rows) {
      addCompensation(r['Código'] || r['Nro. Documento'] || '71779700', r['Apellidos y Nombres'] || 'CCOYLLO TERRONES, EDWIN FARIT', r['Fecha'], 'PENDIENTE', null, 'Compensaciones Edwin', r['Cargo']);
    }
  }
}

// 12. Parse JSON backups
for (const bFile of ['C:\\Users\\Usuario\\Downloads\\backup_sistema_compensaciones_2026-09-24 (1).json', 'C:\\Users\\Usuario\\Downloads\\backup_sistema_compensaciones_2026-09-24.json']) {
  if (fs.existsSync(bFile)) {
    const bData = JSON.parse(fs.readFileSync(bFile, 'utf8'));
    const comps = bData.compensaciones || bData.compensations || [];
    const emps = bData.empleados || bData.employees || [];
    const bEmpMap = new Map();
    emps.forEach(e => bEmpMap.set(e.id, e));
    for (const c of comps) {
      const bEmp = bEmpMap.get(c.empleadoId);
      if (bEmp) {
        addCompensation(bEmp.numeroDocumento || bEmp.codigo, bEmp.nombreCompleto, c.fechaGenerada, c.estado, c.fechaCompensacion, c.observacion, bEmp.cargo);
      }
    }
  }
}

// Calculate summary stats per employee
const finalEmployees = Array.from(employeesById.values());
const finalCompensations = Array.from(compensationsMap.values());

const empCompStats = new Map();
for (const c of finalCompensations) {
  if (!empCompStats.has(c.empleadoId)) {
    empCompStats.set(c.empleadoId, { total: 0, pendientes: 0, compensados: 0, programados: 0 });
  }
  const s = empCompStats.get(c.empleadoId);
  s.total++;
  if (c.estado === 'PENDIENTE') s.pendientes++;
  if (c.estado === 'COMPENSADO') s.compensados++;
  if (c.estado === 'PROGRAMADO') s.programados++;
}

for (const emp of finalEmployees) {
  const s = empCompStats.get(emp.id) || { pendientes: 0, compensados: 0 };
  emp.diasCompensacionDisponibles = s.pendientes;
  emp.diasCompensacionUtilizados = s.compensados;
}

console.log('\n======================================================');
console.log(`TOTAL RECOVERED EMPLOYEES: ${finalEmployees.length}`);
console.log(`TOTAL EMPLOYEES WITH COMPENSATIONS: ${empCompStats.size}`);
console.log(`TOTAL AUTHENTIC COMPENSATIONS: ${finalCompensations.length}`);
console.log('======================================================\n');

// Breakdown by area
const areaStats = {};
for (const emp of finalEmployees) {
  const s = empCompStats.get(emp.id);
  if (s && s.total > 0) {
    if (!areaStats[emp.area]) areaStats[emp.area] = { workers: 0, records: 0, pendientes: 0, compensados: 0 };
    areaStats[emp.area].workers++;
    areaStats[emp.area].records += s.total;
    areaStats[emp.area].pendientes += s.pendientes;
    areaStats[emp.area].compensados += s.compensados;
  }
}

console.log('BREAKDOWN BY AREA:');
console.table(areaStats);

// Print all workers with compensations
console.log('\nLIST OF WORKERS WITH COMPENSATIONS:');
const workerList = [];
for (const [empId, s] of empCompStats.entries()) {
  const emp = employeesById.get(empId);
  workerList.push({
    DNI: emp.numeroDocumento,
    Nombre: emp.nombreCompleto,
    Area: emp.area,
    Cargo: emp.cargo,
    Pendientes: s.pendientes,
    Compensados: s.compensados,
    Total: s.total
  });
}

workerList.sort((a,b) => b.Total - a.Total);
console.table(workerList);
