const fs = require('fs');
const path = require('path');

const levelDbDir = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB\\http_localhost_5173.indexeddb.leveldb';
const filePath = path.join(levelDbDir, '003526.log');
const buf = fs.readFileSync(filePath);

console.log('Tamaño del log:', buf.length);

let pos = 0;
let count = 0;
while ((pos = buf.indexOf('fechaGenerada', pos)) !== -1 && count < 5) {
  const start = Math.max(0, pos - 200);
  const end = Math.min(buf.length, pos + 300);
  const slice = buf.subarray(start, end);
  console.log(`\n--- Coincidencia ${count + 1} (Offset ${pos}) ---`);
  console.log('ASCII/Text:', slice.toString('latin1').replace(/[^\x20-\x7E]/g, '.'));
  console.log('Hex:', slice.toString('hex'));
  pos += 15;
  count++;
}
