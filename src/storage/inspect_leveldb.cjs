const fs = require('fs');
const path = require('path');

const profile1Dir = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB';

function scanLevelDb(dirName) {
  const targetDir = path.join(profile1Dir, dirName);
  console.log(`\n=== Inspeccionando ${dirName} ===`);
  if (!fs.existsSync(targetDir)) {
    console.log('No existe:', targetDir);
    return;
  }
  const files = fs.readdirSync(targetDir);
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const stat = fs.statSync(filePath);
    console.log(`- ${file} (${stat.size} bytes)`);
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
      const buf = fs.readFileSync(filePath);
      const str = buf.toString('latin1');
      // Buscar cadenas clave
      const keywords = ['compensacion', 'Compensacion', 'empleado', 'fechaGenerada', 'fechaCompensacion', 'MiniFlavio', 'ADPmodul', 'feriado', 'PENDIENTE', 'PROGRAMADO', 'COMPENSADO'];
      for (const kw of keywords) {
        let count = 0;
        let pos = 0;
        while ((pos = str.indexOf(kw, pos)) !== -1) {
          count++;
          pos += kw.length;
        }
        if (count > 0) {
          console.log(`   Encontradas ${count} coincidencias de "${kw}" en ${file}`);
        }
      }
    }
  }
}

scanLevelDb('http_localhost_5173.indexeddb.leveldb');
scanLevelDb('http_localhost_5174.indexeddb.leveldb');
scanLevelDb('http_localhost_5175.indexeddb.leveldb');
