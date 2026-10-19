const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Usuario';
const candidateDirs = [
  path.join(userProfile, 'Downloads'),
  path.join(userProfile, 'Desktop'),
  path.join(userProfile, 'OneDrive', 'Desktop'),
  path.join(userProfile, 'Documents'),
  'C:\\apps-flavio'
];

for (const dir of candidateDirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.toLowerCase().includes('compensacion') || f.toLowerCase().includes('compensatorio') || f.toLowerCase().includes('compensar')) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        console.log(`Encontrado: ${full} (${stat.size} bytes, ${stat.mtime.toISOString()})`);
      }
    }
  }
}
