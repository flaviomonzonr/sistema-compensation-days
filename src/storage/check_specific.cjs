const fs = require('fs');
const XLSX = require('xlsx');

const files = [
  'C:\\Users\\Usuario\\Downloads\\FERIADO Y DOMINGO - ARMANDO VALDEZ.xlsx',
  'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx',
  'C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL (1).xlsx',
  'C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL.xlsx',
  'C:\\Users\\Usuario\\Downloads\\Semana_29-30 -FERIADO NOMINA.xlsx',
  'C:\\Users\\Usuario\\Downloads\\SEMANA 36\\PLANTA\\00.CARGA MASIVA DIAS FERIADO SEM 32--------.xlsx',
  'C:\\Users\\Usuario\\Downloads\\SEMANA 36\\PLANTA\\00.CARGA MASIVA IMPORTE BONO FERIADO SEM 32-------.xlsx'
];

for (const fp of files) {
  if (!fs.existsSync(fp)) continue;
  console.log('====================================');
  console.log('FILE:', fp);
  const wb = XLSX.readFile(fp);
  for (const sn of wb.SheetNames) {
    const sheet = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Sheet: "${sn}" (${data.length} rows)`);
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`  [${i}]:`, JSON.stringify(data[i]));
    }
  }
}
