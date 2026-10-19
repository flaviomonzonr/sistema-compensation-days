import { Compensacion, CreateCompensacionDto, FormaCompensacion } from '../../types';
import { db } from '../db';

export interface ICompensationRepository {
  getAll(): Compensacion[];
  getById(id: string): Compensacion | null;
  getByEmployeeId(empleadoId: string): Compensacion[];
  getByEmployeeAndGeneratedDate(empleadoId: string, fechaGenerada: string): Compensacion | null;
  create(dto: CreateCompensacionDto): Compensacion;
  scheduleCompensation(
    id: string,
    fechaCompensacion?: string | null,
    observacion?: string,
    formaCompensacion?: FormaCompensacion
  ): Compensacion | null;
  markAsCompensated(id: string): Compensacion | null;
  annul(id: string, motivoAnulacion?: string): Compensacion | null;
  update(id: string, updates: Partial<Compensacion>): Compensacion | null;
  delete(id: string): boolean;
  bulkDelete(ids: string[]): number;
  bulkMarkAsCompensated(
    ids: string[],
    options?: {
      fechaCompensacion?: string | null;
      formaCompensacion?: FormaCompensacion;
      observacion?: string;
    }
  ): number;
  countByEmployee(empleadoId: string): number;
}

export class CompensationRepository implements ICompensationRepository {
  public getAll(): Compensacion[] {
    const list = db.getCompensations();
    // Ordenar cronológicamente descendente por fechaGenerada
    return [...list].sort((a, b) => (b.fechaGenerada || '').localeCompare(a.fechaGenerada || ''));
  }

  public getById(id: string): Compensacion | null {
    return this.getAll().find((c) => c.id === id) || null;
  }

  public getByEmployeeId(empleadoId: string): Compensacion[] {
    return this.getAll().filter((c) => c.empleadoId === empleadoId);
  }

  public getByEmployeeAndGeneratedDate(
    empleadoId: string,
    fechaGenerada: string
  ): Compensacion | null {
    return (
      this.getAll().find(
        (c) => c.empleadoId === empleadoId && c.fechaGenerada === fechaGenerada
      ) || null
    );
  }

  public create(dto: CreateCompensacionDto): Compensacion {
    const list = db.getCompensations();
    const now = new Date().toISOString();
    const formaCalculada = dto.formaCompensacion || 'DESCANSO';
    const estadoCalculado = dto.estado || (dto.fechaCompensacion || formaCalculada !== 'DESCANSO' ? 'COMPENSADO' : 'PENDIENTE');
    const newComp: Compensacion = {
      id: 'comp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      empleadoId: dto.empleadoId,
      fechaGenerada: dto.fechaGenerada,
      fechaCompensacion: formaCalculada !== 'DESCANSO' ? null : (dto.fechaCompensacion || null),
      estado: estadoCalculado,
      formaCompensacion: formaCalculada,
      observacion: (dto.observacion || '').trim(),
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newComp);
    db.saveCompensations(list);
    return newComp;
  }

  public scheduleCompensation(
    id: string,
    fechaCompensacion?: string | null,
    observacion?: string,
    formaCompensacion?: FormaCompensacion
  ): Compensacion | null {
    const list = db.getCompensations();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const forma = formaCompensacion || 'DESCANSO';
    const isPaid = forma === 'REMUNERACION' || forma === 'LIQUIDACION';

    const updated: Compensacion = {
      ...existing,
      fechaCompensacion: isPaid ? null : (fechaCompensacion ? fechaCompensacion.trim() : null),
      formaCompensacion: forma,
      estado: isPaid ? 'COMPENSADO' : 'PROGRAMADO',
      observacion:
        observacion !== undefined ? observacion.trim() : existing.observacion,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveCompensations(list);
    return updated;
  }

  public markAsCompensated(id: string): Compensacion | null {
    const list = db.getCompensations();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: Compensacion = {
      ...existing,
      estado: 'COMPENSADO',
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveCompensations(list);
    return updated;
  }

  public annul(id: string, motivoAnulacion?: string): Compensacion | null {
    const list = db.getCompensations();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: Compensacion = {
      ...existing,
      estado: 'ANULADO',
      motivoAnulacion: (motivoAnulacion || 'Anulado manualmente').trim(),
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveCompensations(list);
    return updated;
  }

  public update(id: string, updates: Partial<Compensacion>): Compensacion | null {
    const list = db.getCompensations();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: Compensacion = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveCompensations(list);
    return updated;
  }

  public delete(id: string): boolean {
    const list = db.getCompensations();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length === list.length) return false;
    db.saveCompensations(filtered);
    db.deleteCompensationRemote(id);
    return true;
  }

  public bulkDelete(ids: string[]): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const list = db.getCompensations();
    const filtered = list.filter((c) => !idSet.has(c.id));
    const deletedCount = list.length - filtered.length;
    if (deletedCount > 0) {
      db.saveCompensations(filtered);
      db.deleteCompensationsRemote(ids);
    }
    return deletedCount;
  }

  public bulkMarkAsCompensated(
    ids: string[],
    options?: {
      fechaCompensacion?: string | null;
      formaCompensacion?: FormaCompensacion;
      observacion?: string;
    }
  ): number {
    if (!ids || ids.length === 0) return 0;
    const idSet = new Set(ids);
    const list = db.getCompensations();
    const forma = options?.formaCompensacion || 'DESCANSO';
    const isPaid = forma === 'REMUNERACION' || forma === 'LIQUIDACION';
    const compDate = isPaid ? null : (options?.fechaCompensacion ? options.fechaCompensacion.trim() : null);
    const now = new Date().toISOString();
    let updatedCount = 0;

    for (let i = 0; i < list.length; i++) {
      if (idSet.has(list[i].id)) {
        const item = list[i];
        let obs = item.observacion || '';
        if (options?.observacion && options.observacion.trim()) {
          obs = obs ? `${obs} | ${options.observacion.trim()}` : options.observacion.trim();
        }

        list[i] = {
          ...item,
          estado: 'COMPENSADO',
          formaCompensacion: forma,
          fechaCompensacion: compDate || (isPaid ? null : item.fechaCompensacion) || null,
          observacion: obs,
          updatedAt: now
        };
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      db.saveCompensations(list);
    }
    return updatedCount;
  }

  public countByEmployee(empleadoId: string): number {
    return this.getByEmployeeId(empleadoId).length;
  }
}

export const compensationRepository = new CompensationRepository();
