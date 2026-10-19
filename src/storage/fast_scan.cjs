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
          if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.json')) {
            results.push({ name: item.name, path: fullPath, size: fs.statSync(fullPath).size, mtime: fs.statSync(fullPath).mtime });
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

console.log('Total files found:', allFiles.length);

const results = [];

for (const f of allFiles) {
  const n = f.name.toLowerCase();
  if (n.endsWith('.json')) {
    if (n.includes('compens') || n.includes('backup') || n.includes('adp') || n.includes('data') || n.includes('registro')) {
      results.push({ type: 'json', name: f.name, path: f.path, mtime: f.mtime });
    }
    continue;
  }
  try {
    const wb = XLSX.readFile(f.path, { bookSheets: true });
    const sheets = wb.SheetNames || [];
    let match = false;
    const matchedSheets = [];
    for (const sn of sheets) {
      const snLower = sn.toLowerCase();
      if (snLower.includes('compens') || snLower.includes('feriad') || snLower.includes('descanso') || snLower.includes('gozado') || snLower.includes('dias por') || snLower.includes('reporte')) {
        match = true;
        matchedSheets.push(sn);
      }
    }
    if (match || n.includes('compens') || n.includes('feriad') || n.includes('descanso') || n.includes('horas por') || n.includes('dias de')) {
      results.push({ type: 'excel', name: f.name, path: f.path, sheets: sheets, matchedSheets, mtime: f.mtime });
    }
  } catch (e) {}
}

console.log('Found', results.length, 'matches:');
console.log(JSON.stringify(results, null, 2));
