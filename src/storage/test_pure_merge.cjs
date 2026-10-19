const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

function excelSerialToYMD(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return '';
    const y = String(d.y).padStart(4, '0');
    const m = String(d.m).padStart(2, '0');
    const day = String(d.d).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'pendiente' || str === '-' || str === 'null') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    const d = XLSX.SSF.parse_date_code(num);
    if (!d) return '';
    const y = String(d.y).padStart(4, '0');
    const m = String(d.m).padStart(2, '0');
    const day = String(d.d).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  // Try YYYYMM (e.g. 202412)
  if (/^\d{6}$/.test(str)) {
    const y = str.substring(0, 4);
    const m = str.substring(4, 6);
    return `${y}-${m}-01`;
  }
  return '';
}

const today = '2026-10-03';
let futureDates = 0;
const compMap = new Map();

// 1. Parse plantillas masivas
const plantillas = [
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones.xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (1).xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (2).xlsx'
];

for (const fp of plantillas) {
  if (!fs.existsSync(fp)) continue;
  const wb = XLSX.readFile(fp);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  for (const r of rows) {
    const dni = cleanStr(r['DNI']).replace(/\D/g, '');
    const name = cleanStr(r['Apellidos y Nombres']);
    const fGen = excelSerialToYMD(r['Fecha']);
    const fComp = excelSerialToYMD(r['Fecha Compensada']);
    const estado = cleanStr(r['ESTADO']).toUpperCase().includes('COMPENSADO') || fComp ? 'COMPENSADO' : 'PENDIENTE';
    if (!fGen) continue;
    if (fGen > today) {
      console.log('Future in plantilla:', fGen, name);
      futureDates++;
    }
    const key = `${dni}_${fGen}`;
    if (!compMap.has(key)) {
      compMap.set(key, { dni, name, fGen, fComp, estado, source: 'plantilla' });
    }
  }
}

// 2. Parse COMPENSACIONES_AUTOMATIZADO_v2.xlsx (all worker sheets)
const autoPath = 'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx';
if (fs.existsSync(autoPath)) {
  const wb = XLSX.readFile(autoPath);
  const exclude = ['DIAS', 'LISTA FERIADOS', 'MARCAS', 'MARCAS_COMPENSABLES', 'Detalle '];
  for (const sn of wb.SheetNames) {
    if (exclude.includes(sn)) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
    if (rows.length < 2) continue;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const dni = cleanStr(r[0]).replace(/\D/g, '');
      const name = cleanStr(r[1]) || sn;
      const fGen = excelSerialToYMD(r[6]);
      const fComp = excelSerialToYMD(r[9]);
      const gozado = cleanStr(r[8]).toUpperCase();
      const estado = (gozado === 'SI' || gozado.includes('COMPENSADO') || fComp) ? 'COMPENSADO' : 'PENDIENTE';
      if (!fGen) continue;
      if (fGen > today) {
        console.log('Future in v2:', fGen, sn);
        futureDates++;
      }
      const key = `${dni}_${fGen}`;
      if (!compMap.has(key)) {
        compMap.set(key, { dni, name, fGen, fComp, estado, source: `v2_${sn}` });
      }
    }
  }
}

console.log('Total unique authentic compensations:', compMap.size);
console.log('Future dates count (> 2026-10-03):', futureDates);

// Check VIERA CELI
const vieraComps = Array.from(compMap.values()).filter(c => c.name.includes('VIERA') || c.dni === '02881340');
console.log('\nVIERA CELI compensations count:', vieraComps.length);
console.log(JSON.stringify(vieraComps.slice(0, 5), null, 2));

// Summary of all workers
const summary = {};
for (const c of compMap.values()) {
  const n = c.name;
  if (!summary[n]) summary[n] = { total: 0, pendientes: 0, compensados: 0 };
  summary[n].total++;
  if (c.estado === 'PENDIENTE') summary[n].pendientes++;
  if (c.estado === 'COMPENSADO') summary[n].compensados++;
}

console.log('\nTotal workers with compensations:', Object.keys(summary).length);
console.table(summary);
