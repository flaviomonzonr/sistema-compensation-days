const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const scanRoots = [
  path.join(userProfile, 'Downloads'),
  path.join(userProfile, 'Desktop'),
  path.join(userProfile, 'Documents'),
  'c:\\apps-flavio'
];

const found = [];
function walk(dir, depth = 0) {
  if (depth > 4) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && !['node_modules', '.git', 'dist', 'build', 'AppData', '.gemini'].includes(ent.name)) {
        walk(full, depth + 1);
      } else if (ent.isFile() && !ent.name.startsWith('~$')) {
        const st = fs.statSync(full);
        if (st.mtime > new Date('2026-08-01T00:00:00.000Z')) {
          found.push({ full, name: ent.name, mtime: st.mtime, size: st.size });
        }
      }
    }
  } catch(e){}
}
for (const r of scanRoots) walk(r);
found.sort((a,b) => b.mtime - a.mtime);
console.log('Archivos de datos modificados en agosto/septiembre/octubre 2026:', found.length);
found.forEach(f => {
  if (f.name.endsWith('.xlsx') || f.name.endsWith('.json') || f.name.endsWith('.xlsm') || f.name.endsWith('.csv')) {
    console.log(`[${f.mtime.toISOString().slice(0, 16)}] ${(f.size/1024).toFixed(1)} KB | ${f.name} | ${f.full}`);
  }
});
