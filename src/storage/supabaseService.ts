import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Empleado, Feriado, Compensacion, AprobadorPermiso, FormaCompensacion } from '../types';

// ============================================================================
// MAPEADORES (CamelCase <-> SnakeCase)
// ============================================================================

export const mapEmployeeToDb = (e: Empleado) => ({
  id: e.id,
  codigo: e.codigo,
  apellidos_nombres: e.apellidosNombres,
  documento_identidad: e.documentoIdentidad,
  fecha_ingreso: e.fechaIngreso,
  fecha_cese: e.fechaCese || null,
  tipo_trabajador: e.tipoTrabajador,
  categoria: e.categoria || null,
  area: e.area,
  cargo: e.cargo,
  estado: e.estado,
  created_at: e.createdAt,
  updated_at: e.updatedAt
});

export const mapEmployeeFromDb = (row: any): Empleado => ({
  id: row.id,
  codigo: row.codigo,
  apellidosNombres: row.apellidos_nombres,
  documentoIdentidad: row.documento_identidad,
  fechaIngreso: row.fecha_ingreso,
  fechaCese: row.fecha_cese || null,
  tipoTrabajador: row.tipo_trabajador,
  categoria: row.categoria || '',
  area: row.area,
  cargo: row.cargo,
  estado: row.estado,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const mapHolidayToDb = (h: Feriado) => ({
  id: h.id,
  fecha: h.fecha,
  descripcion: h.descripcion,
  estado: h.estado,
  created_at: h.createdAt,
  updated_at: h.updatedAt
});

export const mapHolidayFromDb = (row: any): Feriado => ({
  id: row.id,
  fecha: row.fecha,
  descripcion: row.descripcion,
  estado: row.estado,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const mapCompensationToDb = (c: Compensacion) => {
  let obs = c.observacion || '';
  if (c.formaCompensacion === 'REMUNERACION' && !obs.includes('[Pago en Remuneración]')) {
    obs = obs ? `[Pago en Remuneración] ${obs}` : '[Pago en Remuneración]';
  } else if (c.formaCompensacion === 'LIQUIDACION' && !obs.includes('[Liquidación de Beneficios]')) {
    obs = obs ? `[Liquidación de Beneficios] ${obs}` : '[Liquidación de Beneficios]';
  }

  return {
    id: c.id,
    empleado_id: c.empleadoId,
    fecha_generada: c.fechaGenerada,
    fecha_compensacion: c.fechaCompensacion || null,
    estado: c.estado,
    observacion: obs,
    motivo_anulacion: c.motivoAnulacion || null,
    created_at: c.createdAt,
    updated_at: c.updatedAt
  };
};

export const mapCompensationFromDb = (row: any): Compensacion => {
  let forma: FormaCompensacion = 'DESCANSO';
  const obsUpper = (row.observacion || '').toUpperCase();
  if (row.forma_compensacion) {
    forma = row.forma_compensacion;
  } else if (obsUpper.includes('REMUNERACION') || obsUpper.includes('REMUNERACIÓN')) {
    forma = 'REMUNERACION';
  } else if (obsUpper.includes('LIQUIDACION') || obsUpper.includes('LIQUIDACIÓN')) {
    forma = 'LIQUIDACION';
  }

  return {
    id: row.id,
    empleadoId: row.empleado_id,
    fechaGenerada: row.fecha_generada,
    fechaCompensacion: row.fecha_compensacion || null,
    estado: row.estado,
    formaCompensacion: forma,
    observacion: row.observacion || '',
    motivoAnulacion: row.motivo_anulacion || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export const mapApproverToDb = (a: AprobadorPermiso) => ({
  id: a.id,
  nombre_completo: a.nombreCompleto,
  cargo: a.cargo,
  area: a.area,
  documento_identidad: a.documentoIdentidad || null,
  estado: a.estado,
  created_at: a.createdAt,
  updated_at: a.updatedAt
});

export const mapApproverFromDb = (row: any): AprobadorPermiso => ({
  id: row.id,
  nombreCompleto: row.nombre_completo,
  cargo: row.cargo,
  area: row.area,
  documentoIdentidad: row.documento_identidad || undefined,
  estado: row.estado,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// ============================================================================
// SERVICIO DE ACCESO A SUPABASE
// ============================================================================

export class SupabaseService {
  public static isAvailable(): boolean {
    return isSupabaseConfigured() && supabase !== null;
  }

  // --- OBTENER DATOS REMOTOS ---

  public static async fetchEmployees(): Promise<Empleado[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!.from('empleados').select('*').order('apellidos_nombres', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapEmployeeFromDb);
    } catch (err) {
      console.warn('Error fetching empleados from Supabase:', err);
      return null;
    }
  }

  public static async fetchHolidays(): Promise<Feriado[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!.from('feriados').select('*').order('fecha', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapHolidayFromDb);
    } catch (err) {
      console.warn('Error fetching feriados from Supabase:', err);
      return null;
    }
  }

  public static async fetchCompensations(): Promise<Compensacion[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!.from('compensaciones').select('*').order('fecha_generada', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapCompensationFromDb);
    } catch (err) {
      console.warn('Error fetching compensaciones from Supabase:', err);
      return null;
    }
  }

  public static async fetchApprovers(): Promise<AprobadorPermiso[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!.from('aprobadores').select('*').order('nombre_completo', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapApproverFromDb);
    } catch (err) {
      console.warn('Error fetching aprobadores from Supabase:', err);
      return null;
    }
  }

  // --- GUARDADO / PERSISTENCIA ---

  public static async upsertEmployees(employees: Empleado[]): Promise<boolean> {
    if (!this.isAvailable() || employees.length === 0) return false;
    try {
      const payload = employees.map(mapEmployeeToDb);
      const { error } = await supabase!.from('empleados').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error upserting empleados in Supabase:', err);
      return false;
    }
  }

  public static async deleteEmployee(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('empleados').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting empleado in Supabase:', err);
      return false;
    }
  }

  public static async upsertHolidays(holidays: Feriado[]): Promise<boolean> {
    if (!this.isAvailable() || holidays.length === 0) return false;
    try {
      const payload = holidays.map(mapHolidayToDb);
      const { error } = await supabase!.from('feriados').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error upserting feriados in Supabase:', err);
      return false;
    }
  }

  public static async deleteHoliday(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('feriados').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting feriado in Supabase:', err);
      return false;
    }
  }

  public static async upsertCompensations(compensations: Compensacion[]): Promise<boolean> {
    if (!this.isAvailable() || compensations.length === 0) return false;
    try {
      const payload = compensations.map(mapCompensationToDb);
      const { error } = await supabase!.from('compensaciones').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error upserting compensaciones in Supabase:', err);
      return false;
    }
  }

  public static async deleteCompensation(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('compensaciones').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting compensacion in Supabase:', err);
      return false;
    }
  }

  public static async deleteCompensations(ids: string[]): Promise<boolean> {
    if (!this.isAvailable() || ids.length === 0) return false;
    try {
      const { error } = await supabase!.from('compensaciones').delete().in('id', ids);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error batch deleting compensaciones in Supabase:', err);
      return false;
    }
  }

  public static async upsertApprovers(approvers: AprobadorPermiso[]): Promise<boolean> {
    if (!this.isAvailable() || approvers.length === 0) return false;
    try {
      const payload = approvers.map(mapApproverToDb);
      const { error } = await supabase!.from('aprobadores').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error upserting aprobadores in Supabase:', err);
      return false;
    }
  }

  public static async deleteApprover(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('aprobadores').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting aprobador in Supabase:', err);
      return false;
    }
  }

  public static async clearRemoteCompensationsAndEmployees(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      // 1. Primero compensaciones (por la clave foránea que referencia a empleados)
      await supabase!.from('compensaciones').delete().neq('id', '___NEVER___');
      // 2. Luego empleados
      await supabase!.from('empleados').delete().neq('id', '___NEVER___');
      return true;
    } catch (err) {
      console.error('Error limpiando compensaciones y empleados en Supabase:', err);
      return false;
    }
  }

  // --- SINCRONIZACIÓN EN TIEMPO REAL ---

  public static subscribeToAllChanges(onRemoteChange: () => void): (() => void) | null {
    if (!this.isAvailable()) return null;

    try {
      const channel = supabase!
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'empleados' },
          () => onRemoteChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feriados' },
          () => onRemoteChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'compensaciones' },
          () => onRemoteChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'aprobadores' },
          () => onRemoteChange()
        )
        .subscribe();

      return () => {
        supabase!.removeChannel(channel);
      };
    } catch (err) {
      console.warn('No se pudo establecer suscripción Realtime con Supabase:', err);
      return null;
    }
  }

  // --- MIGRACIÓN: SUBIR TODOS LOS DATOS LOCALES A SUPABASE ---

  public static async uploadAllLocalDataToSupabase(
    employees: Empleado[],
    holidays: Feriado[],
    compensations: Compensacion[],
    approvers: AprobadorPermiso[]
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.isAvailable()) {
      return { success: false, message: 'Supabase no está configurado o no hay conexión.' };
    }

    try {
      // 1. Primero empleados (para respetar las claves foráneas de compensaciones)
      if (employees.length > 0) {
        const { error: empErr } = await supabase!.from('empleados').upsert(employees.map(mapEmployeeToDb), { onConflict: 'id' });
        if (empErr) throw new Error('Error al subir empleados: ' + empErr.message);
      }

      // 2. Feriados
      if (holidays.length > 0) {
        const { error: holErr } = await supabase!.from('feriados').upsert(holidays.map(mapHolidayToDb), { onConflict: 'id' });
        if (holErr) throw new Error('Error al subir feriados: ' + holErr.message);
      }

      // 3. Compensaciones
      if (compensations.length > 0) {
        const { error: compErr } = await supabase!.from('compensaciones').upsert(compensations.map(mapCompensationToDb), { onConflict: 'id' });
        if (compErr) throw new Error('Error al subir compensaciones: ' + compErr.message);
      }

      // 4. Aprobadores
      if (approvers.length > 0) {
        const { error: appErr } = await supabase!.from('aprobadores').upsert(approvers.map(mapApproverToDb), { onConflict: 'id' });
        if (appErr) throw new Error('Error al subir aprobadores: ' + appErr.message);
      }

      return { success: true };
    } catch (e: any) {
      console.error('Error migrando datos a Supabase:', e);
      return { success: false, message: e?.message || 'Error desconocido al sincronizar con Supabase' };
    }
  }
}
