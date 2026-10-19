const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const files = [
  'C:\\Users\\Usuario\\Downloads\\FERIADO Y DOMINGO - ARMANDO VALDEZ.xlsx',
  'C:\\Users\\Usuario\\Downloads\\COMPENSACIONES_AUTOMATIZADO_v2.xlsx',
  'C:\\Users\\Usuario\\Downloads\\Semana_29-30 -FERIADO NOMINA.xlsx',
  'C:\\Users\\Usuario\\Downloads\\SEMANA 36\\PLANTA\\00.CARGA MASIVA DIAS FERIADO SEM 32--------.xlsx',
  'C:\\Users\\Usuario\\Downloads\\SEMANA 36\\PLANTA\\00.CARGA MASIVA IMPORTE BONO FERIADO SEM 32-------.xlsx',
  'C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL (1).xlsx',
  'C:\\Users\\Usuario\\Downloads\\HORAS POR COMPENSAR MANUEL.xlsx',
  'C:\\Users\\Usuario\\Downloads\\compensaciones Edwin.xlsx',
  'C:\\Users\\Usuario\\Downloads\\EXCEL ELVIS.xlsx',
  'C:\\Users\\Usuario\\Downloads\\EJEMPLO BONO DOMINGO.xlsx',
  'C:\\Users\\Usuario\\Downloads\\DIAS DE COMPENSACION.xlsx',
  'C:\\Users\\Usuario\\Downloads\\Reporte_Compensaciones_2026-09-27.xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones.xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (1).xlsx',
  'C:\\Users\\Usuario\\Downloads\\plantilla_carga_masiva_compensaciones (2).xlsx',
  'C:\\Users\\Usuario\\Downloads\\DATOS COMPESACIONES --.xlsx',
  'C:\\Users\\Usuario\\Downloads\\backup_sistema_compensaciones_2026-09-24 (1).json',
  'C:\\Users\\Usuario\\Downloads\\backup_sistema_compensaciones_2026-09-24.json'
];

for (const fp of files) {
  if (!fs.existsSync(fp)) {
    console.log('NOT FOUND:', fp);
    continue;
  }
  console.log('\n========================================');
  console.log('FILE:', path.basename(fp));
  if (fp.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    console.log('Compensations:', data.compensaciones?.length || data.compensations?.length, 'Employees:', data.empleados?.length || data.employees?.length);
    const comps = data.compensaciones || data.compensations || [];
    if (comps.length > 0) {
      console.log('Sample comp:', JSON.stringify(comps[0]));
    }
  } else {
    try {
      const wb = XLSX.readFile(fp);
      console.log('Sheets:', wb.SheetNames);
      for (const sn of wb.SheetNames) {
        const sheet = wb.Sheets[sn];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`  Sheet [${sn}]: ${data.length} rows`);
        if (data.length > 0) console.log('    Row 0:', JSON.stringify(data[0]));
        if (data.length > 1) console.log('    Row 1:', JSON.stringify(data[1]));
        if (data.length > 2) console.log('    Row 2:', JSON.stringify(data[2]));
      }
    } catch (e) {
      console.log('Error reading excel:', e.message);
    }
  }
}
