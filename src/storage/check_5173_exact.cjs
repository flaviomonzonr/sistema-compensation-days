const fs = require('fs');
const path = require('path');

const dir5173 = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\IndexedDB\\http_localhost_5173.indexeddb.leveldb';

if (fs.existsSync(dir5173)) {
  const files = fs.readdirSync(dir5173);
  for (const f of files) {
    if (!f.endsWith('.log') && !f.endsWith('.ldb')) continue;
    const buf = fs.readFileSync(path.join(dir5173, f));
    const text = buf.toString('latin1');
    
    ['74774869', '70102045', '74161563'].forEach(dni => {
      let pos = 0;
      while ((pos = text.indexOf(dni, pos)) !== -1) {
        const slice = text.substring(Math.max(0, pos - 150), Math.min(text.length, pos + 350)).replace(/[\x00-\x1F]/g, ' ');
        if (slice.includes('fechaGenerada') || slice.includes('fechaCompensacion') || slice.includes('COMPENSADO') || slice.includes('PENDIENTE')) {
          console.log(`\n[5173 - ${f}] Match ${dni}:`);
          console.log(slice);
        }
        pos += dni.length;
      }
    });
  }
} else {
  console.log('Dir 5173 not found');
}
