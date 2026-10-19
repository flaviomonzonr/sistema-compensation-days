const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\apps-flavio';

function scanDir(dir, depth = 0) {
  if (depth > 4) return [];
  let results = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(fullPath, depth + 1));
        } else {
          const ext = path.extname(item).toLowerCase();
          if (['.json', '.xlsx', '.csv', '.sqlite', '.db'].includes(ext)) {
            results.push({
              path: fullPath,
              size: stat.size,
              mtime: stat.mtime
            });
          }
        }
      } catch (err) {}
    }
  } catch (err) {}
  return results;
}

const files = scanDir(baseDir);
console.log(`Encontrados ${files.length} archivos de datos en C:\\apps-flavio:`);
files.sort((a, b) => b.mtime - a.mtime);
for (const f of files.slice(0, 30)) {
  console.log(`- ${f.path} (${f.size} bytes) - Modificado: ${f.mtime.toISOString()}`);
}
