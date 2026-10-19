const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const scanFolders = [
  path.join(userProfile, 'Desktop'),
  path.join(userProfile, 'OneDrive', 'Desktop'),
  path.join(userProfile, 'Downloads'),
  path.join(userProfile, 'Documents'),
  'C:\\apps-flavio\\ERP_RRHH'
];

console.log('Buscando archivos de compensaciones en carpetas de usuario...');

for (const folder of scanFolders) {
  if (fs.existsSync(folder)) {
    try {
      const items = fs.readdirSync(folder);
      console.log(`\nDirectorio: ${folder}`);
      for (const item of items) {
        const full = path.join(folder, item);
        try {
          const stat = fs.statSync(full);
          if (!stat.isDirectory() && (item.endsWith('.xlsx') || item.endsWith('.json') || item.endsWith('.csv') || item.endsWith('.txt'))) {
            console.log(`  - ${item} (${stat.size} bytes, modificado: ${stat.mtime.toISOString()})`);
          }
        } catch (_) {}
      }
    } catch (e) {
      console.log(`Error leyendo ${folder}: ${e.message}`);
    }
  }
}
