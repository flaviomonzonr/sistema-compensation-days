const fs = require('fs');

const datasetPath = 'C:\\apps-flavio\\Sistema de Vacaciones\\initial_dataset.json';
const raw = fs.readFileSync(datasetPath, 'utf8');
const data = JSON.parse(raw);

console.log('Claves principales en initial_dataset.json:', Object.keys(data));

if (data.compensaciones) {
  console.log('Encontradas compensaciones en dataset:', data.compensaciones.length);
  console.log('Muestra de compensación:', data.compensaciones.slice(0, 3));
}

if (data.vacaciones) {
  console.log('Encontradas vacaciones en dataset:', data.vacaciones.length);
  console.log('Muestra de vacaciones:', data.vacaciones.slice(0, 3));
}

if (data.feriadosTrabajados) {
  console.log('Encontrados feriadosTrabajados:', data.feriadosTrabajados.length);
}

if (data.solicitudes) {
  console.log('Encontradas solicitudes:', data.solicitudes.length);
}

if (data.papeletas) {
  console.log('Encontradas papeletas:', data.papeletas.length);
}

if (data.historico) {
  console.log('Encontrado historico:', data.historico.length);
}
