const fs = require('fs');
const path = require('path');

const erpPath = 'c:\\apps-flavio\\ERP_RRHH';
if (fs.existsSync(erpPath)) {
  console.log('ERP_RRHH files:', fs.readdirSync(erpPath).filter(f => !f.startsWith('.')));
  const srcStorage = path.join(erpPath, 'src', 'storage');
  if (fs.existsSync(srcStorage)) {
    console.log('ERP_RRHH storage files:', fs.readdirSync(srcStorage));
  }
}



// 2. plantilla_carga_masiva_compensaciones.xlsx
const fPlantilla = path.join(downloadsDir, 'plantilla_carga_masiva_compensaciones.xlsx');
if (fs.existsSync(fPlantilla)) {
  const wb = XLSX.readFile(fPlantilla);
  const s = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  console.log(`\n=== plantilla_carga_masiva_compensaciones.xlsx (${s.length} rows) ===`);
  for (let i = 0; i < Math.min(5, s.length); i++) console.log(`  row ${i}:`, s[i]);
}

// 3. DIAS DE COMPENSACION.xlsx
const fDiasComp = path.join(downloadsDir, 'DIAS DE COMPENSACION.xlsx');
if (fs.existsSync(fDiasComp)) {
  const wb = XLSX.readFile(fDiasComp);
  console.log('\n=== DIAS DE COMPENSACION.xlsx ===');
  for (const sn of wb.SheetNames) {
    const s = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
    console.log(`Sheet "${sn}" (${s.length} rows):`);
    for (let i = 0; i < Math.min(3, s.length); i++) console.log(`  row ${i}:`, s[i]);
  }
}



