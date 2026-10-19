const XLSX = require('xlsx');

const reportPath = 'C:\\Users\\Usuario\\Downloads\\Reporte_Compensaciones_2026-09-27.xlsx';
const wb = XLSX.readFile(reportPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

const workerMap = {};
rows.forEach(r => {
  const t = r.Trabajador || r['Apellidos y Nombres'];
  const dni = r['DNI / Documento'] || r.DNI;
  const area = r['Área'] || r.Area;
  const cargo = r.Cargo;
  const estado = r.Estado;
  if (!workerMap[t]) {
    workerMap[t] = { dni, area, cargo, count: 0, estados: {} };
  }
  workerMap[t].count++;
  workerMap[t].estados[estado] = (workerMap[t].estados[estado] || 0) + 1;
});

console.log('Listado de trabajadores y conteo de compensaciones en el reporte:');
console.table(workerMap);
