const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const reportPath = 'C:\\Users\\Usuario\\Downloads\\Reporte_Compensaciones_2026-09-27.xlsx';
const wb = XLSX.readFile(reportPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log('Total filas en Reporte_Compensaciones_2026-09-27.xlsx:', rows.length);

const emps = new Map();
const comps = [];

function formatDate(val) {
  if (!val || val === '-') return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  return str;
}

rows.forEach((r, idx) => {
  const dni = String(r['DNI / Documento'] || r.DNI || r.dni || '').trim();
  const codigo = String(r['Código'] || r.Codigo || r.codigo || dni).trim();
  const nombre = String(r.Trabajador || r['Apellidos y Nombres'] || '').trim().toUpperCase();
  const area = String(r['Área'] || r.Area || 'GENERAL').trim().toUpperCase();
  const cargo = String(r.Cargo || 'EMPLEADO').trim().toUpperCase();

  const empId = `emp-${codigo.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
  if (!emps.has(empId) && (dni || codigo || nombre)) {
    emps.set(empId, {
      id: empId,
      codigo: codigo,
      apellidosNombres: nombre,
      documentoIdentidad: dni,
      fechaIngreso: '2026-01-01',
      fechaCese: null,
      fechasIngreso: ['2026-01-01'],
      tipoTrabajador: 'EMPLEADO',
      categoria: '',
      area: area,
      cargo: cargo,
      estado: 'ACTIVO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const fGen = formatDate(r['Día Trabajado']);
  const fComp = formatDate(r['Fecha Compensación']);
  const estado = String(r.Estado || 'PENDIENTE').trim().toUpperCase();
  const forma = String(r['Modalidad / Forma'] || 'Día de Descanso').toUpperCase().includes('PAG') ? 'PAGADO' : 'DESCANSO';
  const obs = String(r['Observación'] || '').trim();

  if (fGen) {
    comps.push({
      id: `comp-rep-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
      empleadoId: empId,
      fechaGenerada: fGen,
      fechaCompensacion: fComp,
      estado: estado === 'COMPENSADO' ? 'COMPENSADO' : (estado === 'PROGRAMADO' ? 'PROGRAMADO' : 'PENDIENTE'),
      formaCompensacion: forma,
      observacion: obs === '-' ? '' : obs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
});

console.log('Trabajadores únicos en reporte:', emps.size);
console.log('Compensaciones parseadas:', comps.length);
console.log('Muestra comp:', comps[0]);
console.log('Muestra emp:', Array.from(emps.values())[0]);
