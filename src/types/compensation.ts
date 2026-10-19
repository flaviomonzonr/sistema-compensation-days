import { Empleado } from './employee';

export type EstadoCompensacion = 'PENDIENTE' | 'PROGRAMADO' | 'COMPENSADO' | 'ANULADO';

export type FormaCompensacion = 'DESCANSO' | 'REMUNERACION' | 'LIQUIDACION';

export interface Compensacion {
  id: string;
  empleadoId: string;
  fechaGenerada: string; // Formato YYYY-MM-DD (Día trabajado)
  fechaCompensacion: string | null; // Formato YYYY-MM-DD (Fecha en que se compensará/compensó, null si es pago o liquidación)
  estado: EstadoCompensacion;
  formaCompensacion?: FormaCompensacion; // 'DESCANSO' | 'REMUNERACION' | 'LIQUIDACION'
  observacion: string;
  motivoAnulacion?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompensacionConEmpleado extends Compensacion {
  empleado?: Empleado;
}

export interface ResumenCompensacionesEmpleado {
  totalGenerados: number;
  pendientes: number;
  programados: number;
  compensados: number;
  anulados: number;
}

export interface CreateCompensacionDto {
  empleadoId: string;
  fechaGenerada: string;
  fechaCompensacion?: string | null;
  estado?: EstadoCompensacion;
  formaCompensacion?: FormaCompensacion;
  observacion?: string;
}

export interface ProgramarCompensacionDto {
  fechaCompensacion?: string | null;
  formaCompensacion?: FormaCompensacion;
  observacion?: string;
}

export interface AnularCompensacionDto {
  motivoAnulacion: string;
}

export interface UpdateCompensacionDto {
  fechaGenerada?: string;
  fechaCompensacion?: string | null;
  estado?: EstadoCompensacion;
  formaCompensacion?: FormaCompensacion;
  observacion?: string;
  motivoAnulacion?: string | null;
}

export interface WorkerPendingSummary {
  empleadoId: string;
  codigo: string;
  nombre: string;
  documento: string;
  area: string;
  cargo: string;
  estadoEmpleado: string;
  diasPendientes: number;
  diasProgramados: number;
  diasCompensados: number;
  diasAnulados: number;
  totalGenerados: number;
}

export interface PendingDaysDistributionItem {
  dias: number;
  cantidadTrabajadores: number;
  totalDias: number;
  empleadoIds: string[];
}

export interface DashboardMetrics {
  trabajadoresActivos: number;
  totalDiasPendientes: number;
  compensacionesProgramadas: number;
  compensacionesRealizadas: number;
  topTrabajadoresPendientes: WorkerPendingSummary[];
  distribucionDiasPendientes: PendingDaysDistributionItem[];
  totalTrabajadoresConPendientes: number;
  todosTrabajadoresPendientes: WorkerPendingSummary[];
}
