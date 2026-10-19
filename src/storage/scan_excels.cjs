const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const baseDir = 'C:\\apps-flavio';

function findExcelFiles(dir, depth = 0) {
  if (depth > 3) return [];
  let res = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          res = res.concat(findExcelFiles(full, depth + 1));
        } else if (item.endsWith('.xlsx') || item.endsWith('.xls') || item.endsWith('.xlsm')) {
          res.push(full);
        }
      } catch (_) {}
    }
  } catch (_) {}
  return res;
}

const excelFiles = findExcelFiles(baseDir);
console.log(`Encontrados ${excelFiles.length} archivos Excel en ${baseDir}:`);

for (const ef of excelFiles) {
  try {
    const wb = XLSX.readFile(ef, { bookSheets: true });
    console.log(`\nArchivo: ${ef}`);
    console.log(`  Hojas: ${wb.SheetNames.join(', ')}`);
  } catch (err) {
    console.log(`  Error leyendo ${ef}: ${err.message}`);
  }
}
