import {
  Feriado,
  CreateFeriadoDto,
  UpdateFeriadoDto,
  ApiResponse,
  EstadoFeriado
} from '../types';
import { holidayRepository } from '../storage';
import { HolidayValidator } from '../validators';

export class HolidayService {
  public getAll(year?: number): Feriado[] {
    if (year && !isNaN(year)) {
      return holidayRepository.getByYear(year);
    }
    return holidayRepository.getAll();
  }

  public getById(id: string): Feriado | null {
    return holidayRepository.getById(id);
  }

  public getByDate(date: string): Feriado | null {
    return holidayRepository.getByFecha(date);
  }

  public create(dto: CreateFeriadoDto): ApiResponse<Feriado> {
    const existing = holidayRepository.getAll();
    const validation = HolidayValidator.validate(dto, existing);

    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    const created = holidayRepository.create(dto);
    return {
      success: true,
      data: created
    };
  }

  public update(id: string, dto: UpdateFeriadoDto): ApiResponse<Feriado> {
    const existing = holidayRepository.getAll();
    const current = holidayRepository.getById(id);

    if (!current) {
      return { success: false, error: 'El feriado no existe.' };
    }

    const validation = HolidayValidator.validate(dto, existing, id);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors)[0],
        errors: validation.errors
      };
    }

    const updated = holidayRepository.update(id, dto);
    if (!updated) {
      return { success: false, error: 'No se pudo actualizar el feriado.' };
    }

    return {
      success: true,
      data: updated
    };
  }

  public toggleStatus(id: string): ApiResponse<Feriado> {
    const holiday = holidayRepository.getById(id);
    if (!holiday) {
      return { success: false, error: 'Feriado no encontrado.' };
    }

    const nextStatus: EstadoFeriado = holiday.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const updated = holidayRepository.changeState(id, nextStatus);
    return {
      success: true,
      data: updated!
    };
  }

  public delete(id: string): ApiResponse<boolean> {
    const deleted = holidayRepository.delete(id);
    if (!deleted) {
      return { success: false, error: 'No se pudo eliminar el feriado.' };
    }
    return { success: true, data: true };
  }

  public getAvailableYears(): number[] {
    const holidays = holidayRepository.getAll();
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(2026); // Default peru seed year

    holidays.forEach((h) => {
      if (h.fecha && h.fecha.length >= 4) {
        const y = parseInt(h.fecha.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });

    return Array.from(years).sort((a, b) => a - b);
  }
}

export const holidayService = new HolidayService();
