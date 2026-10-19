const fs = require('fs');
const XLSX = require('xlsx');

const files = [
  'C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL (1).xlsx',
  'C:\\Users\\Usuario\\Downloads\\compensaciones Edwin.xlsx',
  'C:\\Users\\Usuario\\Downloads\\DIAS DE COMPENSACION.xlsx',
  'C:\\Users\\Usuario\\Downloads\\DATOS COMPESACIONES --.xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (2).xlsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  console.log('=== FILE:', f, '===');
  const wb = XLSX.readFile(f);
  for (const sn of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sn]);
    console.log(`  Sheet [${sn}]: ${data.length} rows`);
    if (data.length > 0) {
      console.log('    Sample:', JSON.stringify(data.slice(0, 2)));
    }
  }
}
