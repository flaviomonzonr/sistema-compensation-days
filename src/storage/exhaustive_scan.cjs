const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const scanRoots = [
  path.join(userProfile, 'Downloads'),
  path.join(userProfile, 'Desktop'),
  path.join(userProfile, 'Documents'),
  'c:\\apps-flavio'
];

console.log('=== BUSQUEDA EXHAUSTIVA DE ARCHIVOS DE COMPENSACION / DIAS LIBRES / FERIADOS ===\n');

const foundFiles = [];

function walk(dir, depth = 0) {
  if (depth > 4) return;
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', 'AppData', '.gemini'].includes(ent.name)) {
          walk(full, depth + 1);
        }
      } else if (ent.isFile()) {
        const name = ent.name.toLowerCase();
        if (
          (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xls') || name.endsWith('.json') || name.endsWith('.csv')) &&
          (name.includes('compensa') || name.includes('descanso') || name.includes('feriado') || name.includes('papeleta') || name.includes('reporte') || name.includes('backup') || name.includes('tareo') || name.includes('adp') || name.includes('horas')) &&
          !name.startsWith('~$')
        ) {
          try {
            const st = fs.statSync(full);
            foundFiles.push({ path: full, name: ent.name, size: st.size, mtime: st.mtime });
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
}

for (const r of scanRoots) {
  walk(r);
}

// Sort by date descending
foundFiles.sort((a, b) => b.mtime - a.mtime);

console.log(`Se encontraron ${foundFiles.length} archivos potencialmente relevantes:`);
for (const f of foundFiles) {
  console.log(`[${f.mtime.toISOString().slice(0, 10)}] ${(f.size / 1024).toFixed(1)} KB | ${f.name} | ${f.path}`);
}
