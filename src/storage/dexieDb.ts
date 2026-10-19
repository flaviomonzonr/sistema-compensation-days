import Dexie, { type Table } from 'dexie';
import { Empleado, Feriado, Compensacion, AprobadorPermiso } from '../types';

export class ADPmodulDatabase extends Dexie {
  empleados!: Table<Empleado, string>;
  feriados!: Table<Feriado, string>;
  compensaciones!: Table<Compensacion, string>;
  aprobadores!: Table<AprobadorPermiso, string>;

  constructor() {
    super('ADPmodulDB');
    this.version(1).stores({
      empleados: 'id, codigo, documentoIdentidad, apellidosNombres, area, cargo, estado, tipoTrabajador',
      feriados: 'id, fecha, estado',
      compensaciones: 'id, empleadoId, fechaGenerada, [empleadoId+fechaGenerada], estado, fechaCompensacion'
    });
    this.version(2).stores({
      empleados: 'id, codigo, documentoIdentidad, apellidosNombres, area, cargo, estado, tipoTrabajador',
      feriados: 'id, fecha, estado',
      compensaciones: 'id, empleadoId, fechaGenerada, [empleadoId+fechaGenerada], estado, fechaCompensacion',
      aprobadores: 'id, nombreCompleto, cargo, area, estado'
    });
  }
}

export const dexieDb = new ADPmodulDatabase();
