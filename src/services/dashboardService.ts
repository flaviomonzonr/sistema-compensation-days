import {
  DashboardMetrics,
  WorkerPendingSummary,
  PendingDaysDistributionItem
} from '../types';
import { employeeRepository, compensationRepository } from '../storage';

export class DashboardService {
  public getMetrics(): DashboardMetrics {
    const employees = employeeRepository.getAll();
    const compensations = compensationRepository.getAll();

    // 1. Trabajadores activos
    const trabajadoresActivos = employees.filter((e) => e.estado === 'ACTIVO').length;

    // 2. Total días pendientes
    const totalDiasPendientes = compensations.filter((c) => c.estado === 'PENDIENTE').length;

    // 3. Compensaciones programadas
    const compensacionesProgramadas = compensations.filter(
      (c) => c.estado === 'PROGRAMADO'
    ).length;

    // 4. Compensaciones realizadas
    const compensacionesRealizadas = compensations.filter(
      (c) => c.estado === 'COMPENSADO'
    ).length;

    // 5. Resumen detallado de todos los trabajadores
    const employeePendingCounts: WorkerPendingSummary[] = employees.map((emp) => {
      const empComps = compensations.filter((c) => c.empleadoId === emp.id);
      const pendientes = empComps.filter((c) => c.estado === 'PENDIENTE').length;
      const programados = empComps.filter((c) => c.estado === 'PROGRAMADO').length;
      const compensados = empComps.filter((c) => c.estado === 'COMPENSADO').length;
      const anulados = empComps.filter((c) => c.estado === 'ANULADO').length;

      return {
        empleadoId: emp.id,
        codigo: emp.codigo,
        nombre: emp.apellidosNombres,
        documento: emp.documentoIdentidad,
        area: emp.area,
        cargo: emp.cargo,
        estadoEmpleado: emp.estado,
        diasPendientes: pendientes,
        diasProgramados: programados,
        diasCompensados: compensados,
        diasAnulados: anulados,
        totalGenerados: empComps.length
      };
    });

    // Ordenar descendente por días pendientes y luego por total generados
    const sortedWorkers = [...employeePendingCounts].sort((a, b) => {
      if (b.diasPendientes !== a.diasPendientes) {
        return b.diasPendientes - a.diasPendientes;
      }
      return b.totalGenerados - a.totalGenerados;
    });

    const topTrabajadoresPendientes = sortedWorkers.slice(0, 10);

    // Trabajadores que tienen al menos 1 día pendiente
    const trabajadoresConPendientesList = sortedWorkers.filter((w) => w.diasPendientes > 0);
    const totalTrabajadoresConPendientes = trabajadoresConPendientesList.length;

    // Distribución por cantidad de días pendientes
    const daysMap = new Map<number, { countTrabajadores: number; totalDias: number; empleadoIds: string[] }>();
    trabajadoresConPendientesList.forEach((w) => {
      const current = daysMap.get(w.diasPendientes) || { countTrabajadores: 0, totalDias: 0, empleadoIds: [] };
      current.countTrabajadores += 1;
      current.totalDias += w.diasPendientes;
      current.empleadoIds.push(w.empleadoId);
      daysMap.set(w.diasPendientes, current);
    });

    const distribucionDiasPendientes: PendingDaysDistributionItem[] = Array.from(daysMap.entries())
      .map(([dias, val]) => ({
        dias,
        cantidadTrabajadores: val.countTrabajadores,
        totalDias: val.totalDias,
        empleadoIds: val.empleadoIds
      }))
      .sort((a, b) => a.dias - b.dias);

    return {
      trabajadoresActivos,
      totalDiasPendientes,
      compensacionesProgramadas,
      compensacionesRealizadas,
      topTrabajadoresPendientes,
      distribucionDiasPendientes,
      totalTrabajadoresConPendientes,
      todosTrabajadoresPendientes: sortedWorkers
    };
  }
}

export const dashboardService = new DashboardService();
