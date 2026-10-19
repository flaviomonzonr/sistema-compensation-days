import { Empleado, Feriado, Compensacion, AprobadorPermiso } from '../types';
import { INITIAL_HOLIDAYS_2026, INITIAL_EMPLOYEES, INITIAL_COMPENSATIONS, INITIAL_APPROVERS } from './seedData';
import { dexieDb } from './dexieDb';
import { parseDateString } from '../utils/dateUtils';
import { SupabaseService } from './supabaseService';
import { isSupabaseConfigured } from './supabaseClient';


const STORAGE_KEYS = {
  EMPLOYEES: 'mf_empleados_v2',
  HOLIDAYS: 'mf_feriados_v2',
  COMPENSATIONS: 'mf_compensaciones_v2',
  APPROVERS: 'mf_aprobadores_v1',
  INITIALIZED: 'adp_db_initialized_flag_v3',
  CLEARED_BY_USER: 'adp_db_cleared_flag_v1',
  MIGRATED_TO_DEXIE: 'mf_migrated_to_dexie_v1',
  WIPED_FLAG: 'adpmodul_wiped_flag'
} as const;

type ChangeListener = () => void;

class DatabaseDriver {
  private listeners: Set<ChangeListener> = new Set();
  private employeesCache: Empleado[] = [];
  private holidaysCache: Feriado[] = [];
  private compensationsCache: Compensacion[] = [];
  private approversCache: AprobadorPermiso[] = [];
  private isLoaded: boolean = false;
  private isSyncingCloud: boolean = false;
  private supabaseUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initDatabase();
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  public isCloudConnected(): boolean {
    return isSupabaseConfigured();
  }

