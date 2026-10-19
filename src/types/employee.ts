export type EstadoEmpleado = 'ACTIVO' | 'CESADO';

export type TipoTrabajador = 'EMPLEADO' | 'OBRERO' | 'PRACTICANTE' | 'CONTRATADO' | 'OTRO';

export interface Empleado {
  id: string;
  codigo: string;
  apellidosNombres: string;
  documentoIdentidad: string;
  fechaIngreso: string; // Formato YYYY-MM-DD
  fechaCese?: string | null; // Formato YYYY-MM-DD (opcional si es CESADO)
  fechasIngreso?: string[]; // Historial de todas las fechas de ingreso
  tipoTrabajador: string;
  categoria?: string;
  area: string;
  cargo: string;
  estado: EstadoEmpleado;
  createdAt: string;
  updatedAt: string;
}

export type CreateEmpleadoDto = Omit<Empleado, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEmpleadoDto = Partial<CreateEmpleadoDto>;
