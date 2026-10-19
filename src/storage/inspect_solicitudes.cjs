const fs = require('fs');

const datasetPath = 'C:\\apps-flavio\\Sistema de Vacaciones\\initial_dataset.json';
const raw = fs.readFileSync(datasetPath, 'utf8');
const data = JSON.parse(raw);

console.log('--- SOLICITUDES (Muestra de 3) ---');
console.log(JSON.stringify(data.solicitudes.slice(0, 3), null, 2));

console.log('--- HISTORIAL (Muestra de 3) ---');
if (data.historial && data.historial.length > 0) {
  console.log(JSON.stringify(data.historial.slice(0, 3), null, 2));
}

if (data.solicitudes) {
  const tipos = {};
  const estados = {};
  data.solicitudes.forEach(s => {
    const t = s.tipo || s.tipo_solicitud || s.concepto || 'DESCONOCIDO';
    tipos[t] = (tipos[t] || 0) + 1;
    const e = s.estado || 'SIN_ESTADO';
    estados[e] = (estados[e] || 0) + 1;
  });
  console.log('Tipos de solicitudes:', tipos);
  console.log('Estados de solicitudes:', estados);
}
