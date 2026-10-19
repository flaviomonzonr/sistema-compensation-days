const fs = require('fs');
const path = require('path');

const baseAppData = [
  'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data',
  'C:\\Users\\Usuario\\AppData\\Local\\Microsoft\\Edge\\User Data'
];

function traverse(dir, depth = 0) {
  if (depth > 6) return [];
  let list = [];
  try {
    for (const it of fs.readdirSync(dir)) {
      const p = path.join(dir, it);
      try {
        const s = fs.statSync(p);
        if (s.isDirectory()) {
          if (it.endsWith('.indexeddb.leveldb')) list.push(p);
          else list.push(...traverse(p, depth + 1));
        }
      } catch (e) {}
    }
  } catch (e) {}
  return list;
}

let allLevelDirs = [];
for (const b of baseAppData) allLevelDirs.push(...traverse(b));

const empIds = ['emp-74161563', 'emp-74774869', 'emp-70102045', '74161563', '74774869', '70102045'];

console.log(`Scanning ${allLevelDirs.length} leveldb folders...`);

const foundRecords = {};

for (const dir of allLevelDirs) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (!f.endsWith('.ldb') && !f.endsWith('.log')) continue;
      const full = path.join(dir, f);
      const buf = fs.readFileSync(full);
      const text = buf.toString('latin1');
      
      for (const target of empIds) {
        let pos = 0;
        while ((pos = text.indexOf(target, pos)) !== -1) {
          const slice = text.substring(Math.max(0, pos - 250), Math.min(text.length, pos + 400));
          
          // Buscar si hay fechaGenerada
          if (slice.includes('fechaGenerada')) {
            const clean = slice.replace(/[\x00-\x1F]/g, ' ');
            // intentar parsear campos clave
            const mId = clean.match(/comp-[a-zA-Z0-9_-]+/);
            const mEmp = clean.match(/emp-[a-zA-Z0-9_-]+/);
            const mGen = clean.match(/fechaGenerada["\s:]+([0-9]{4}-[0-9]{2}-[0-9]{2})/);
            const mComp = clean.match(/fechaCompensacion["\s:]+([0-9]{4}-[0-9]{2}-[0-9]{2})/);
            const mEst = clean.match(/estado["\s:]+([A-Z]+)/);
            const mObs = clean.match(/observacion["\s:]+([^"]+)/);
            
            const key = `${mEmp ? mEmp[0] : target}_${mGen ? mGen[1] : 'unknown'}`;
            if (!foundRecords[key]) {
              foundRecords[key] = {
                file: `${path.basename(dir)}/${f}`,
                id: mId ? mId[0] : 'comp-?',
                empId: mEmp ? mEmp[0] : target,
                fechaGenerada: mGen ? mGen[1] : null,
                fechaCompensacion: mComp ? mComp[1] : null,
                estado: mEst ? mEst[1] : null,
                observacion: mObs ? mObs[1] : '',
                raw: clean
              };
            } else {
              // Si la nueva tiene fechaCompensacion y la anterior no, actualizar
              if (mComp && !foundRecords[key].fechaCompensacion) {
                foundRecords[key].fechaCompensacion = mComp[1];
                foundRecords[key].estado = mEst ? mEst[1] : 'COMPENSADO';
                foundRecords[key].file = `${path.basename(dir)}/${f}`;
                if (mObs) foundRecords[key].observacion = mObs[1];
              }
            }
          }
          pos += target.length;
        }
      }
    }
  } catch (e) {}
}

console.log('\n=== REGISTROS ÚNICOS EXTRAÍDOS DE TODAS LAS BASES DE DATOS ===');
const sortedKeys = Object.keys(foundRecords).sort();
for (const k of sortedKeys) {
  const r = foundRecords[k];
  console.log(`[${r.empId}] Gen: ${r.fechaGenerada} | Comp: ${r.fechaCompensacion || 'PENDIENTE'} | Est: ${r.estado} | ID: ${r.id} | Obs: ${r.observacion}`);
}
