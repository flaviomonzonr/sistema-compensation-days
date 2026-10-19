export interface AprobadorPermiso {
  id: string;
  nombreCompleto: string;
  cargo: string;
  area: string;
  documentoIdentidad?: string;
  firmaUrl?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
  updatedAt: string;
}

export interface CreateAprobadorDto {
  nombreCompleto: string;
  cargo: string;
  area: string;
  documentoIdentidad?: string;
  firmaUrl?: string;
}

export interface UpdateAprobadorDto {
  nombreCompleto?: string;
  cargo?: string;
  area?: string;
  documentoIdentidad?: string;
  firmaUrl?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}
