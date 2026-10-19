import {
  Compensacion,
  CompensacionConEmpleado,
  CreateCompensacionDto,
  EstadoCompensacion,
  FormaCompensacion,
  ProgramarCompensacionDto,
  AnularCompensacionDto,
  ResumenCompensacionesEmpleado,
  ApiResponse,
  FilterOptions
} from '../types';
import { compensationRepository, employeeRepository } from '../storage';
import { CompensationValidator } from '../validators';
import { parseDateString, formatDateDisplay } from '../utils/dateUtils';

export class CompensationService {
  public getAll(filters?: FilterOptions): CompensacionConEmpleado[] {
    const compensations = compensationRepository.getAll();
    const employees = employeeRepository.getAll();
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    let list: CompensacionConEmpleado[] = compensations.map((c) => ({
      ...c,
      empleado: employeeMap.get(c.empleadoId)
    }));

    if (!filters) return list;

    // Filtro de texto (nombre, código, documento, área o cargo)
    if (filters.search && filters.search.trim() !== '') {
      const words = filters.search.toLowerCase().trim().split(/\s+/);
      list = list.filter((c) => {
        if (!c.empleado) return false;
        const haystack = `${c.empleado.codigo} ${c.empleado.documentoIdentidad} ${c.empleado.apellidosNombres} ${c.empleado.area} ${c.empleado.cargo} ${c.fechaGenerada} ${c.fechaCompensacion || ''}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }

    // Filtro por Estado
    if (filters.estado && filters.estado !== 'TODOS') {
      list = list.filter((c) => c.estado === filters.estado);
    }

    // Filtro por Año (de la fecha generada)
    if (filters.year && !isNaN(filters.year) && filters.year > 0) {
      const yearStr = filters.year.toString();
      list = list.filter((c) => Boolean(c.fechaGenerada && c.fechaGenerada.startsWith(yearStr)));
    }

    // Filtro por Mes
    if (filters.month && !isNaN(filters.month) && filters.month > 0) {
      const monthStr = filters.month.toString().padStart(2, '0');
      list = list.filter((c) => {
        if (!c.fechaGenerada) return false;
        const parts = c.fechaGenerada.split('-');
        return parts.length >= 2 && parts[1] === monthStr;
      });
    }

    // Filtro por Área del empleado
    if (filters.area && filters.area !== 'TODOS') {
      list = list.filter(
        (c) => c.empleado?.area && c.empleado.area.toUpperCase() === filters.area?.toUpperCase()
      );
    }

    return list;
  }

  public getById(id: string): CompensacionConEmpleado | null {
    const comp = compensationRepository.getById(id);
    if (!comp) return null;
    const employee = employeeRepository.getById(comp.empleadoId);
    return {
      ...comp,
      empleado: employee || undefined
    };
  }

  public getByEmployee(
    empleadoId: string,
    filters?: { year?: number; estado?: string; searchDate?: string }
  ): Compensacion[] {
    let list = compensationRepository.getByEmployeeId(empleadoId);

    if (filters?.year && !isNaN(filters.year) && filters.year > 0) {
      const yearStr = filters.year.toString();
      list = list.filter(
        (c) =>
          Boolean(c.fechaGenerada && c.fechaGenerada.startsWith(yearStr)) ||
          Boolean(c.fechaCompensacion && c.fechaCompensacion.startsWith(yearStr))
      );
    }

    if (filters?.estado && filters.estado !== 'TODOS') {
      list = list.filter((c) => c.estado === filters.estado);
    }

    if (filters?.searchDate && filters.searchDate.trim() !== '') {
      const term = filters.searchDate.trim();
      list = list.filter(
        (c) =>
          Boolean(c.fechaGenerada && c.fechaGenerada.includes(term)) ||
          Boolean(c.fechaCompensacion && c.fechaCompensacion.includes(term))
      );
    }

    return list;
  }

  public getEmployeeSummary(empleadoId: string): ResumenCompensacionesEmpleado {
    const list = compensationRepository.getByEmployeeId(empleadoId);

    return {
      totalGenerados: list.length,
      pendientes: list.filter((c) => c.estado === 'PENDIENTE').length,
      programados: list.filter((c) => c.estado === 'PROGRAMADO').length,
      compensados: list.filter((c) => c.estado === 'COMPENSADO').length,
      anulados: list.filter((c) => c.estado === 'ANULADO').length
    };
  }

  /**
   * 4. REGISTRAR DÍA PENDIENTE
   * Inicialmente: Estado = PENDIENTE, FechaCompensacion = NULL
   */
  public registerPendingDay(dto: CreateCompensacionDto): ApiResponse<Compensacion> {
    const existing = compensationRepository.getAll();
    const validation = CompensationValidator.validateCreate(dto, existing);

    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    // Verificar que el empleado exista
    const employee = employeeRepository.getById(dto.empleadoId);
    if (!employee) {
      return {
        success: false,
        error: 'El empleado seleccionado no existe en el sistema.'
      };
    }

    const created = compensationRepository.create(dto);
    return {
      success: true,
      data: created
    };
  }

  /**
   * 5. PROGRAMAR COMPENSACIÓN
   * Asigna FechaCompensacion y pasa a estado PROGRAMADO
   */
  public scheduleCompensation(
    id: string,
    dto: ProgramarCompensacionDto
  ): ApiResponse<Compensacion> {
    const comp = compensationRepository.getById(id);
    if (!comp) {
      return { success: false, error: 'Registro de compensación no encontrado.' };
    }

    const employeeComps = compensationRepository.getByEmployeeId(comp.empleadoId);
    const validation = CompensationValidator.validateSchedule(dto, comp, employeeComps);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    const updated = compensationRepository.scheduleCompensation(
      id,
      dto.fechaCompensacion,
      dto.observacion,
      dto.formaCompensacion
    );

    if (!updated) {
      return { success: false, error: 'No se pudo guardar la fecha de compensación.' };
    }

    return {
      success: true,
      data: updated
    };
  }

  /**
   * Marcar compensación como efectivamente realizada (Pasa a COMPENSADO)
   */
  public markAsCompensated(id: string): ApiResponse<Compensacion> {
    const comp = compensationRepository.getById(id);
    if (!comp) {
      return { success: false, error: 'Registro de compensación no encontrado.' };
    }

    const validation = CompensationValidator.validateMarkAsCompensated(comp);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    const updated = compensationRepository.markAsCompensated(id);
    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el estado.' };
    }

    return {
      success: true,
      data: updated
    };
  }

  /**
   * Anular compensación
   */
  public annulCompensation(
    id: string,
    dto: AnularCompensacionDto
  ): ApiResponse<Compensacion> {
    const comp = compensationRepository.getById(id);
    if (!comp) {
      return { success: false, error: 'Registro no encontrado.' };
    }

    if (comp.estado === 'ANULADO') {
      return { success: false, error: 'El registro ya se encuentra anulado.' };
    }

    const updated = compensationRepository.annul(id, dto.motivoAnulacion);
    if (!updated) {
      return { success: false, error: 'No se pudo anular la compensación.' };
    }

    return {
      success: true,
      data: updated
    };
  }

  /**
   * Modificar cualquier campo de una compensación (fecha generada, compensación, estado, observación)
   */
  public update(id: string, dto: import('../types').UpdateCompensacionDto): ApiResponse<Compensacion> {
    const comp = compensationRepository.getById(id);
    if (!comp) {
      return { success: false, error: 'Registro de compensación no encontrado.' };
    }

    const employeeComps = compensationRepository.getByEmployeeId(comp.empleadoId);
    const validation = CompensationValidator.validateUpdate(dto, comp, employeeComps);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    const updated = compensationRepository.update(id, {
      ...(dto.fechaGenerada ? { fechaGenerada: dto.fechaGenerada } : {}),
      ...(dto.fechaCompensacion !== undefined ? { fechaCompensacion: dto.fechaCompensacion } : {}),
      ...(dto.estado ? { estado: dto.estado } : {}),
      ...(dto.formaCompensacion !== undefined ? { formaCompensacion: dto.formaCompensacion } : {}),
      ...(dto.observacion !== undefined ? { observacion: dto.observacion.trim() } : {}),
      ...(dto.motivoAnulacion !== undefined ? { motivoAnulacion: dto.motivoAnulacion } : {})
    });

    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el registro.' };
    }

    return {
      success: true,
      data: updated
    };
  }

  /**
   * Eliminar permanentemente una compensación
   */
  public delete(id: string): ApiResponse<boolean> {
    const comp = compensationRepository.getById(id);
    if (!comp) {
      return { success: false, error: 'Registro no encontrado o ya eliminado.' };
    }

    const ok = compensationRepository.delete(id);
    if (!ok) {
      return { success: false, error: 'No se pudo eliminar el registro.' };
    }

    return {
      success: true,
      data: true
    };
  }

  /**
   * Eliminar múltiples registros de compensación en un solo lote
   */
  public bulkDelete(ids: string[]): ApiResponse<{ deletedCount: number }> {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'No se especificaron registros para eliminar.' };
    }

    const deletedCount = compensationRepository.bulkDelete(ids);
    return {
      success: true,
      data: { deletedCount }
    };
  }

  /**
   * Marcar múltiples días de compensación como COMPENSADOS en lote
   */
  public bulkMarkAsCompensated(
    ids: string[],
    options?: {
      fechaCompensacion?: string | null;
      formaCompensacion?: FormaCompensacion;
      observacion?: string;
    }
  ): ApiResponse<{ updatedCount: number }> {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'No se seleccionó ningún registro para compensar.' };
    }

    const updatedCount = compensationRepository.bulkMarkAsCompensated(ids, options);
    return {
      success: true,
      data: { updatedCount }
    };
  }

  public getAvailableYears(): number[] {
    const compensations = compensationRepository.getAll();
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(2026);

    compensations.forEach((c) => {
      if (c.fechaGenerada && c.fechaGenerada.length >= 4) {
        const y = parseInt(c.fechaGenerada.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
      if (c.fechaCompensacion && c.fechaCompensacion.length >= 4) {
        const y = parseInt(c.fechaCompensacion.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }

  public bulkCreate(
    items: {
      identificadorTrabajador: string; // Codigo o DNI
      fechaGenerada: string;
      estado?: EstadoCompensacion;
      formaCompensacion?: FormaCompensacion;
      fechaCompensacion?: string | null;
      observacion?: string;
    }[]
  ): {
    success: boolean;
    importedCount: number;
    errors: string[];
  } {
    const employees = employeeRepository.getAll();
    const existing = [...compensationRepository.getAll()];
    const errors: string[] = [];
    let importedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      // 1. Buscar empleado por código o DNI
      const idTerm = (item.identificadorTrabajador || '').trim().toUpperCase();
      const emp = employees.find(
        (e) => e.codigo.toUpperCase() === idTerm || e.documentoIdentidad === idTerm
      );

      if (!emp) {
        errors.push(
          `Fila #${rowNum}: No se encontró ningún empleado con Código/DNI "${item.identificadorTrabajador}".`
        );
        continue;
      }

      // 2. Procesar fecha generada (permite blanco o '-' para registros históricos)
      let fechaGenerada = '';
      const rawGen = (item.fechaGenerada || '').trim().toUpperCase();
      const isBlankGen =
        !rawGen ||
        rawGen === '-' ||
        rawGen === '--' ||
        rawGen === 'S/F' ||
        rawGen === 'SIN FECHA' ||
        rawGen === 'N/A' ||
        rawGen === 'NA' ||
        rawGen === 'NULL' ||
        rawGen === 'SN' ||
        rawGen === 'NONE';

      if (!isBlankGen) {
        const parsed = parseDateString(item.fechaGenerada);
        if (parsed) {
          fechaGenerada = parsed;
        } else {
          // Si no se pudo parsear pero viene estado compensado o vacío, tratar como sin fecha
          if (item.estado === 'COMPENSADO') {
            fechaGenerada = '';
          } else {
            errors.push(`Fila #${rowNum}: Fecha trabajada "${item.fechaGenerada}" no válida. Use DD/MM/AAAA.`);
            continue;
          }
        }
      }

      let extraObs = item.observacion ? item.observacion.trim() : '';

      // 3. Validar fecha de compensación si se proporciona
      let compDate: string | null = null;
      const rawComp = (item.fechaCompensacion || '').trim().toUpperCase();
      const isBlankComp =
        !rawComp ||
        rawComp === '-' ||
        rawComp === '--' ||
        rawComp === 'S/F' ||
        rawComp === 'SIN FECHA' ||
        rawComp === 'N/A' ||
        rawComp === 'NA' ||
        rawComp === 'NULL' ||
        rawComp === 'PENDIENTE' ||
        rawComp === 'NO' ||
        rawComp === 'NONE';

      if (!isBlankComp) {
        const parsedComp = parseDateString(item.fechaCompensacion || '');
        if (parsedComp) {
          compDate = parsedComp;
        }
      }

      if (compDate) {
        // Regla A: El día generado no puede ser igual a la fecha de compensación
        if (fechaGenerada && compDate === fechaGenerada) {
          compDate = null;
          extraObs = extraObs
            ? `${extraObs} [Fecha compensada igual a jornada]`
            : `[Fecha compensada igual a jornada]`;
        }
      }

      // 4. Calcular estado y modalidad
      const formaCalculada = item.formaCompensacion || (compDate ? 'DESCANSO' : undefined);
      let estadoCalculado: EstadoCompensacion = item.estado || (compDate || (formaCalculada && formaCalculada !== 'DESCANSO') ? 'COMPENSADO' : 'PENDIENTE');
      if (!fechaGenerada && !compDate && !item.estado) {
        estadoCalculado = 'COMPENSADO';
      }

      // 5. Regla de duplicidad o actualización de pendientes a COMPENSADO
      if (fechaGenerada) {
        const duplicate = existing.find(
          (c) =>
            c.empleadoId === emp.id &&
            c.fechaGenerada === fechaGenerada &&
            c.estado !== 'ANULADO'
        );

        if (duplicate) {
          // Si el existente es PENDIENTE / PROGRAMADO o la fila entrante actualiza a COMPENSADO:
          if (
            duplicate.estado === 'PENDIENTE' ||
            duplicate.estado === 'PROGRAMADO' ||
            estadoCalculado === 'COMPENSADO' ||
            compDate
          ) {
            let updatedObs = duplicate.observacion || '';
            if (extraObs) {
              updatedObs = updatedObs ? `${updatedObs} | ${extraObs}` : extraObs;
            }

            compensationRepository.update(duplicate.id, {
              estado: estadoCalculado,
              fechaCompensacion: compDate || (formaCalculada && formaCalculada !== 'DESCANSO' ? null : duplicate.fechaCompensacion),
              formaCompensacion: formaCalculada || duplicate.formaCompensacion || 'DESCANSO',
              observacion: updatedObs
            });

            duplicate.estado = estadoCalculado;
            if (compDate) duplicate.fechaCompensacion = compDate;
            if (formaCalculada) duplicate.formaCompensacion = formaCalculada;
            duplicate.observacion = updatedObs;
            importedCount++;
            continue;
          } else {
            // Ya estaba compensado
            importedCount++;
            continue;
          }
        }
      }

      const created = compensationRepository.create({
        empleadoId: emp.id,
        fechaGenerada: fechaGenerada,
        fechaCompensacion: compDate || null,
        formaCompensacion: formaCalculada,
        estado: estadoCalculado,
        observacion: extraObs
      });

      existing.unshift(created);
      importedCount++;
    }

    return {
      success: importedCount > 0,
      importedCount,
      errors
    };
  }
}

export const compensationService = new CompensationService();


