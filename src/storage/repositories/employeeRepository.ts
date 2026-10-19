import { Empleado, CreateEmpleadoDto, UpdateEmpleadoDto } from '../../types';
import { db } from '../db';

export interface IEmployeeRepository {
  getAll(): Empleado[];
  getById(id: string): Empleado | null;
  getByCodigo(codigo: string): Empleado | null;
  getByDocumento(doc: string): Empleado | null;
  create(dto: CreateEmpleadoDto): Empleado;
  update(id: string, dto: UpdateEmpleadoDto): Empleado | null;
  changeState(id: string, estado: 'ACTIVO' | 'CESADO'): Empleado | null;
  delete(id: string): boolean;
}

export class EmployeeRepository implements IEmployeeRepository {
  public getAll(): Empleado[] {
    return db.getEmployees();
  }

  public getById(id: string): Empleado | null {
    const list = this.getAll();
    return list.find((e) => e.id === id) || null;
  }

  public getByCodigo(codigo: string): Empleado | null {
    const list = this.getAll();
    return list.find((e) => e.codigo.toUpperCase() === codigo.trim().toUpperCase()) || null;
  }

  public getByDocumento(doc: string): Empleado | null {
    const list = this.getAll();
    return list.find((e) => e.documentoIdentidad === doc.trim()) || null;
  }

  public create(dto: CreateEmpleadoDto): Empleado {
    const list = this.getAll();
    const now = new Date().toISOString();
    const initialDates = dto.fechasIngreso && dto.fechasIngreso.length > 0 ? dto.fechasIngreso : [dto.fechaIngreso];
    const newEmployee: Empleado = {
      id: 'emp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      codigo: dto.codigo.trim().toUpperCase(),
      apellidosNombres: dto.apellidosNombres.trim().toUpperCase(),
      documentoIdentidad: dto.documentoIdentidad.trim(),
      fechaIngreso: dto.fechaIngreso,
      fechaCese: dto.fechaCese || null,
      fechasIngreso: initialDates,
      tipoTrabajador: dto.tipoTrabajador.trim().toUpperCase(),
      categoria: dto.categoria ? dto.categoria.trim().toUpperCase() : '',
      area: dto.area.trim().toUpperCase(),
      cargo: dto.cargo.trim().toUpperCase(),
      estado: dto.estado || 'ACTIVO',
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newEmployee);
    db.saveEmployees(list);
    return newEmployee;
  }

  public update(id: string, dto: UpdateEmpleadoDto): Empleado | null {
    const list = this.getAll();
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const existing = list[index];
    let updatedFechas = dto.fechasIngreso
      ? [...dto.fechasIngreso]
      : (existing.fechasIngreso && existing.fechasIngreso.length > 0 ? [...existing.fechasIngreso] : [existing.fechaIngreso]);

    if (dto.fechaIngreso && !updatedFechas.includes(dto.fechaIngreso)) {
      updatedFechas.push(dto.fechaIngreso);
      updatedFechas.sort((a, b) => a.localeCompare(b));
    }

    const updated: Empleado = {
      ...existing,
      ...(dto.codigo ? { codigo: dto.codigo.trim().toUpperCase() } : {}),
      ...(dto.apellidosNombres ? { apellidosNombres: dto.apellidosNombres.trim().toUpperCase() } : {}),
      ...(dto.documentoIdentidad ? { documentoIdentidad: dto.documentoIdentidad.trim() } : {}),
      ...(dto.fechaIngreso ? { fechaIngreso: dto.fechaIngreso } : {}),
      ...('fechaCese' in dto ? { fechaCese: dto.fechaCese || null } : {}),
      fechasIngreso: updatedFechas,
      ...(dto.tipoTrabajador ? { tipoTrabajador: dto.tipoTrabajador.trim().toUpperCase() } : {}),
      ...('categoria' in dto ? { categoria: dto.categoria ? dto.categoria.trim().toUpperCase() : '' } : {}),
      ...(dto.area ? { area: dto.area.trim().toUpperCase() } : {}),
      ...(dto.cargo ? { cargo: dto.cargo.trim().toUpperCase() } : {}),
      ...(dto.estado ? { estado: dto.estado } : {}),
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveEmployees(list);
    return updated;
  }

  public addEntryDate(id: string, newDate: string, reactivateIfCesado: boolean = true): Empleado | null {
    const list = this.getAll();
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const emp = list[index];
    const existingDates = emp.fechasIngreso && emp.fechasIngreso.length > 0 ? [...emp.fechasIngreso] : [emp.fechaIngreso];

    if (!existingDates.includes(newDate)) {
      existingDates.push(newDate);
      existingDates.sort((a, b) => a.localeCompare(b));
    }

    const latestDate = existingDates[existingDates.length - 1];

    const updated: Empleado = {
      ...emp,
      fechaIngreso: latestDate,
      fechasIngreso: existingDates,
      ...(reactivateIfCesado ? { estado: 'ACTIVO', fechaCese: null } : {}),
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    db.saveEmployees(list);
    return updated;
  }

  public changeState(id: string, estado: 'ACTIVO' | 'CESADO'): Empleado | null {
    return this.update(id, { estado });
  }

  public delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return false;
    db.saveEmployees(filtered);
    db.deleteEmployeeRemote(id);
    return true;
  }
}

export const employeeRepository = new EmployeeRepository();
