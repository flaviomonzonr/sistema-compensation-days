const fs = require('fs');
const XLSX = require('xlsx');

const file1 = 'C:\\Users\\Usuario\\Downloads\\FERIADO Y DOMINGO - ARMANDO VALDEZ.xlsx';
const wb1 = XLSX.readFile(file1);
console.log('=== FILE: FERIADO Y DOMINGO - ARMANDO VALDEZ.xlsx ===');
for (const sn of wb1.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb1.Sheets[sn]);
  console.log(`Sheet: ${sn}, ${rows.length} rows`);
  if (rows.length > 0) {
    console.log('Sample:', JSON.stringify(rows.slice(0, 3), null, 2));
  }
}

const file2 = 'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx';
if (fs.existsSync(file2)) {
  const wb2 = XLSX.readFile(file2);
  console.log('\n=== FILE: COMPENSACIONES_AUTOMATIZADO_v2.xlsx ===');
  for (const sn of wb2.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb2.Sheets[sn]);
    console.log(`Sheet: ${sn}, ${rows.length} rows`);
    if (rows.length > 0) {
      console.log('Sample:', JSON.stringify(rows.slice(0, 3), null, 2));
    }
  }
}
