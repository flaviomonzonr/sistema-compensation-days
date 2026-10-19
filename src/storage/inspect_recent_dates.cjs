const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const downloadsDir = path.join(userProfile, 'Downloads');

console.log('=== ARCHIVOS DE COMPENSACIONES EN DOWNLOADS CON FECHA DE MODIFICACIÓN ===');
const files = fs.readdirSync(downloadsDir).filter(f => /compensa|reporte.*compensa|backup.*compensa/i.test(f));
for (const f of files) {
  const full = path.join(downloadsDir, f);
  const st = fs.statSync(full);
  console.log(`${f} | Mtime: ${st.mtime.toISOString()} | Size: ${(st.size / 1024).toFixed(1)} KB`);
}

// Check Chrome IndexedDB files and timestamps for port 5173 / 5175
const chromeIdbDir = path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB');
if (fs.existsSync(chromeIdbDir)) {
  console.log('\n=== CHROME INDEXEDDB FOLDERS ===');
  const dirs = fs.readdirSync(chromeIdbDir).filter(d => /localhost/i.test(d));
  for (const d of dirs) {
    const full = path.join(chromeIdbDir, d);
    const st = fs.statSync(full);
    console.log(`IndexedDB: ${d} | Mtime: ${st.mtime.toISOString()}`);
    if (fs.existsSync(full)) {
      const sub = fs.readdirSync(full);
      for (const sf of sub) {
        const sfull = path.join(full, sf);
        const sst = fs.statSync(sfull);
        console.log(`   -> ${sf} | Mtime: ${sst.mtime.toISOString()} | Size: ${(sst.size / 1024).toFixed(1)} KB`);
      }
    }
  }
}
