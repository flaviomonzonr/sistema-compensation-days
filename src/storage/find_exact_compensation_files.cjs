const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

const sinceDate = new Date('2026-08-01T00:00:00.000Z');
const all = fs.readdirSync(downloadsDir).filter(f => {
  if (!f.endsWith('.xlsx') && !f.endsWith('.xlsm')) return false;
  if (f.startsWith('~$')) return false;
  const full = path.join(downloadsDir, f);
  const st = fs.statSync(full);
  return st.mtime > sinceDate && st.size < 5 * 1024 * 1024;
});


console.log('=== BUSCANDO ARCHIVOS CON FORMATO EXACTO DE COMPENSACIONES ===');
for (const f of all) {
  const full = path.join(downloadsDir, f);
  try {
    const wb = XLSX.readFile(full);
    for (const sn of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 });
      if (rows.length > 0 && rows[0]) {
        const h = rows[0].map(x => String(x).trim().toLowerCase());
        const hasEstado = h.some(col => col.includes('estado'));
        const hasComp = h.some(col => col.includes('compensad') || col.includes('compensaci') || col.includes('día trabajado') || col.includes('fecha laborada'));
        if (hasEstado && hasComp) {
          console.log(`\nArchivo: ${f} -> Hoja: "${sn}" (${rows.length} filas)`);
          console.log('  Header:', rows[0].slice(0, 8));
          console.log('  Fila 1:', rows[1] ? rows[1].slice(0, 8) : []);
        }
      }
    }
  } catch(e) {}
}
