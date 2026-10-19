const XLSX = require('xlsx');
const file = 'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx';
const wb = XLSX.readFile(file);

const exclude = ['DIAS', 'LISTA FERIADOS', 'MARCAS', 'MARCAS_COMPENSABLES', 'Detalle '];

for (const sn of wb.SheetNames) {
  if (exclude.includes(sn)) continue;
  const sheet = wb.Sheets[sn];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== SHEET: [${sn}] (${rows.length} rows) ===`);
  if (rows.length > 0) console.log('  Header:', JSON.stringify(rows[0]));
  if (rows.length > 1) console.log('  Row 1 :', JSON.stringify(rows[1]));
  if (rows.length > 2) console.log('  Row 2 :', JSON.stringify(rows[2]));
}
