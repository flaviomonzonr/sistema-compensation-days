const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const searchDirs = [
  'C:\\Users\\Usuario\\Downloads',
  'C:\\Users\\Usuario\\Documents',
  'C:\\Users\\Usuario\\Desktop',
  'C:\\apps-flavio'
];

function findFiles(dir, maxDepth = 4, currentDepth = 0) {
  let results = [];
  if (currentDepth > maxDepth) return results;
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (['node_modules', '.git', 'dist', '.gemini', 'Cache', 'Code Cache'].includes(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      try {
        if (item.isDirectory()) {
          results = results.concat(findFiles(fullPath, maxDepth, currentDepth + 1));
        } else {
          const lower = item.name.toLowerCase();
          if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            results.push({ name: item.name, path: fullPath, size: fs.statSync(fullPath).size });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

let allFiles = [];
for (const d of searchDirs) {
  allFiles = allFiles.concat(findFiles(d));
}

console.log('Searching all', allFiles.length, 'Excel files for compensation keywords in sheet names or headers...');

const matchedFiles = [];

for (const f of allFiles) {
  try {
    const wb = XLSX.readFile(f.path, { sheetRows: 2 });
    let hasCompensation = false;
    const sheetMatches = [];
    for (const sn of wb.SheetNames) {
      const snLower = sn.toLowerCase();
      if (snLower.includes('compens') || snLower.includes('feriado') || snLower.includes('descanso')) {
        hasCompensation = true;
        sheetMatches.push(sn);
      } else {
        const sheet = wb.Sheets[sn];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length > 0) {
          const rowStr = JSON.stringify(rows[0]).toLowerCase();
          if (rowStr.includes('compens') || rowStr.includes('gozado') || rowStr.includes('dias por compensar')) {
            hasCompensation = true;
            sheetMatches.push(sn);
          }
        }
      }
    }
    if (hasCompensation) {
      matchedFiles.push({ name: f.name, path: f.path, sheets: sheetMatches });
    }
  } catch (e) {}
}

console.log('\nMATCHED COMPENSATION FILES (' + matchedFiles.length + '):');
console.log(JSON.stringify(matchedFiles, null, 2));