  public isCloudSyncing(): boolean {
    return this.isSyncingCloud;
  }

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error executing db change listener:', err);
      }
    });
  }

  private sanitizeCompensations(list: Compensacion[]): Compensacion[] {
    return list.map((c) => ({
      ...c,
      fechaGenerada: parseDateString(c.fechaGenerada) || c.fechaGenerada,
      fechaCompensacion: c.fechaCompensacion ? (parseDateString(c.fechaCompensacion) || c.fechaCompensacion) : null
    }));
  }

  private sanitizeEmployees(list: Empleado[]): Empleado[] {
    return list.map((e) => ({
      ...e,
      area: e.area ? e.area.replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO').trim() : (e.area || 'GENERAL'),
      fechaIngreso: parseDateString(e.fechaIngreso) || e.fechaIngreso,
      fechaCese: e.fechaCese ? (parseDateString(e.fechaCese) || e.fechaCese) : null
    }));
  }

  private sanitizeHolidays(list: Feriado[]): Feriado[] {
    return list.map((h) => ({
      ...h,
      fecha: parseDateString(h.fecha) || h.fecha
    }));
  }

  private async initDatabase(): Promise<void> {
    try {
      // 0. MODO SUPABASE DIRECTO: Si Supabase está configurado, trabaja directamente con la nube
      if (SupabaseService.isAvailable()) {
        try {
          await this.syncWithSupabase();
          this.setupSupabaseRealtime();
          this.isLoaded = true;
          this.notify();
          return;
        } catch (cloudErr) {
          console.warn('Advertencia al cargar datos directos de Supabase:', cloudErr);
        }
      }

      // 1. Cargar Aprobadores
      let rawApps: AprobadorPermiso[] = [];
      try {
        rawApps = await dexieDb.aprobadores.toArray();
      } catch (_) {}

      if (rawApps.length === 0) {
        rawApps = [...INITIAL_APPROVERS];
        try {
          await dexieDb.aprobadores.bulkPut(INITIAL_APPROVERS);
        } catch (_) {}
      } else {
        for (const initApp of INITIAL_APPROVERS) {
          if (!rawApps.some((a) => a.id === initApp.id || a.nombreCompleto.toUpperCase() === initApp.nombreCompleto.toUpperCase())) {
            rawApps.push(initApp);
            try {
              await dexieDb.aprobadores.put(initApp);
            } catch (_) {}
          }
        }
      }
      this.approversCache = rawApps;

      // 2. Comprobación de Sincronización Limpia del Reporte Real
      const EXACT_SYNC_VERSION = 'v_adpmodul_exact_clean_2026_10_08_v15';
      const isSynced = typeof localStorage !== 'undefined' && localStorage.getItem('adp_exact_sync') === EXACT_SYNC_VERSION;


      if (!isSynced && INITIAL_COMPENSATIONS.length > 0) {
        try {
          await dexieDb.empleados.clear();
          await dexieDb.empleados.bulkPut(INITIAL_EMPLOYEES);

          await dexieDb.compensaciones.clear();
          await dexieDb.compensaciones.bulkPut(INITIAL_COMPENSATIONS);

          await dexieDb.feriados.clear();
          await dexieDb.feriados.bulkPut(INITIAL_HOLIDAYS_2026);

          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('adp_exact_sync', EXACT_SYNC_VERSION);
          }
          console.info(`✅ Base de datos sincronizada con ${INITIAL_COMPENSATIONS.length} compensaciones y ${INITIAL_EMPLOYEES.length} trabajadores.`);
        } catch (syncErr) {
          console.warn('Error en sincronización limpia de reporte:', syncErr);
        }
      }

      // 3. Cargar feriados
      let rawHols = await dexieDb.feriados.toArray();
      if (rawHols.length === 0) {
        rawHols = [...INITIAL_HOLIDAYS_2026];
        await dexieDb.feriados.bulkPut(INITIAL_HOLIDAYS_2026);
      }
      this.holidaysCache = this.sanitizeHolidays(rawHols);

      // 4. Cargar Empleados y Compensaciones
      const rawEmps = await dexieDb.empleados.toArray();
      const rawComps = await dexieDb.compensaciones.toArray();

      this.employeesCache = this.sanitizeEmployees(rawEmps.length > 0 ? rawEmps : INITIAL_EMPLOYEES);
      this.compensationsCache = this.sanitizeCompensations(rawComps.length > 0 ? rawComps : INITIAL_COMPENSATIONS);

      this.isLoaded = true;
      this.notify();

      // Intento de sincronización con Supabase si está activo
      this.checkAndInitCloud();
    } catch (e) {
      console.warn('Dexie IndexedDB initialization error, fallback to memory cache:', e);
      // Fallback to seed data in memory
      if (this.employeesCache.length === 0) {
        this.employeesCache = [...INITIAL_EMPLOYEES];
        this.holidaysCache = [...INITIAL_HOLIDAYS_2026];
        this.compensationsCache = [...INITIAL_COMPENSATIONS];
        this.approversCache = [...INITIAL_APPROVERS];
      }
      this.isLoaded = true;
      this.notify();

      this.checkAndInitCloud();
    }
  }

  // --- INTEGRACIÓN SUPABASE / CLOUD ---

  private async checkAndInitCloud(): Promise<void> {
    if (!SupabaseService.isAvailable()) return;

    try {
      await this.syncWithSupabase();
      this.setupSupabaseRealtime();
    } catch (err) {
      console.warn('Advertencia al sincronizar con Supabase durante inicio:', err);
    }
  }

  public async syncWithSupabase(): Promise<void> {
    if (!SupabaseService.isAvailable()) return;

    this.isSyncingCloud = true;
    try {
      const [remEmps, remHols, remComps, remApps] = await Promise.all([
        SupabaseService.fetchEmployees(),
        SupabaseService.fetchHolidays(),
        SupabaseService.fetchCompensations(),
        SupabaseService.fetchApprovers()
      ]);

      // Supabase es la fuente de verdad exclusiva: adoptamos su estado actual
      if (remEmps !== null) {
        this.employeesCache = this.sanitizeEmployees(remEmps);
      }
      if (remHols !== null) {
        this.holidaysCache = this.sanitizeHolidays(remHols.length > 0 ? remHols : INITIAL_HOLIDAYS_2026);
      }
      if (remComps !== null) {
        this.compensationsCache = this.sanitizeCompensations(remComps);
      }
      if (remApps !== null) {
        this.approversCache = remApps.length > 0 ? remApps : INITIAL_APPROVERS;
      }

      this.notify();
    } catch (err) {
      console.error('Error durante la sincronización con Supabase:', err);
    } finally {
      this.isSyncingCloud = false;
      this.notify();
    }
  }

  private setupSupabaseRealtime(): void {
    if (this.supabaseUnsubscribe) {
      this.supabaseUnsubscribe();
      this.supabaseUnsubscribe = null;
    }

    const unsub = SupabaseService.subscribeToAllChanges(async () => {
      console.info('Cambio remoto detectado en Supabase, sincronizando estado local...');
      await this.syncWithSupabase();
    });

    if (unsub) {
      this.supabaseUnsubscribe = unsub;
    }
  }

  public async pushAllToSupabase(): Promise<{ success: boolean; message?: string }> {
    return SupabaseService.uploadAllLocalDataToSupabase(
      this.employeesCache,
      this.holidaysCache,
      this.compensationsCache,
      this.approversCache
    );
  }

  public deleteEmployeeRemote(id: string): void {
    if (SupabaseService.isAvailable()) {
      SupabaseService.deleteEmployee(id).catch((err) => console.error('Error eliminando empleado en Supabase:', err));
    }
  }

  public deleteHolidayRemote(id: string): void {
    if (SupabaseService.isAvailable()) {
      SupabaseService.deleteHoliday(id).catch((err) => console.error('Error eliminando feriado en Supabase:', err));
    }
  }

  public deleteCompensationRemote(id: string): void {
    if (SupabaseService.isAvailable()) {
      SupabaseService.deleteCompensation(id).catch((err) => console.error('Error eliminando compensación en Supabase:', err));
    }
  }

  public deleteCompensationsRemote(ids: string[]): void {
    if (SupabaseService.isAvailable() && ids.length > 0) {
      SupabaseService.deleteCompensations(ids).catch((err) => console.error('Error eliminando compensaciones en Supabase:', err));
    }
  }

  public deleteApproverRemote(id: string): void {
    if (SupabaseService.isAvailable()) {
      SupabaseService.deleteApprover(id).catch((err) => console.error('Error eliminando aprobador en Supabase:', err));
    }
  }

  // --- PERSISTENCIA LOCAL ---

  private async persistAllToDexie(
    emps: Empleado[],
    hols: Feriado[],
    comps: Compensacion[],
    apps: AprobadorPermiso[] = this.approversCache
  ): Promise<void> {
    try {
      await dexieDb.transaction('rw', dexieDb.empleados, dexieDb.feriados, dexieDb.compensaciones, dexieDb.aprobadores, async () => {
        await dexieDb.empleados.clear();
        await dexieDb.empleados.bulkPut(emps);

        await dexieDb.feriados.clear();
        await dexieDb.feriados.bulkPut(hols);

        await dexieDb.compensaciones.clear();
        await dexieDb.compensaciones.bulkPut(comps);

        await dexieDb.aprobadores.clear();
        await dexieDb.aprobadores.bulkPut(apps.length > 0 ? apps : INITIAL_APPROVERS);
      });
    } catch (err) {
      console.error('Error in persistAllToDexie:', err);
    }
  }

  public async loadSampleData(): Promise<void> {
    try {
      this.employeesCache = [...INITIAL_EMPLOYEES];
      this.holidaysCache = [...INITIAL_HOLIDAYS_2026];
      this.compensationsCache = [...INITIAL_COMPENSATIONS];

      await this.persistAllToDexie(
        INITIAL_EMPLOYEES,
        INITIAL_HOLIDAYS_2026,
        INITIAL_COMPENSATIONS
      );
      this.notify();

      if (SupabaseService.isAvailable()) {
        this.pushAllToSupabase().catch(() => {});
      }
    } catch (e) {
      console.error('Error loading sample data:', e);
      this.notify();
    }
  }

  public async resetToDefaults(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.CLEARED_BY_USER);
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      }

      this.employeesCache = [...INITIAL_EMPLOYEES];
      this.holidaysCache = [...INITIAL_HOLIDAYS_2026];
      this.compensationsCache = [...INITIAL_COMPENSATIONS];

      await this.persistAllToDexie(
        INITIAL_EMPLOYEES,
        INITIAL_HOLIDAYS_2026,
        INITIAL_COMPENSATIONS
      );

      try {
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
        localStorage.removeItem(STORAGE_KEYS.COMPENSATIONS);
        localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
        localStorage.removeItem(STORAGE_KEYS.MIGRATED_TO_DEXIE);
      } catch (_) {}

      this.notify();

      if (SupabaseService.isAvailable()) {
        this.pushAllToSupabase().catch(() => {});
      }
    } catch (e) {
      console.error('Error resetting database to defaults:', e);
      this.notify();
    }
  }

  public async clearAllData(keepHolidays = true): Promise<void> {
    try {
      this.employeesCache = [];
      this.compensationsCache = [];
      if (!keepHolidays) {
        this.holidaysCache = [];
      } else {
        this.holidaysCache = [...INITIAL_HOLIDAYS_2026];
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CLEARED_BY_USER, 'true');
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
        localStorage.removeItem(STORAGE_KEYS.COMPENSATIONS);
        if (!keepHolidays) {
          localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
        }
      }

      await this.persistAllToDexie(
        [],
        this.holidaysCache,
        []
      );

      // Limpiar también en Supabase si está conectado
      if (SupabaseService.isAvailable()) {
        await SupabaseService.clearRemoteCompensationsAndEmployees();
      }

      this.notify();
    } catch (e) {
      console.error('Error clearing data:', e);
      this.notify();
    }
  }

  // --- Empleados ---
  public getEmployees(): Empleado[] {
    return this.employeesCache.map((e) => ({
      ...e,
      area: e.area ? e.area.replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO').trim() : (e.area || 'GENERAL')
    }));
  }

  public saveEmployees(employees: Empleado[]): void {
    const sanitized = this.sanitizeEmployees(employees);
    this.employeesCache = sanitized;
    this.notify();

    // Async persist to Dexie (IndexedDB)
    dexieDb.empleados.clear()
      .then(() => dexieDb.empleados.bulkPut(sanitized))
      .catch((err) => console.error('Error saving employees to Dexie:', err));

    // Async persist to Supabase
    if (SupabaseService.isAvailable()) {
      SupabaseService.upsertEmployees(sanitized)
        .catch((err) => console.error('Error saving employees to Supabase:', err));
    }
  }

  // --- Feriados ---
  public getHolidays(): Feriado[] {
    return this.holidaysCache;
  }

  public saveHolidays(holidays: Feriado[]): void {
    this.holidaysCache = holidays;
    this.notify();

    // Async persist to Dexie (IndexedDB)
    dexieDb.feriados.clear()
      .then(() => dexieDb.feriados.bulkPut(holidays))
      .catch((err) => console.error('Error saving holidays to Dexie:', err));

    // Async persist to Supabase
    if (SupabaseService.isAvailable()) {
      SupabaseService.upsertHolidays(holidays)
        .catch((err) => console.error('Error saving holidays to Supabase:', err));
    }
  }

  // --- Compensaciones ---
  public getCompensations(): Compensacion[] {
    return this.compensationsCache;
  }

  public saveCompensations(compensations: Compensacion[]): void {
    this.compensationsCache = compensations;
    this.notify();

    // Async persist to Dexie (IndexedDB)
    dexieDb.compensaciones.clear()
      .then(() => dexieDb.compensaciones.bulkPut(compensations))
      .catch((err) => console.error('Error saving compensations to Dexie:', err));

    // Async persist to Supabase
    if (SupabaseService.isAvailable()) {
      SupabaseService.upsertCompensations(compensations)
        .catch((err) => console.error('Error saving compensations to Supabase:', err));
    }
  }

  // --- Aprobadores de Permisos ---
  public getApprovers(): AprobadorPermiso[] {
    return this.approversCache.length > 0 ? this.approversCache : INITIAL_APPROVERS;
  }

  public saveApprovers(approvers: AprobadorPermiso[]): void {
    this.approversCache = approvers;
    this.notify();

    // Async persist to Dexie (IndexedDB)
    dexieDb.aprobadores.clear()
      .then(() => dexieDb.aprobadores.bulkPut(approvers))
      .catch((err) => console.error('Error saving approvers to Dexie:', err));

    // Async persist to Supabase
    if (SupabaseService.isAvailable()) {
      SupabaseService.upsertApprovers(approvers)
        .catch((err) => console.error('Error saving approvers to Supabase:', err));
    }
  }

  // --- Respaldo y Restauración Masiva ---
  public exportBackup(): string {
    return JSON.stringify(
      {
        version: '2.0',
        engine: 'Dexie (IndexedDB) + Supabase Cloud',
        exportedAt: new Date().toISOString(),
        employees: this.getEmployees(),
        holidays: this.getHolidays(),
        compensations: this.getCompensations()
      },
      null,
      2
    );
  }

  public importBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (
        !Array.isArray(data.employees) ||
        !Array.isArray(data.holidays) ||
        !Array.isArray(data.compensations)
      ) {
        return {
          success: false,
          error: 'El archivo JSON no tiene la estructura requerida (employees, holidays, compensations).'
        };
      }

      this.employeesCache = data.employees;
      this.holidaysCache = data.holidays;
      this.compensationsCache = data.compensations;

      this.persistAllToDexie(data.employees, data.holidays, data.compensations)
        .then(() => this.notify())
        .catch((err) => console.error('Error importing backup to Dexie:', err));

      if (SupabaseService.isAvailable()) {
        this.pushAllToSupabase().catch(() => {});
      }

      this.notify();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Formato JSON inválido: ' + (e?.message || '') };
    }
  }
}

export const db = new DatabaseDriver();
