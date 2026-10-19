const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

console.log('=== 1. Reporte_Compensaciones_2026-09-27.xlsx ===');
const fRep = path.join(downloadsDir, 'Reporte_Compensaciones_2026-09-27.xlsx');
if (fs.existsSync(fRep)) {
  const wb = XLSX.readFile(fRep);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  console.log(`Total filas en Reporte Sept 27: ${rows.length}`);
  const emps = new Set();
  const areas = new Set();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3]) emps.add(rows[i][3]);
    if (rows[i][4]) areas.add(rows[i][4]);
  }
  console.log(`Trabajadores únicos (${emps.size}):`, Array.from(emps));
  console.log(`Áreas:`, Array.from(areas));
}

console.log('\n=== 2. plantilla_carga_masiva_compensaciones (1).xlsx (Sept 28) ===');
const fP1 = path.join(downloadsDir, 'plantilla_carga_masiva_compensaciones (1).xlsx');
if (fs.existsSync(fP1)) {
  const wb = XLSX.readFile(fP1);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  console.log(`Total filas: ${rows.length}`);
  for (const r of rows) console.log('  ', r);
}

console.log('\n=== 3. plantilla_carga_masiva_compensaciones (2).xlsx (Sept 29) ===');
const fP2 = path.join(downloadsDir, 'plantilla_carga_masiva_compensaciones (2).xlsx');
if (fs.existsSync(fP2)) {
  const wb = XLSX.readFile(fP2);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  console.log(`Total filas: ${rows.length}`);
  for (const r of rows) console.log('  ', r);
}

console.log('\n=== 4. backup_sistema_compensaciones_2026-09-24 (1).json ===');
const fBk = path.join(downloadsDir, 'backup_sistema_compensaciones_2026-09-24 (1).json');
if (fs.existsSync(fBk)) {
  const data = JSON.parse(fs.readFileSync(fBk, 'utf8'));
  console.log(`Backup employees: ${data.employees?.length}, compensations: ${data.compensations?.length}`);
  if (data.compensations) {
    console.log('Compensations:', data.compensations);
  }
}
