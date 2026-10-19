const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';

const browserPaths = [
  path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB'),
  path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Profile 1', 'IndexedDB'),
  path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'IndexedDB'),
  path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Profile 1', 'IndexedDB'),
  path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb'),
  path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb')
];

console.log('Buscando bases de datos de localhost en navegadores...');

for (const bp of browserPaths) {
  if (fs.existsSync(bp)) {
    try {
      const items = fs.readdirSync(bp);
      console.log(`\nDirectorio encontrado: ${bp}`);
      for (const it of items) {
        if (it.toLowerCase().includes('localhost') || it.toLowerCase().includes('127.0.0.1') || it.toLowerCase().includes('adp') || it.toLowerCase().includes('flavio') || it.toLowerCase().includes('.ldb') || it.toLowerCase().includes('.log')) {
          const itemPath = path.join(bp, it);
          const stat = fs.statSync(itemPath);
          console.log(`  -> ${it} (Modificado: ${stat.mtime.toISOString()}, Tamaño: ${stat.size} bytes)`);
        }
      }
    } catch (e) {
      console.log(`Error leyendo ${bp}:`, e.message);
    }
  }
}
