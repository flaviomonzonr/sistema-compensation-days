import { Feriado, CreateFeriadoDto, UpdateFeriadoDto, EstadoFeriado } from '../../types';
import { db } from '../db';

export interface IHolidayRepository {
  getAll(): Feriado[];
  getById(id: string): Feriado | null;
  getByFecha(fecha: string): Feriado | null;
  getByYear(year: number): Feriado[];
  create(dto: CreateFeriadoDto): Feriado;
  update(id: string, dto: UpdateFeriadoDto): Feriado | null;
  changeState(id: string, estado: EstadoFeriado): Feriado | null;
  delete(id: string): boolean;
}

export class HolidayRepository implements IHolidayRepository {
  public getAll(): Feriado[] {
    const list = db.getHolidays();
    // Ordenar cronológicamente por fecha ascendente
    return [...list].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  public getById(id: string): Feriado | null {
    return this.getAll().find((h) => h.id === id) || null;
  }

  public getByFecha(fecha: string): Feriado | null {
    return this.getAll().find((h) => h.fecha === fecha) || null;
  }

  public getByYear(year: number): Feriado[] {
    const yearStr = year.toString();
    return this.getAll().filter((h) => h.fecha.startsWith(yearStr));
  }

  public create(dto: CreateFeriadoDto): Feriado {
    const list = db.getHolidays();
    const now = new Date().toISOString();
    const newHoliday: Feriado = {
      id: 'fer-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      fecha: dto.fecha,
      descripcion: dto.descripcion.trim(),
      estado: dto.estado || 'ACTIVO',
      createdAt: now,
      updatedAt: now
    };

    list.push(newHoliday);
    db.saveHolidays(list);
    return newHoliday;
  }

  public update(id: string, dto: UpdateFeriadoDto): Feriado | null {
    const list = db.getHolidays();
    const index = list.findIndex((h) => h.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: Feriado = {
      ...existing,
      ...(dto.fecha ? { fecha: dto.fecha } : {}),
      ...(dto.descripcion ? { descripcion: dto.descripcion.trim() } : {}),
      ...(dto.estado ? { estado: dto.estado } : {}),
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveHolidays(list);
    return updated;
  }

  public changeState(id: string, estado: EstadoFeriado): Feriado | null {
    return this.update(id, { estado });
  }

  public delete(id: string): boolean {
    const list = db.getHolidays();
    const filtered = list.filter((h) => h.id !== id);
    if (filtered.length === list.length) return false;
    db.saveHolidays(filtered);
    db.deleteHolidayRemote(id);
    return true;
  }
}

export const holidayRepository = new HolidayRepository();
