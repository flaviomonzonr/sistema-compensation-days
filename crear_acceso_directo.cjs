const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetVbs = path.join(__dirname, 'Abrir_Sistema.vbs');
const wscriptExe = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'wscript.exe');
const icoPath = path.join(__dirname, 'app_icon.ico');

// Candidate desktop paths
const desktopPaths = [
  path.join(process.env.USERPROFILE || '', 'OneDrive', 'Desktop'),
  path.join(process.env.USERPROFILE || '', 'Desktop'),
  path.join(process.env.USERPROFILE || '', 'OneDrive', 'Escritorio'),
  path.join(process.env.USERPROFILE || '', 'Escritorio')
].filter(p => p && fs.existsSync(p));

console.log('Rutas de escritorio detectadas:', desktopPaths);

// Nombres obsoletos o duplicados a limpiar
const oldNames = [
  'Sistema Compensation Days.lnk',
  'Compensaciones.lnk',
  'Compensacion.lnk',
  'Dias de Compensacion.lnk',
  'Sistema Compensaciones.lnk'
];

for (const d of desktopPaths) {
  // 1. Limpiar versiones anteriores
  for (const old of oldNames) {
    const oldP = path.join(d, old);
    if (fs.existsSync(oldP)) {
      try {
        fs.unlinkSync(oldP);
        console.log('🗑️ Eliminado acceso directo anterior:', old);
      } catch (e) {}
    }
  }

  // 2. Crear el único acceso directo oficial (Ejecución 100% en segundo plano sin ventana negra)
  const shortcutName = 'Días de Compensación (ADPmodul).lnk';
  const shortcutPath = path.join(d, shortcutName);

  const psScript = `
    $ws = New-Object -ComObject WScript.Shell;
    $sc = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
    $sc.TargetPath = '${wscriptExe.replace(/'/g, "''")}';
    $sc.Arguments = '"${targetVbs.replace(/'/g, "''")}"';
    $sc.WorkingDirectory = '${__dirname.replace(/'/g, "''")}';
    $sc.IconLocation = '${icoPath.replace(/'/g, "''")},0';
    $sc.Description = 'Días de Compensación (ADPmodul) - Inicia en segundo plano';
    $sc.Save();
  `;

  try {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "' + psScript.replace(/\r?\n/g, ' ') + '"');
    console.log('✅ Acceso directo creado exitosamente en:', shortcutPath);
  } catch (err) {
    console.error('❌ Error al crear acceso directo en ' + d + ':', err.message);
  }
}
