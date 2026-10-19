import { Empleado, CreateEmpleadoDto, UpdateEmpleadoDto } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class EmployeeValidator {
  static validate(
    dto: CreateEmpleadoDto | UpdateEmpleadoDto,
    existingEmployees: Empleado[] = [],
    currentEmployeeId?: string
  ): ValidationResult {
    const errors: Record<string, string> = {};

    // 1. Código obligatorio y único
    if (!dto.codigo || dto.codigo.trim() === '') {
      errors.codigo = 'El código del trabajador es obligatorio.';
    } else {
      const normalizedCode = dto.codigo.trim().toUpperCase();
      const duplicateCode = existingEmployees.find(
        (e) => e.codigo.toUpperCase() === normalizedCode && e.id !== currentEmployeeId
      );
      if (duplicateCode) {
        errors.codigo = `El código "${dto.codigo}" ya está registrado por otro empleado (${duplicateCode.apellidosNombres}).`;
      }
    }

    // 2. Documento de identidad obligatorio y único
    if (!dto.documentoIdentidad || dto.documentoIdentidad.trim() === '') {
      errors.documentoIdentidad = 'El documento de identidad es obligatorio.';
    } else {
      const normalizedDoc = dto.documentoIdentidad.trim();
      const duplicateDoc = existingEmployees.find(
        (e) => e.documentoIdentidad === normalizedDoc && e.id !== currentEmployeeId
      );
      if (duplicateDoc) {
        errors.documentoIdentidad = `El documento "${dto.documentoIdentidad}" ya pertenece a ${duplicateDoc.apellidosNombres}.`;
      }
    }

    // 3. Nombres y apellidos obligatorios
    if (!dto.apellidosNombres || dto.apellidosNombres.trim() === '') {
      errors.apellidosNombres = 'Los apellidos y nombres son obligatorios.';
    } else if (dto.apellidosNombres.trim().length < 3) {
      errors.apellidosNombres = 'Ingrese al menos 3 caracteres para los apellidos y nombres.';
    }

    // 4. Fecha de ingreso válida y obligatoria
    if (!dto.fechaIngreso) {
      errors.fechaIngreso = 'La fecha de ingreso es obligatoria.';
    } else {
      const parsedDate = new Date(dto.fechaIngreso);
      if (isNaN(parsedDate.getTime())) {
        errors.fechaIngreso = 'La fecha de ingreso no tiene un formato válido.';
      }
    }

    // 5. Área y Cargo
    if (!dto.area || dto.area.trim() === '') {
      errors.area = 'El área es obligatoria.';
    }
    if (!dto.cargo || dto.cargo.trim() === '') {
      errors.cargo = 'El cargo es obligatorio.';
    }

    // 6. Estado y Fecha de Cese
    if (dto.estado && !['ACTIVO', 'CESADO'].includes(dto.estado)) {
      errors.estado = 'El estado debe ser ACTIVO o CESADO.';
    }

    if (dto.fechaCese) {
      const parsedCese = new Date(dto.fechaCese);
      if (isNaN(parsedCese.getTime())) {
        errors.fechaCese = 'La fecha de cese no tiene un formato válido.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
