const fs = require('fs');
const path = require('path');

const baseAppData = [
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data',
  'C:\\Users\\Usuario\\AppData\\Local\\Microsoft\\Edge\\User Data'
];

function getLevelDbFolders(base) {
  let list = [];
  try {
    const traverse = (dir, depth = 0) => {
      if (depth > 6) return;
      const items = fs.readdirSync(dir);
      for (const it of items) {
        const p = path.join(dir, it);
        try {
          const stat = fs.statSync(p);
          if (stat.isDirectory()) {
            if (it.endsWith('.indexeddb.leveldb')) {
              list.push(p);
            } else {
              traverse(p, depth + 1);
            }
          }
        } catch (e) {}
      }
    };
    traverse(base);
  } catch (e) {}
  return list;
}

const levelFolders = [];
for (const b of baseAppData) levelFolders.push(...getLevelDbFolders(b));

const targets = [
  '74774869', 'MORE', 'COBEÑAS',
  '70102045', 'TARAZONA', 'TANIA',
  '74161563', 'ESPINOZA', 'NANCY'
];

console.log(`Scanning LevelDB folders for exact compensation records...`);

for (const lDir of levelFolders) {
  try {
    const files = fs.readdirSync(lDir);
    for (const f of files) {
      if (!f.endsWith('.ldb') && !f.endsWith('.log')) continue;
      const buf = fs.readFileSync(path.join(lDir, f));
      const text = buf.toString('latin1');
      
      // Buscar cadenas de fechaCompensacion o fechaGenerada
      let pos = 0;
      while ((pos = text.indexOf('fechaGenerada', pos)) !== -1) {
        const slice = text.substring(Math.max(0, pos - 200), Math.min(text.length, pos + 500));
        
        for (const t of targets) {
          if (slice.includes(t)) {
            console.log(`\n[${path.basename(lDir)} / ${f}] Match "${t}":`);
            console.log(slice.replace(/[\x00-\x1F]/g, ' '));
            break;
          }
        }
        pos += 15;
      }
    }
  } catch (e) {}
}
