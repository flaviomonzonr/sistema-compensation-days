const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

console.log('=== INSPECCIONANDO BACKUPS Y PLANTILLAS DE COMPENSACIONES ===');

const backup1 = path.join(downloadsDir, 'backup_sistema_compensaciones_2026-09-24 (1).json');
if (fs.existsSync(backup1)) {
  try {
    const raw = fs.readFileSync(backup1, 'utf8');
    const data = JSON.parse(raw);
    console.log('\nBackup JSON:', backup1);
    console.log('Keys:', Object.keys(data));
    if (data.empleados) console.log('Empleados:', data.empleados.length);
    if (data.compensaciones) console.log('Compensaciones:', data.compensaciones.length);
    if (data.feriados) console.log('Feriados:', data.feriados.length);
  } catch (e) {
    console.log('Error backup1:', e.message);
  }
}

const p1 = path.join(downloadsDir, 'plantilla_carga_masiva_compensaciones (2).xlsx');
if (fs.existsSync(p1)) {
  try {
    const wb = XLSX.readFile(p1);
    console.log('\nPlantilla:', p1);
    console.log('Hojas:', wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`Filas: ${rows.length}`);
    if (rows.length > 0) console.log('Muestra primera fila:', rows[0]);
  } catch (e) {
    console.log('Error p1:', e.message);
  }
}

const rep1 = path.join(downloadsDir, 'Reporte_Compensaciones_2026-09-27.xlsx');
if (fs.existsSync(rep1)) {
  try {
    const wb = XLSX.readFile(rep1);
    console.log('\nReporte:', rep1);
    console.log('Hojas:', wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`Filas: ${rows.length}`);
    if (rows.length > 0) console.log('Muestra primera fila:', rows[0]);
  } catch (e) {
    console.log('Error rep1:', e.message);
  }
}
