const fs = require('fs');
const path = require('path');

const folders = [
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB\\http_localhost_5173.indexeddb.leveldb',
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB\\http_localhost_5174.indexeddb.leveldb',
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB\\http_localhost_5175.indexeddb.leveldb',
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 3\\IndexedDB\\http_localhost_5173.indexeddb.leveldb',
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 3\\IndexedDB\\http_localhost_5174.indexeddb.leveldb',
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 3\\IndexedDB\\http_localhost_5175.indexeddb.leveldb'
];

const targets = ['74774869', '70102045', '74161563'];

console.log('=== EXTRACTING ALL COMPENSATIONS FOR TARGET EMPLOYEES FROM PROFILES ===\n');

for (const dir of folders) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (!f.endsWith('.ldb') && !f.endsWith('.log')) continue;
    const buf = fs.readFileSync(path.join(dir, f));
    const text = buf.toString('latin1');
    
    for (const dni of targets) {
      let pos = 0;
      while ((pos = text.indexOf(dni, pos)) !== -1) {
        // Encontrar posibles objetos JSON
        const start = Math.max(0, pos - 200);
        const end = Math.min(text.length, pos + 400);
        const chunk = text.substring(start, end).replace(/[\x00-\x1F]/g, ' ');
        if (chunk.includes('fechaGenerada') || chunk.includes('fechaCompensacion') || chunk.includes('COMPENSADO') || chunk.includes('PENDIENTE')) {
          console.log(`[${dir.split('User Data\\')[1]} | ${f}] DNI ${dni}:`);
          console.log(`   ${chunk}\n`);
        }
        pos += dni.length;
      }
    }
  }
}
