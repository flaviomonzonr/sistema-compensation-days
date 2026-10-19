import { AprobadorPermiso, CreateAprobadorDto, UpdateAprobadorDto } from '../../types';
import { db } from '../db';

export interface IApproverRepository {
  getAll(): AprobadorPermiso[];
  getById(id: string): AprobadorPermiso | null;
  create(dto: CreateAprobadorDto): AprobadorPermiso;
  update(id: string, dto: UpdateAprobadorDto): AprobadorPermiso | null;
  delete(id: string): boolean;
  changeStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): AprobadorPermiso | null;
}

export class ApproverRepository implements IApproverRepository {
  public getAll(): AprobadorPermiso[] {
    return db.getApprovers();
  }

  public getById(id: string): AprobadorPermiso | null {
    return this.getAll().find((a) => a.id === id) || null;
  }

  public create(dto: CreateAprobadorDto): AprobadorPermiso {
    const list = this.getAll();
    const now = new Date().toISOString();
    const newApprover: AprobadorPermiso = {
      id: 'app-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      nombreCompleto: dto.nombreCompleto.trim().toUpperCase(),
      cargo: dto.cargo.trim().toUpperCase(),
      area: dto.area.trim().toUpperCase(),
      documentoIdentidad: (dto.documentoIdentidad || '').trim(),
      firmaUrl: dto.firmaUrl || undefined,
      estado: 'ACTIVO',
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newApprover);
    db.saveApprovers(list);
    return newApprover;
  }

  public update(id: string, dto: UpdateAprobadorDto): AprobadorPermiso | null {
    const list = this.getAll();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: AprobadorPermiso = {
      ...existing,
      nombreCompleto: dto.nombreCompleto !== undefined ? dto.nombreCompleto.trim().toUpperCase() : existing.nombreCompleto,
      cargo: dto.cargo !== undefined ? dto.cargo.trim().toUpperCase() : existing.cargo,
      area: dto.area !== undefined ? dto.area.trim().toUpperCase() : existing.area,
      documentoIdentidad: dto.documentoIdentidad !== undefined ? dto.documentoIdentidad.trim() : existing.documentoIdentidad,
      firmaUrl: dto.firmaUrl !== undefined ? dto.firmaUrl : existing.firmaUrl,
      estado: dto.estado !== undefined ? dto.estado : existing.estado,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveApprovers(list);
    return updated;
  }

  public changeStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): AprobadorPermiso | null {
    return this.update(id, { estado });
  }

  public delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;
    db.saveApprovers(filtered);
    db.deleteApproverRemote(id);
    return true;
  }
}

export const approverRepository = new ApproverRepository();
