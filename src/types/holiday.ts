export type EstadoFeriado = 'ACTIVO' | 'INACTIVO';

export interface Feriado {
  id: string;
  fecha: string; // Formato YYYY-MM-DD
  descripcion: string;
  estado: EstadoFeriado;
  createdAt: string;
  updatedAt: string;
}

export type CreateFeriadoDto = Omit<Feriado, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateFeriadoDto = Partial<CreateFeriadoDto>;
