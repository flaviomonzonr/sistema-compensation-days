import { Compensacion, CreateCompensacionDto, ProgramarCompensacionDto, UpdateCompensacionDto } from '../types';
import { ValidationResult } from './employeeValidator';

export class CompensationValidator {
  /**
   * Valida la creación de un nuevo día trabajado generador de compensación
   */
  static validateCreate(
    dto: CreateCompensacionDto,
    existingCompensations: Compensacion[] = []
  ): ValidationResult {
    const errors: Record<string, string> = {};

    // 1. Empleado obligatorio
    if (!dto.empleadoId || dto.empleadoId.trim() === '') {
      errors.empleadoId = 'Debe seleccionar un trabajador.';
    }

    // 2. Fecha generada obligatoria (a menos que sea registro compensado histórico sin fecha)
    if (!dto.fechaGenerada && dto.estado !== 'COMPENSADO') {
      errors.fechaGenerada = 'La fecha trabajada que genera compensación es obligatoria.';
    } else if (dto.fechaGenerada) {
      const parsedDate = new Date(dto.fechaGenerada);
      if (isNaN(parsedDate.getTime())) {
        errors.fechaGenerada = 'La fecha generada no tiene un formato válido.';
      }
    }

    // 3. Regla Fundamental: No permitir duplicar el mismo día generado con fecha activa para el mismo empleado
    if (dto.empleadoId && dto.fechaGenerada && dto.fechaGenerada.trim() !== '' && Object.keys(errors).length === 0) {
      const duplicateActive = existingCompensations.find(
        (c) =>
          c.empleadoId === dto.empleadoId &&
          c.fechaGenerada === dto.fechaGenerada &&
          c.estado !== 'ANULADO'
      );

      if (duplicateActive) {
        errors.fechaGenerada = `El trabajador ya tiene registrado un día de compensación para la fecha ${dto.fechaGenerada} con estado ${duplicateActive.estado}. No se permite duplicar días activos.`;
      }
    }

    // 4. Si se incluye fechaCompensacion en la creación
    if (dto.fechaCompensacion && dto.fechaCompensacion.trim() !== '' && Object.keys(errors).length === 0) {
      // Regla A: El día generado no puede ser igual a la fecha de compensación
      if (dto.fechaCompensacion === dto.fechaGenerada) {
        errors.fechaCompensacion = `La fecha de compensación (descanso) no puede ser igual al día generado trabajado (${dto.fechaGenerada}).`;
      } else {
        // Regla B: Unicidad de fecha de compensación por trabajador
        const duplicateComp = existingCompensations.find(
          (c) =>
            c.empleadoId === dto.empleadoId &&
            c.fechaCompensacion === dto.fechaCompensacion &&
            c.estado !== 'ANULADO'
        );
        if (duplicateComp) {
          errors.fechaCompensacion = `El trabajador ya tiene una compensación asignada para la fecha ${dto.fechaCompensacion} (${duplicateComp.estado}). No se pueden registrar dos compensaciones en la misma fecha para el mismo trabajador.`;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Valida la asignación o reprogramación de una fecha de compensación (Paso a PROGRAMADO)
   */
  static validateSchedule(
    dto: ProgramarCompensacionDto,
    compensation: Compensacion,
    existingEmployeeCompensations: Compensacion[] = []
  ): ValidationResult {
    const errors: Record<string, string> = {};

    // 1. No permitir compensar un registro ANULADO
    if (compensation.estado === 'ANULADO') {
      errors.general = 'No se puede programar ni compensar un registro que ha sido ANULADO.';
      return { isValid: false, errors };
    }

    // 2. No permitir reprogramar directamente si ya está COMPENSADO
    if (compensation.estado === 'COMPENSADO') {
      errors.general = 'Este día ya ha sido efectivamente COMPENSADO y no puede ser reprogramado directamente.';
      return { isValid: false, errors };
    }

    const isPaid = dto.formaCompensacion === 'REMUNERACION' || dto.formaCompensacion === 'LIQUIDACION';

    // 2. Fecha de compensación obligatoria y válida solo para descanso
    if (!isPaid) {
      if (!dto.fechaCompensacion || dto.fechaCompensacion.trim() === '') {
        errors.fechaCompensacion = 'Debe indicar la fecha en que será compensado.';
      } else {
        const parsedDate = new Date(dto.fechaCompensacion);
        if (isNaN(parsedDate.getTime())) {
          errors.fechaCompensacion = 'La fecha de compensación no es válida.';
        }
      }

      if (Object.keys(errors).length === 0 && dto.fechaCompensacion) {
        // 3. Regla A: El día generado NO puede ser igual a la fecha de compensación
        if (dto.fechaCompensacion === compensation.fechaGenerada) {
          errors.fechaCompensacion = `El día generado trabajado (${compensation.fechaGenerada}) no puede ser igual a la fecha de compensación (${dto.fechaCompensacion}). Debe elegir una fecha de descanso diferente.`;
        }

        // 4. Regla B: NO puede haber 2 fechas de compensación iguales en la lista por trabajador
        const duplicateComp = existingEmployeeCompensations.find(
          (c) =>
            c.id !== compensation.id &&
            c.empleadoId === compensation.empleadoId &&
            c.fechaCompensacion === dto.fechaCompensacion &&
            c.estado !== 'ANULADO'
        );

        if (duplicateComp) {
          errors.fechaCompensacion = `El trabajador ya tiene una compensación asignada para el ${dto.fechaCompensacion} (${duplicateComp.estado}). No se permiten dos compensaciones en la misma fecha para el mismo trabajador.`;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Valida la modificación general de una compensación
   */
  static validateUpdate(
    dto: UpdateCompensacionDto,
    compensation: Compensacion,
    existingEmployeeCompensations: Compensacion[] = []
  ): ValidationResult {
    const errors: Record<string, string> = {};

    const effectiveGenerada = dto.fechaGenerada || compensation.fechaGenerada;
    const effectiveCompensacion =
      dto.fechaCompensacion !== undefined ? dto.fechaCompensacion : compensation.fechaCompensacion;
    const effectiveEstado = dto.estado || compensation.estado;

    // 1. Fecha generada obligatoria (salvo compensado histórico)
    if (!effectiveGenerada && effectiveEstado !== 'COMPENSADO') {
      errors.fechaGenerada = 'La fecha trabajada es obligatoria.';
    }

    // 2. No duplicar fecha generada activa para el mismo trabajador
    if (dto.fechaGenerada && dto.fechaGenerada.trim() !== '' && dto.fechaGenerada !== compensation.fechaGenerada && effectiveEstado !== 'ANULADO') {
      const duplicateGen = existingEmployeeCompensations.find(
        (c) =>
          c.id !== compensation.id &&
          c.fechaGenerada === dto.fechaGenerada &&
          c.estado !== 'ANULADO'
      );
      if (duplicateGen) {
        errors.fechaGenerada = `El trabajador ya tiene un registro activo para la fecha generada ${dto.fechaGenerada}.`;
      }
    }

    // 3. Regla PROGRAMADO exige fecha de compensación asignada
    if (effectiveEstado === 'PROGRAMADO' && !effectiveCompensacion) {
      errors.fechaCompensacion = `Un registro en estado PROGRAMADO debe tener una fecha de compensación asignada.`;
    }

    // 4. Regla ANULADO exige motivo
    if (effectiveEstado === 'ANULADO' && !dto.motivoAnulacion && !compensation.motivoAnulacion) {
      errors.motivoAnulacion = 'Debe ingresar un motivo de anulación.';
    }

    // 5. Regla A: El día generado no puede ser igual a la fecha de compensación
    if (effectiveGenerada && effectiveCompensacion && effectiveEstado !== 'ANULADO') {
      if (effectiveGenerada === effectiveCompensacion) {
        errors.fechaCompensacion = `El día generado trabajado (${effectiveGenerada}) no puede ser igual a la fecha de compensación (${effectiveCompensacion}).`;
      }
    }

    // 6. Regla B: No puede haber 2 fechas de compensación iguales en la lista del mismo trabajador
    if (effectiveCompensacion && effectiveEstado !== 'ANULADO') {
      const duplicateComp = existingEmployeeCompensations.find(
        (c) =>
          c.id !== compensation.id &&
          c.fechaCompensacion === effectiveCompensacion &&
          c.estado !== 'ANULADO'
      );
      if (duplicateComp) {
        errors.fechaCompensacion = `El trabajador ya tiene una compensación asignada para la fecha ${effectiveCompensacion} (${duplicateComp.estado}). No puede haber 2 fechas de compensación iguales para el mismo trabajador.`;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Valida la transición a COMPENSADO
   */
  static validateMarkAsCompensated(compensation: Compensacion): ValidationResult {
    const errors: Record<string, string> = {};

    if (compensation.estado === 'ANULADO') {
      errors.general = 'Un registro ANULADO no puede marcarse como compensado.';
    } else if (compensation.estado === 'PENDIENTE') {
      errors.general = 'Primero debe programar una fecha de compensación antes de marcarlo como compensado.';
    } else if (!compensation.fechaCompensacion) {
      errors.general = 'No existe una fecha de compensación asignada.';
    } else if (compensation.fechaCompensacion === compensation.fechaGenerada) {
      errors.general = `La fecha de compensación (${compensation.fechaCompensacion}) no puede ser igual al día generado trabajado (${compensation.fechaGenerada}).`;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

