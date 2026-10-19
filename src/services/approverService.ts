import { AprobadorPermiso, CreateAprobadorDto, UpdateAprobadorDto, ApiResponse } from '../types';
import { approverRepository } from '../storage';

export class ApproverService {
  public getAll(filters?: { estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS'; search?: string }): AprobadorPermiso[] {
    let list = approverRepository.getAll();

    if (filters?.estado && filters.estado !== 'TODOS') {
      list = list.filter((a) => a.estado === filters.estado);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const term = filters.search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.nombreCompleto.toLowerCase().includes(term) ||
          a.cargo.toLowerCase().includes(term) ||
          a.area.toLowerCase().includes(term) ||
          (a.documentoIdentidad && a.documentoIdentidad.includes(term))
      );
    }

    return list;
  }

  public getById(id: string): AprobadorPermiso | null {
    return approverRepository.getById(id);
  }

  public create(dto: CreateAprobadorDto): ApiResponse<AprobadorPermiso> {
    if (!dto.nombreCompleto || dto.nombreCompleto.trim().length === 0) {
      return { success: false, error: 'El nombre completo del aprobador es obligatorio.' };
    }
    if (!dto.cargo || dto.cargo.trim().length === 0) {
      return { success: false, error: 'El cargo del aprobador es obligatorio.' };
    }
    if (!dto.area || dto.area.trim().length === 0) {
      return { success: false, error: 'El área del aprobador es obligatoria.' };
    }

    const created = approverRepository.create(dto);
    return { success: true, data: created };
  }

  public update(id: string, dto: UpdateAprobadorDto): ApiResponse<AprobadorPermiso> {
    const existing = approverRepository.getById(id);
    if (!existing) {
      return { success: false, error: 'El aprobador no existe.' };
    }

    const updated = approverRepository.update(id, dto);
    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el aprobador.' };
    }

    return { success: true, data: updated };
  }

  public changeStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): ApiResponse<AprobadorPermiso> {
    const updated = approverRepository.changeStatus(id, estado);
    if (!updated) {
      return { success: false, error: 'No se pudo cambiar el estado del aprobador.' };
    }
    return { success: true, data: updated };
  }

  public delete(id: string): ApiResponse<boolean> {
    const ok = approverRepository.delete(id);
    if (!ok) {
      return { success: false, error: 'No se pudo eliminar el aprobador.' };
    }
    return { success: true, data: true };
  }
}

export const approverService = new ApproverService();
