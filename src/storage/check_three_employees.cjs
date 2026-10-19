const fs = require('fs');

console.log('=== VERIFICACIÓN DE LAS 3 TRABAJADORAS ===');

const targets = [
  { name: 'MORE COBEÑAS', dni: '74774869', id: 'emp-74774869' },
  { name: 'TARAZONA ARCE, TANIA', dni: '70102045', id: 'emp-70102045' },
  { name: 'ESPINOZA RAMIREZ, MIRTHA NANCY', dni: '74161563', id: 'emp-74161563' }
];

// 1. En recovered_compensations.json
if (fs.existsSync('src/storage/recovered_compensations.json')) {
  const recComps = JSON.parse(fs.readFileSync('src/storage/recovered_compensations.json', 'utf8'));
  console.log(`\nEn recovered_compensations.json (${recComps.length} registros):`);
  for (const t of targets) {
    const list = recComps.filter(c => c.empleadoId === t.id || (c.observacion && c.observacion.includes(t.dni)) || c.id.includes(t.dni));
    console.log(`\n-- ${t.name} (${t.dni} / ${t.id}) -> ${list.length} compensaciones:`);
    list.forEach(c => {
      console.log(`   ID: ${c.id} | F.Generada: ${c.fechaGenerada} | F.Compensacion: ${c.fechaCompensacion} | Estado: ${c.estado} | Obs: ${c.observacion || ''}`);
    });
  }
}

// 2. En seedData.ts
const seedContent = fs.readFileSync('src/storage/seedData.ts', 'utf8');
console.log('\n--- EN seedData.ts ---');
for (const t of targets) {
  console.log(`\n-- ${t.name} (${t.dni}):`);
  // Buscar empleado
  const empIdx = seedContent.indexOf(t.dni);
  if (empIdx !== -1) {
    console.log(`   Empleado encontrado en seedData.ts`);
  } else {
    console.log(`   Empleado NO encontrado en seedData.ts`);
  }
  
  // Buscar compensaciones
  let pos = 0;
  let count = 0;
  while ((pos = seedContent.indexOf(t.id, pos)) !== -1) {
    // Tomar el bloque {...} alrededor
    const blockStart = seedContent.lastIndexOf('{', pos);
    const blockEnd = seedContent.indexOf('}', pos);
    if (blockStart !== -1 && blockEnd !== -1) {
      const block = seedContent.substring(blockStart, blockEnd + 1);
      if (block.includes('fechaGenerada') || block.includes('fechaCompensacion')) {
        count++;
        console.log(`   Compensación ${count}: ${block.replace(/\s+/g, ' ')}`);
      }
    }
    pos += t.id.length;
  }
}
