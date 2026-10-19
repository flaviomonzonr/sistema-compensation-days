const XLSX = require('xlsx');

const reportPath = 'C:\\Users\\Usuario\\Downloads\\Reporte_Compensaciones_2026-09-27.xlsx';
const wb = XLSX.readFile(reportPath, { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });

console.log('Muestra de 10 filas de fechas en el reporte:');
rows.slice(0, 10).forEach((r, i) => {
  console.log(`${i + 1}. Trabajador: ${r.Trabajador} | Dia Trabajado: "${r['Día Trabajado']}" | Fecha Comp: "${r['Fecha Compensación']}" | Estado: ${r.Estado}`);
});
