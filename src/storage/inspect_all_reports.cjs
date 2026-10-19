const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

const files = [
  'Reporte_Compensaciones_2026-09-27.xlsx',
  'Reporte_Compensaciones_2026-09-26.xlsx',
  'backup_sistema_compensaciones_2026-09-24 (1).json',
  'backup_sistema_compensaciones_2026-09-24.json',
  'COMPENSACIONES_POR_PAGAR_LIMPIO.xlsx',
  'DETALLE DE DIAS COMPENSACION Y POR COMPENSAR MATTT.xlsx',
  'dias compensacion manteniemineto.xlsx'
];

for (const f of files) {
  const full = path.join(downloadsDir, f);
  if (!fs.existsSync(full)) continue;
  console.log(`\n=== Archivo: ${f} ===`);
  if (f.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(full, 'utf8'));
    console.log('Employees in backup:', (data.employees || data.empleados || []).length);
    console.log('Compensations in backup:', (data.compensations || data.compensaciones || []).length);
    if (data.compensations && data.compensations.length > 0) {
      console.log('Muestra comp:', data.compensations[0]);
    }
  } else {
    const wb = XLSX.readFile(full);
    console.log('Hojas:', wb.SheetNames);
    for (const sheetName of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
      console.log(`  Hoja "${sheetName}": ${rows.length} filas`);
      if (rows.length > 0) console.log('    Muestra:', rows[0]);
    }
  }
}
