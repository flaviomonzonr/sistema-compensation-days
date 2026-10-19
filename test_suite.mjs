// Automated Business Logic & Integrity Test Suite
import assert from 'assert';

// Mock localStorage for Node test environment
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DE REGLAS DE NEGOCIO...\n');

// Import modules compiled via tsc or test directly
async function runTests() {
  // 1. Storage & Seeds
  const { INITIAL_HOLIDAYS_2026, INITIAL_EMPLOYEES, INITIAL_COMPENSATIONS } = await import('./src/storage/seedData.ts');
  const { db } = await import('./src/storage/db.ts');
  const { employeeService } = await import('./src/services/employeeService.ts');
  const { holidayService } = await import('./src/services/holidayService.ts');
  const { compensationService } = await import('./src/services/compensationService.ts');
  const { dashboardService } = await import('./src/services/dashboardService.ts');

  // Reset to default seeds
  db.resetToDefaults();

  console.log('✅ 1. Verificación de Semillas Iniciales:');
  const holidays = holidayService.getAll();
  assert.strictEqual(holidays.length, 16, 'Deben haber 16 feriados oficiales 2026 precargados');
  console.log(`   - Feriados precargados: ${holidays.length} (incluyendo Año Nuevo, Día del Trabajo, Fiestas Patrias, etc.)`);

  const employees = employeeService.getAll();
  assert.ok(employees.length >= 0, 'El sistema puede arrancar sin empleados de demo');
  console.log(`   - Empleados precargados: ${employees.length}`);

  const comps = compensationService.getAll();
  assert.ok(comps.length >= 0, 'El sistema puede arrancar sin compensaciones de demo');
  console.log(`   - Compensaciones precargadas: ${comps.length}`);

  // 2. Módulo de Empleados
  console.log('\n✅ 2. Pruebas del Módulo de Empleados:');
  
  // 2.0 Crear empleado base para pruebas
  const baseEmpRes = employeeService.create({
    codigo: 'EMP-001',
    apellidosNombres: 'JUAN PEREZ ROJAS',
    documentoIdentidad: '12345678',
    fechaIngreso: '2026-01-01',
    tipoTrabajador: 'EMPLEADO',
    area: 'CALIDAD',
    cargo: 'ANALISTA',
    estado: 'ACTIVO'
  });
  assert.strictEqual(baseEmpRes.success, true, 'Debe crear empleado base para tests');

  // 2.1 Búsqueda dinámica en tiempo real
  const searchResult1 = employeeService.getAll({ search: 'JUAN' });
  assert.ok(searchResult1.some(e => e.codigo === 'EMP-001'), 'Búsqueda por nombre JUAN debe encontrar EMP-001');
  const searchResult2 = employeeService.getAll({ search: '12345678' });
  assert.strictEqual(searchResult2.length, 1, 'Búsqueda por DNI debe ser exacta');
  console.log('   - Búsqueda dinámica en tiempo real (nombre y DNI): OK');

  // 2.2 Validación de Código Duplicado
  const dupCodeRes = employeeService.create({
    codigo: 'EMP-001',
    apellidosNombres: 'TEST DUPLICADO',
    documentoIdentidad: '99887766',
    fechaIngreso: '2026-01-01',
    tipoTrabajador: 'EMPLEADO',
    area: 'CALIDAD',
    cargo: 'ANALISTA',
    estado: 'ACTIVO'
  });
  assert.strictEqual(dupCodeRes.success, false, 'No debe permitir código duplicado');
  console.log('   - Bloqueo de código duplicado: OK');

  // 2.3 Validación de Documento Duplicado
  const dupDocRes = employeeService.create({
    codigo: 'EMP-999',
    apellidosNombres: 'TEST DUPLICADO DNI',
    documentoIdentidad: '12345678', // Ya usado por Juan Perez
    fechaIngreso: '2026-01-01',
    tipoTrabajador: 'EMPLEADO',
    area: 'CALIDAD',
    cargo: 'ANALISTA',
    estado: 'ACTIVO'
  });
  assert.strictEqual(dupDocRes.success, false, 'No debe permitir documento duplicado');
  console.log('   - Bloqueo de documento de identidad duplicado: OK');

  // 2.4 Creación exitosa
  const createEmpRes = employeeService.create({
    codigo: 'EMP-088',
    apellidosNombres: 'VARGAS LLOSA MARIO',
    documentoIdentidad: '77665544',
    fechaIngreso: '2026-02-01',
    tipoTrabajador: 'EMPLEADO',
    categoria: 'STAFF AGRÍCOLA',
    area: 'ADMINISTRACIÓN',
    cargo: 'ASISTENTE ADMINISTRATIVO',
    estado: 'ACTIVO'
  });
  assert.strictEqual(createEmpRes.success, true, 'Debe crear empleado con datos válidos');
  assert.strictEqual(createEmpRes.data.categoria, 'STAFF AGRÍCOLA', 'Debe guardar la categoría correctamente');
  console.log('   - Creación de nuevo empleado con categoría: OK');

  // 2.4.1 Carga masiva de empleados con y sin categoría
  const bulkRes = employeeService.bulkCreate([
    {
      codigo: 'EMP-090',
      apellidosNombres: 'MENDOZA SOTO CARLOS',
      documentoIdentidad: '11223344',
      fechaIngreso: '2026-03-01',
      tipoTrabajador: 'OBRERO',
      categoria: 'OBREROS AGRÍCOLAS',
      area: 'CAMPO',
      cargo: 'COSECHADOR',
      estado: 'ACTIVO'
    }
  ]);
  assert.strictEqual(bulkRes.importedCount, 1, 'Debe importar empleado en carga masiva con categoría');
  console.log('   - Carga masiva de empleados con columna categoría: OK');

  // 2.5 Regla: Creación de compensación y protección contra eliminación física con historial
  const regDummyComp = compensationService.registerPendingDay({
    empleadoId: baseEmpRes.data.id,
    fechaGenerada: '2026-01-01',
    observacion: 'Historial previo'
  });
  assert.strictEqual(regDummyComp.success, true);
  const deleteWithHist = employeeService.delete(baseEmpRes.data.id);
  assert.strictEqual(deleteWithHist.success, false, 'No debe permitir eliminar físicamente empleado con historial');
  console.log('   - Bloqueo de eliminación física para empleado con historial: OK');

  // 3. Módulo de Feriados
  console.log('\n✅ 3. Pruebas del Módulo de Feriados:');
  const dupHolRes = holidayService.create({
    fecha: '2026-05-01', // Ya existe Día del Trabajo
    descripcion: 'Feriado Duplicado',
    estado: 'ACTIVO'
  });
  assert.strictEqual(dupHolRes.success, false, 'No debe permitir duplicar fecha de feriado');
  console.log('   - Bloqueo de fecha de feriado duplicada: OK');

  const newHolRes = holidayService.create({
    fecha: '2026-11-20',
    descripcion: 'Aniversario Institucional',
    estado: 'ACTIVO'
  });
  assert.strictEqual(newHolRes.success, true, 'Debe crear feriado no repetido');
  console.log('   - Creación de nuevo feriado: OK');

  // 4. Módulo de Compensaciones (1:1 Lifecycle)
  console.log('\n✅ 4. Pruebas de Ciclo de Vida 1:1 de Compensaciones:');
  
  const empId = createEmpRes.data.id;

  // 4.1 Registrar día trabajado -> Genera PENDIENTE
  const regDay1 = compensationService.registerPendingDay({
    empleadoId: empId,
    fechaGenerada: '2026-05-01',
    observacion: 'Guardia feriado 1 de Mayo'
  });
  assert.strictEqual(regDay1.success, true, 'Debe registrar día pendiente');
  assert.strictEqual(regDay1.data.estado, 'PENDIENTE', 'Estado inicial debe ser PENDIENTE');
  assert.strictEqual(regDay1.data.fechaCompensacion, null, 'FechaCompensacion inicial debe ser null');
  console.log('   - Registro de día trabajado (Estado = PENDIENTE, FechaCompensacion = NULL): OK');

  // 4.2 Regla fundamental: No duplicar el mismo día generado para el mismo empleado
  const dupDay = compensationService.registerPendingDay({
    empleadoId: empId,
    fechaGenerada: '2026-05-01',
    observacion: 'Intento duplicar misma fecha'
  });
  assert.strictEqual(dupDay.success, false, 'Debe rechazar misma fecha trabajada para el mismo trabajador');
  console.log('   - Regla 1:1 fundamental: Bloqueo de día trabajado duplicado para el mismo empleado: OK');

  // 4.3 Programar compensación: PENDIENTE -> PROGRAMADO
  const compId = regDay1.data.id;
  const schedRes = compensationService.scheduleCompensation(compId, {
    fechaCompensacion: '2026-09-10',
    observacion: 'Compensará en Septiembre'
  });
  assert.strictEqual(schedRes.success, true, 'Debe programar fecha de compensación');
  assert.strictEqual(schedRes.data.estado, 'PROGRAMADO');
  assert.strictEqual(schedRes.data.fechaCompensacion, '2026-09-10');
  console.log('   - Programación de compensación (Estado = PROGRAMADO, Fecha = 2026-09-10): OK');

  // 4.4 Modificar fecha mientras esté programado
  const editSchedRes = compensationService.scheduleCompensation(compId, {
    fechaCompensacion: '2026-09-15',
    observacion: 'Reprogramado al 15'
  });
  assert.strictEqual(editSchedRes.success, true);
  assert.strictEqual(editSchedRes.data.fechaCompensacion, '2026-09-15');
  console.log('   - Modificación de fecha programada: OK');

  // 4.5 Marcar como COMPENSADO
  const markCompRes = compensationService.markAsCompensated(compId);
  assert.strictEqual(markCompRes.success, true);
  assert.strictEqual(markCompRes.data.estado, 'COMPENSADO');
  console.log('   - Transición a COMPENSADO cuando se ejecuta efectivamente: OK');

  // 4.6 No permitir reprogramar un registro ya COMPENSADO
  const schedCompensated = compensationService.scheduleCompensation(compId, {
    fechaCompensacion: '2026-10-01'
  });
  assert.strictEqual(schedCompensated.success, false, 'No debe reprogramar si ya está compensado');
  console.log('   - Protección de integridad para registros COMPENSADOS: OK');

  // 4.7 Anulación y re-registro tras anulación
  const regDay2 = compensationService.registerPendingDay({
    empleadoId: empId,
    fechaGenerada: '2026-07-28',
    observacion: 'Fiestas patrias guardia'
  });
  assert.strictEqual(regDay2.success, true);

  const annulRes = compensationService.annulCompensation(regDay2.data.id, {
    motivoAnulacion: 'Error en asignación de turno'
  });
  assert.strictEqual(annulRes.success, true);
  assert.strictEqual(annulRes.data.estado, 'ANULADO');
  console.log('   - Anulación con registro de motivo: OK');

  // No permitir compensar un registro ANULADO
  const schedAnnulled = compensationService.scheduleCompensation(regDay2.data.id, {
    fechaCompensacion: '2026-08-01'
  });
  assert.strictEqual(schedAnnulled.success, false, 'No debe permitir compensar un registro ANULADO');
  console.log('   - Bloqueo de programación para registros ANULADOS: OK');

  // Permitir registrar la fecha si el anterior fue ANULADO
  const reReg = compensationService.registerPendingDay({
    empleadoId: empId,
    fechaGenerada: '2026-07-28',
    observacion: 'Re-registro válido tras anulación previa'
  });
  assert.strictEqual(reReg.success, true, 'Debe permitir re-registrar fecha si la anterior fue ANULADA');
  console.log('   - Re-registro permitido cuando el anterior fue ANULADO: OK');

  // 4.8 Consulta por fecha y reprogramación para "Compensar otro día"
  const schedCompForAug20 = compensationService.scheduleCompensation(reReg.data.id, {
    fechaCompensacion: '2026-08-20',
    observacion: 'Programado inicialmente para el 20 de agosto'
  });
  assert.strictEqual(schedCompForAug20.success, true);
  
  // Filtrar los que se compensan el 2026-08-20
  const allList = compensationService.getAll();
  const toCompensateAug20 = allList.filter(c => c.fechaCompensacion === '2026-08-20');
  assert.strictEqual(toCompensateAug20.length, 1, 'Debe encontrar 1 trabajador a compensar el 20/08/2026');
  assert.strictEqual(toCompensateAug20[0].empleadoId, empId);

  // Reprogramar para "Compensar otro día" (ej. 2026-08-25)
  const rescheduleOtherDay = compensationService.scheduleCompensation(reReg.data.id, {
    fechaCompensacion: '2026-08-25',
    observacion: 'Reprogramado para compensar otro día'
  });
  assert.strictEqual(rescheduleOtherDay.success, true);
  assert.strictEqual(rescheduleOtherDay.data.fechaCompensacion, '2026-08-25');
  console.log('   - Consulta por fecha y función "Compensar otro día": OK');

  // 4.9 Regla A: El día generado NO puede ser igual a la fecha de compensación
  const sameDateAttempt = compensationService.scheduleCompensation(reReg.data.id, {
    fechaCompensacion: '2026-07-28' // Igual a la fecha generada de reReg
  });
  assert.strictEqual(sameDateAttempt.success, false, 'No debe permitir fecha de compensación igual al día trabajado');
  console.log('   - Regla A: Bloqueo cuando día generado es igual a fecha compensación: OK');

  // 4.10 Regla B: No puede haber 2 fechas de compensación iguales en la lista por trabajador
  const regDay3 = compensationService.registerPendingDay({
    empleadoId: empId,
    fechaGenerada: '2026-08-15',
    observacion: 'Tercer día de prueba'
  });
  assert.strictEqual(regDay3.success, true);

  // Intentar asignar fechaCompensacion '2026-08-25' que ya tiene reReg
  const duplicateCompDateAttempt = compensationService.scheduleCompensation(regDay3.data.id, {
    fechaCompensacion: '2026-08-25'
  });
  assert.strictEqual(
    duplicateCompDateAttempt.success,
    false,
    'No debe permitir 2 fechas de compensación iguales para el mismo trabajador'
  );
  console.log('   - Regla B: Bloqueo de fechas de compensación duplicadas para el mismo trabajador: OK');

  // 4.11 Pruebas de parseo de fechas DD/MM/YYYY, 2 dígitos y seriales de Excel
  const { parseDateString, formatDateDisplay, excelSerialToDateString } = await import('./src/utils/dateUtils.ts');
  
  assert.strictEqual(parseDateString('28/04/2025'), '2025-04-28', 'Debe parsear DD/MM/YYYY');
  assert.strictEqual(parseDateString('08/09/2024'), '2024-09-08', 'Debe parsear DD/MM/YYYY');
  assert.strictEqual(parseDateString('4/28/25'), '2025-04-28', 'Debe parsear fecha de Excel US 4/28/25 con año a 2 dígitos');
  assert.strictEqual(parseDateString('9/8/24'), '2024-08-09', 'Debe parsear fecha 9/8/24 a 2024-08-09');
  assert.strictEqual(parseDateString('11/17/23'), '2023-11-17', 'Debe parsear fecha 11/17/23 a 2023-11-17');
  assert.strictEqual(parseDateString(46233), '2026-07-30', 'Debe parsear serial numérico de Excel');
  assert.strictEqual(parseDateString('-'), '', 'Debe retornar string vacío para placeholder -');
  assert.strictEqual(parseDateString('N/A'), '', 'Debe retornar string vacío para placeholder N/A');
  
  assert.strictEqual(formatDateDisplay('2025-04-28'), '28/04/2025', 'Debe formatear a DD/MM/YYYY');
  assert.strictEqual(formatDateDisplay('4/28/25'), '28/04/2025', 'Debe formatear fecha legacy 4/28/25 a 28/04/2025');
  assert.strictEqual(formatDateDisplay(null), '-', 'Debe mostrar - si es null');
  console.log('   - Parseo y formateo universal de fechas DD/MM/YYYY y seriales Excel: OK');

  // 4.12 Pruebas de Carga Masiva con registros COMPENSADOS Históricos (Sin Fecha de Compensación)
  const bulkCompHistoricalRes = compensationService.bulkCreate([
    {
      identificadorTrabajador: '12345678',
      fechaGenerada: '08/09/2024',
      estado: 'COMPENSADO',
      fechaCompensacion: null, // Control histórico de años pasados
      observacion: 'Compensación histórica sin fecha'
    },
    {
      identificadorTrabajador: '12345678',
      fechaGenerada: '07/09/2025',
      estado: 'COMPENSADO',
      fechaCompensacion: '4/4/26', // Formato Excel
      observacion: 'Compensación con fecha'
    }
  ]);
  assert.strictEqual(bulkCompHistoricalRes.success, true, 'Debe permitir carga masiva con COMPENSADO histórico sin fecha');
  assert.strictEqual(bulkCompHistoricalRes.importedCount, 2);
  console.log('   - Carga masiva de COMPENSADO histórico sin fecha de compensación: OK');

  // 5. Dashboard y Métricas
  console.log('\n✅ 5. Pruebas de Métricas de Dashboard:');
  const metrics = dashboardService.getMetrics();
  assert.ok(metrics.trabajadoresActivos > 0);
  assert.ok(metrics.totalDiasPendientes >= 0);
  assert.ok(metrics.topTrabajadoresPendientes.length > 0);
  assert.ok(Array.isArray(metrics.distribucionDiasPendientes), 'distribucionDiasPendientes debe ser un array');
  assert.ok(Array.isArray(metrics.todosTrabajadoresPendientes), 'todosTrabajadoresPendientes debe ser un array');
  assert.strictEqual(
    typeof metrics.totalTrabajadoresConPendientes,
    'number',
    'totalTrabajadoresConPendientes debe ser un número'
  );

  // Validar coherencia de suma de distribución de días
  const sumDistDias = metrics.distribucionDiasPendientes.reduce((acc, curr) => acc + curr.totalDias, 0);
  assert.strictEqual(
    sumDistDias,
    metrics.totalDiasPendientes,
    'La suma de días en la distribución debe ser exactamente igual a totalDiasPendientes'
  );

  const sumDistTrabajadores = metrics.distribucionDiasPendientes.reduce((acc, curr) => acc + curr.cantidadTrabajadores, 0);
  assert.strictEqual(
    sumDistTrabajadores,
    metrics.totalTrabajadoresConPendientes,
    'La suma de trabajadores en la distribución debe ser igual a totalTrabajadoresConPendientes'
  );

  console.log(`   - Trabajadores Activos: ${metrics.trabajadoresActivos}`);
  console.log(`   - Total Días Pendientes: ${metrics.totalDiasPendientes}`);
  console.log(`   - Total Trabajadores con Pendientes: ${metrics.totalTrabajadoresConPendientes}`);
  console.log(`   - Distribución de Días Pendientes: ${JSON.stringify(metrics.distribucionDiasPendientes.map(d => `${d.dias}d: ${d.cantidadTrabajadores} trab`))}`);
  console.log(`   - Compensaciones Programadas: ${metrics.compensacionesProgramadas}`);
  console.log(`   - Compensaciones Realizadas: ${metrics.compensacionesRealizadas}`);
  console.log(`   - Top Trabajador con más pendientes: ${metrics.topTrabajadoresPendientes[0].nombre} (${metrics.topTrabajadoresPendientes[0].diasPendientes} días)`);

  // 6. Limpieza y Filtro de Observaciones de Carga Masiva para Impresión
  console.log('\n✅ 6. Pruebas de Limpieza de Observaciones de Carga Masiva (Impresión):');
  const { cleanObservationForPrint, formatObservationForDisplay } = await import('./src/utils/observationUtils.ts');

  assert.strictEqual(cleanObservationForPrint('Compensación (plantilla_carga_masiva_compensaciones (1).xlsx)'), '', 'Debe omitir nombres de archivos excel');
  assert.strictEqual(cleanObservationForPrint('Compensación (TARAZONA ARCE TANIA)'), '', 'Debe omitir nombres de hojas de importación');
  assert.strictEqual(cleanObservationForPrint('Plantilla masiva (1)'), '', 'Debe omitir placeholders de plantilla masiva');
  assert.strictEqual(cleanObservationForPrint('Compensación de día trabajado'), '', 'Debe omitir frase redundante');
  assert.strictEqual(cleanObservationForPrint('APOYO EN COSECHA DE PALTO'), 'APOYO EN COSECHA DE PALTO', 'Debe preservar motivos legítimos');
  assert.strictEqual(cleanObservationForPrint('TURNO DE GUARDIA DOMINICAL'), 'TURNO DE GUARDIA DOMINICAL', 'Debe preservar motivos legítimos');
  
  assert.strictEqual(formatObservationForDisplay('Compensación (plantilla_carga_masiva_compensaciones (1).xlsx)'), '-', 'En tablas debe mostrar guion');
  assert.strictEqual(formatObservationForDisplay('APOYO EN COSECHA DE PALTO'), 'APOYO EN COSECHA DE PALTO', 'En tablas debe mostrar motivo real');
  console.log('   - Filtro de formatos y archivos de carga masiva en impresión: OK');
  console.log('   - Formato limpio de observación en tablas: OK');

  console.log('\n🎉 TODAS LAS PRUEBAS DE REGLAS DE NEGOCIO Y MODELO 1:1 PASARON EXITOSAMENTE (100%).\n');
}

runTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
