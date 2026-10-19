import {
  Empleado,
  CreateEmpleadoDto,
  UpdateEmpleadoDto,
  ApiResponse,
  FilterOptions,
  EstadoEmpleado
} from '../types';
import { employeeRepository, compensationRepository } from '../storage';
import { EmployeeValidator } from '../validators';

export class EmployeeService {
  public getAll(filters?: FilterOptions): Empleado[] {
    let list = employeeRepository.getAll();

    if (!filters) return list;

    // Filtro dinámico en tiempo real por texto (código, DNI, nombres)
    if (filters.search && filters.search.trim() !== '') {
      const words = filters.search.toLowerCase().trim().split(/\s+/);
      list = list.filter((e) => {
        const haystack = `${e.codigo || ''} ${e.documentoIdentidad || ''} ${e.apellidosNombres || ''} ${e.categoria || ''} ${e.area || ''} ${e.cargo || ''}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }

    // Filtro por Área
    if (filters.area && filters.area !== 'TODOS') {
      list = list.filter((e) => (e.area || '').toUpperCase() === filters.area?.toUpperCase());
    }

    // Filtro por Tipo de Trabajador
    if (filters.tipoTrabajador && filters.tipoTrabajador !== 'TODOS') {
      list = list.filter(
        (e) => (e.tipoTrabajador || '').toUpperCase() === filters.tipoTrabajador?.toUpperCase()
      );
    }

    // Filtro por Categoría
    if (filters.categoria && filters.categoria !== 'TODOS') {
      list = list.filter(
        (e) => (e.categoria || '').toUpperCase() === filters.categoria?.toUpperCase()
      );
    }

    // Filtro por Estado (ACTIVO / CESADO)
    if (filters.estado && filters.estado !== 'TODOS') {
      list = list.filter((e) => e.estado === filters.estado);
    }

    return list;
  }

  public getById(id: string): Empleado | null {
    return employeeRepository.getById(id);
  }

  public searchQuick(term: string): Empleado[] {
    if (!term || term.trim() === '') {
      return employeeRepository
        .getAll()
        .filter((e) => e.estado === 'ACTIVO')
        .slice(0, 10);
    }

    const words = term.toLowerCase().trim().split(/\s+/);
    return employeeRepository.getAll().filter((e) => {
      const haystack = `${e.codigo || ''} ${e.documentoIdentidad || ''} ${e.apellidosNombres || ''} ${e.categoria || ''} ${e.area || ''} ${e.cargo || ''}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }

  public create(dto: CreateEmpleadoDto): ApiResponse<Empleado> {
    const existing = employeeRepository.getAll();
    const validation = EmployeeValidator.validate(dto, existing);

    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    if (dto.area) {
      dto.area = dto.area.replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO').trim();
    }
    const created = employeeRepository.create(dto);
    return {
      success: true,
      data: created
    };
  }

  public update(id: string, dto: UpdateEmpleadoDto): ApiResponse<Empleado> {
    const existing = employeeRepository.getAll();
    const current = employeeRepository.getById(id);

    if (!current) {
      return { success: false, error: 'El empleado no existe.' };
    }

    const validation = EmployeeValidator.validate(dto, existing, id);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    if (dto.area) {
      dto.area = dto.area.replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO').trim();
    }
    const updated = employeeRepository.update(id, dto);
    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el empleado.' };
    }

    return {
      success: true,
      data: updated
    };
  }

  public changeStatus(id: string, estado: EstadoEmpleado): ApiResponse<Empleado> {
    const updated = employeeRepository.changeState(id, estado);
    if (!updated) {
      return { success: false, error: 'Empleado no encontrado.' };
    }
    return { success: true, data: updated };
  }

  public addEntryDate(id: string, newDate: string, reactivateIfCesado = true): ApiResponse<Empleado> {
    if (!newDate || !newDate.trim()) {
      return { success: false, error: 'Debe ingresar una fecha de ingreso válida.' };
    }
    const updated = employeeRepository.addEntryDate(id, newDate.trim(), reactivateIfCesado);
    if (!updated) {
      return { success: false, error: 'Empleado no encontrado.' };
    }
    return { success: true, data: updated };
  }

  public delete(id: string): ApiResponse<boolean> {
    // REGLA: No eliminar físicamente empleados que ya tengan registros históricos
    const count = compensationRepository.countByEmployee(id);
    if (count > 0) {
      return {
        success: false,
        error: `No se puede eliminar físicamente al empleado porque tiene ${count} registro(s) histórico(s) de compensación. En su lugar, cambie su estado a CESADO.`
      };
    }

    const deleted = employeeRepository.delete(id);
    if (!deleted) {
      return { success: false, error: 'No se pudo eliminar el registro.' };
    }

    return { success: true, data: true };
  }

  public getDistinctAreas(): string[] {
    const areas = new Set<string>();
    employeeRepository.getAll().forEach((e) => {
      if (e.area) areas.add(e.area);
    });
    return Array.from(areas).sort();
  }

  public getDistinctWorkerTypes(): string[] {
    const types = new Set<string>();
    employeeRepository.getAll().forEach((e) => {
      if (e.tipoTrabajador) types.add(e.tipoTrabajador);
    });
    return Array.from(types).sort();
  }

  public getDistinctCategories(): string[] {
    const categories = new Set<string>();
    employeeRepository.getAll().forEach((e) => {
      if (e.categoria) categories.add(e.categoria);
    });
    return Array.from(categories).sort();
  }

  public bulkCreate(employees: CreateEmpleadoDto[]): {
    success: boolean;
    importedCount: number;
    updatedCount: number;
    errors: string[];
  } {
    const existing = [...employeeRepository.getAll()];
    const errors: string[] = [];
    let importedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const dto = employees[i];
      const rowNum = i + 1;

      if (dto.area) {
        dto.area = dto.area.replace(/ASEGESURAMIENTO/gi, 'ASEGURAMIENTO').trim();
      }

      const normCode = dto.codigo ? dto.codigo.trim().toUpperCase() : '';
      const normDoc = dto.documentoIdentidad ? dto.documentoIdentidad.trim() : '';

      // Check if employee already exists in repository by codigo or documentoIdentidad
      const existingIndex = existing.findIndex(
        (e) => (normCode && e.codigo.toUpperCase() === normCode) || (normDoc && e.documentoIdentidad === normDoc)
      );

      if (existingIndex !== -1) {
        const currentEmp = existing[existingIndex];
        const validation = EmployeeValidator.validate(dto, existing, currentEmp.id);
        if (!validation.isValid) {
          const errorMsg = Object.values(validation.errors).join(', ');
          errors.push(`Fila #${rowNum} (${dto.codigo || 'Sin código'}): ${errorMsg}`);
          continue;
        }

        const updated = employeeRepository.update(currentEmp.id, dto);
        if (updated) {
          existing[existingIndex] = updated;
          updatedCount++;
        }
      } else {
        const validation = EmployeeValidator.validate(dto, existing);
        if (!validation.isValid) {
          const errorMsg = Object.values(validation.errors).join(', ');
          errors.push(`Fila #${rowNum} (${dto.codigo || 'Sin código'}): ${errorMsg}`);
          continue;
        }

        const created = employeeRepository.create(dto);
        existing.unshift(created);
        importedCount++;
      }
    }

    return {
      success: (importedCount + updatedCount) > 0,
      importedCount,
      updatedCount,
      errors
    };
  }
}

export const employeeService = new EmployeeService();
