const fs = require('fs');
const path = require('path');

const levelDbDir = 'C:\\Users\\Usuario\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\IndexedDB\\http_localhost_5173.indexeddb.leveldb';
const outputCompsPath = path.join(__dirname, 'recovered_compensations.json');
const outputEmpsPath = path.join(__dirname, 'recovered_employees.json');

console.log('Extrayendo compensaciones y empleados desde IndexedDB de localhost:5173...');

const files = fs.readdirSync(levelDbDir);
const jsonStrings = new Set();
const compensationsMap = new Map();
const employeesMap = new Map();

for (const file of files) {
  if (!file.endsWith('.ldb') && !file.endsWith('.log')) continue;
  const filePath = path.join(levelDbDir, file);
  const buf = fs.readFileSync(filePath);
  
  // Buscar bloques JSON en el buffer
  let str = buf.toString('utf8');
  
  // Regex para encontrar objetos JSON de compensaciones
  // Patrón: { ... "id": ... "fechaGenerada": ... } o similar
  const jsonRegex = /\{[^{}]*(?:"id"|"empleadoId"|"codigo"|"documentoIdentidad"|"fechaGenerada")[^{}]*\}/g;
  
  let match;
  while ((match = jsonRegex.exec(str)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj.fechaGenerada && (obj.empleadoId || obj.id)) {
        const key = obj.id || `${obj.empleadoId}_${obj.fechaGenerada}`;
        compensationsMap.set(key, obj);
      } else if (obj.codigo && obj.apellidosNombres) {
        employeesMap.set(obj.codigo, obj);
      }
    } catch (e) {}
  }
}

// Búsqueda más profunda si algunos objetos tenían llaves anidadas
for (const file of files) {
  if (!file.endsWith('.ldb') && !file.endsWith('.log')) continue;
  const filePath = path.join(levelDbDir, file);
  const buf = fs.readFileSync(filePath);
  
  // Buscar por chunks que empiecen con {"id":"comp- o {"id":"emp- o {"id":
  const text = buf.toString('latin1');
  const compIndices = [];
  let pos = 0;
  while ((pos = text.indexOf('"fechaGenerada"', pos)) !== null && pos !== -1) {
    // Retroceder hasta encontrar '{'
    let start = pos;
    let braceCount = 0;
    while (start > 0 && start > pos - 500) {
      if (text[start] === '{') {
        // Verificar si es el inicio del objeto
        try {
          // Avanzar hasta balancear llaves
          let end = start;
          let depth = 0;
          let inQuote = false;
          while (end < text.length && end < start + 2000) {
            const char = text[end];
            if (char === '"' && text[end - 1] !== '\\') inQuote = !inQuote;
            if (!inQuote) {
              if (char === '{') depth++;
              if (char === '}') {
                depth--;
                if (depth === 0) {
                  const candidate = Buffer.from(text.substring(start, end + 1), 'latin1').toString('utf8');
                  const parsed = JSON.parse(candidate);
                  if (parsed.fechaGenerada && parsed.id) {
                    compensationsMap.set(parsed.id, parsed);
                  }
                  break;
                }
              }
            }
            end++;
          }
        } catch (e) {}
        break;
      }
      start--;
    }
    pos += 15;
  }
}

const recoveredComps = Array.from(compensationsMap.values());
const recoveredEmps = Array.from(employeesMap.values());

console.log(`✅ Compensaciones recuperadas: ${recoveredComps.length}`);
console.log(`✅ Empleados recuperados: ${recoveredEmps.length}`);

if (recoveredComps.length > 0) {
  console.log('Muestra de compensación:', recoveredComps[0]);
  fs.writeFileSync(outputCompsPath, JSON.stringify(recoveredComps, null, 2), 'utf8');
}

if (recoveredEmps.length > 0) {
  fs.writeFileSync(outputEmpsPath, JSON.stringify(recoveredEmps, null, 2), 'utf8');
}
