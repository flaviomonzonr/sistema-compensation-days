const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

console.log('=== BÚSQUEDA PROFUNDA DE TODAS LAS FECHAS DE COMPENSACIÓN REGISTRADAS ===\n');

const TARGETS = [
  { key: 'MORE', dnis: ['74774869'], name: 'MORE COBEÑAS' },
  { key: 'TANIA', dnis: ['70102045'], name: 'TARAZONA' },
  { key: 'NANCY', dnis: ['74161563'], name: 'ESPINOZA' }
];

// 1. Buscar en todos los directorios LevelDB de Chrome y Edge
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

console.log(`Buscando en ${levelFolders.length} carpetas LevelDB...`);

for (const lDir of levelFolders) {
  try {
    const files = fs.readdirSync(lDir);
    for (const f of files) {
      if (!f.endsWith('.ldb') && !f.endsWith('.log')) continue;
      const buf = fs.readFileSync(path.join(lDir, f));
      const text = buf.toString('latin1');
      
      // Buscar objetos de compensación completos
      let pos = 0;
      while ((pos = text.indexOf('fechaGenerada', pos)) !== -1) {
        const slice = text.substring(Math.max(0, pos - 400), Math.min(text.length, pos + 600));
        
        // Verificar si contiene referencias a More, Tania o Nancy o sus DNIs o IDs
        const isTarget = TARGETS.some(t => {
          return t.dnis.some(d => slice.includes(d)) || 
                 slice.toUpperCase().includes(t.name) ||
                 slice.includes('emp-mtrtyoaym5lo') || slice.includes('emp-muf43b1k0dkp') || slice.includes('emp-74774869') ||
                 slice.includes('emp-mtrtyob1341r') || slice.includes('emp-muf43b1mx0zz') || slice.includes('emp-70102045') ||
                 slice.includes('emp-mtrtyob1p76v') || slice.includes('emp-muf43b1gsctc') || slice.includes('emp-74161563');
        });
        
        if (isTarget) {
          console.log(`\n>> ENCONTRADO EN LEVELDB: ${lDir}\\${f}`);
          console.log(`   Bloque: ${slice.replace(/[\x00-\x1F]/g, ' ')}`);
        }
        pos += 15;
      }
    }
  } catch (e) {}
}

// 2. Buscar en todos los Excels de Descargas y Desktop que contengan "Reporte", "Compensaciones", "Solicitud", "Plantilla"
const downloadsDir = 'C:\\Users\\Usuario\\Downloads';
const desktopDir = 'C:\\Users\\Usuario\\Desktop';

function scanExcelsForCompDates(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (!f.endsWith('.xlsx') && !f.endsWith('.xls') && !f.endsWith('.json')) continue;
      const full = path.join(dir, f);
      
      if (f.endsWith('.json')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('fechaCompensacion') || content.includes('compensaciones')) {
            const data = JSON.parse(content);
            const comps = data.compensaciones || data.compensations || [];
            const emps = data.empleados || data.employees || [];
            for (const c of comps) {
              const str = JSON.stringify(c) + ' ' + JSON.stringify(emps);
              if (str.includes('74774869') || str.includes('70102045') || str.includes('74161563') || str.includes('MORE') || str.includes('TARAZONA') || str.includes('ESPINOZA')) {
                console.log(`\n>> JSON [${f}]: Comp: ${JSON.stringify(c)}`);
              }
            }
          }
        } catch (e) {}
      } else {
        try {
          const wb = xlsx.readFile(full, { cellDates: true });
          for (const sn of wb.SheetNames) {
            const sheet = wb.Sheets[sn];
            const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
            for (const row of rows) {
              const rowStr = JSON.stringify(row).toUpperCase();
              if (
                rowStr.includes('74774869') || rowStr.includes('70102045') || rowStr.includes('74161563') ||
                rowStr.includes('MORE CO') || rowStr.includes('TARAZONA ARCE') || rowStr.includes('ESPINOZA RAMIREZ') ||
                rowStr.includes('TANIA') || rowStr.includes('NANCY')
              ) {
                // Si tiene alguna fecha de compensacion
                if (row['Fecha Compensada'] || row['Fecha Compensación'] || row['MES GOZADO'] || row['FechaComp'] || row['FECHA COMPENSADA']) {
                  console.log(`\n>> EXCEL [${f} | Hoja "${sn}"]: ${JSON.stringify(row)}`);
                }
              }
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
}

console.log('\nBuscando en Excels de Downloads y Desktop...');
scanExcelsForCompDates(downloadsDir);
scanExcelsForCompDates(desktopDir);
