import { Feriado, CreateFeriadoDto, UpdateFeriadoDto } from '../types';
import { ValidationResult } from './employeeValidator';

export class HolidayValidator {
  static validate(
    dto: CreateFeriadoDto | UpdateFeriadoDto,
    existingHolidays: Feriado[] = [],
    currentHolidayId?: string
  ): ValidationResult {
    const errors: Record<string, string> = {};

    // 1. Fecha obligatoria y con formato válido
    if (!dto.fecha) {
      errors.fecha = 'La fecha del feriado es obligatoria.';
    } else {
      const parsedDate = new Date(dto.fecha);
      if (isNaN(parsedDate.getTime())) {
        errors.fecha = 'La fecha ingresada no es válida.';
      } else {
        // Regla: No permitir registrar dos veces la misma fecha
        const duplicate = existingHolidays.find(
          (h) => h.fecha === dto.fecha && h.id !== currentHolidayId
        );
        if (duplicate) {
          errors.fecha = `Ya existe un feriado registrado para la fecha ${dto.fecha} ("${duplicate.descripcion}").`;
        }
      }
    }

    // 2. Descripción obligatoria
    if (!dto.descripcion || dto.descripcion.trim() === '') {
      errors.descripcion = 'La descripción del feriado es obligatoria.';
    } else if (dto.descripcion.trim().length < 3) {
      errors.descripcion = 'La descripción debe tener al menos 3 caracteres.';
    }

    // 3. Estado
    if (dto.estado && !['ACTIVO', 'INACTIVO'].includes(dto.estado)) {
      errors.estado = 'El estado debe ser ACTIVO o INACTIVO.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
