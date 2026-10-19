/**
 * Utilidades para normalizar, limpiar y filtrar observaciones de compensaciones.
 * Evita que textos técnicos generados por scripts de carga masiva (ej. "plantilla_carga_masiva_compensaciones.xlsx")
 * o nombres de archivos Excel aparezcan en la Hoja Oficial de Permiso / Formato de Impresión o en las vistas.
 */

/**
 * Determina si una observación proviene de un artefacto técnico de carga masiva, archivo Excel o frase genérica redundante.
 */
export function isImportArtifactObservation(obs?: string | null): boolean {
  if (!obs) return true;
  const trimmed = obs.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return true;

  const lower = trimmed.toLowerCase();

  // 1. Archivos o extensiones de Excel / CSV / Carga masiva
  if (
    lower.includes('.xlsx') ||
    lower.includes('.xls') ||
    lower.includes('.csv') ||
    lower.includes('plantilla_') ||
    lower.includes('plantilla masiva') ||
    lower.includes('carga_masiva') ||
    lower.includes('carga masiva') ||
    lower.includes('datos compensaciones') ||
    lower.includes('datos compesaciones') ||
    lower.includes('compensaciones_automatizado') ||
    lower.includes('reporte_compensaciones')
  ) {
    return true;
  }

  // 2. Patrones automáticos generados por scripts de carga (ej: "Compensación (nombre_archivo)", "Compensación (NOMBRE)", "Compensación v2 (...)", "Valdez (...)")
  if (/^compensaci[oó]n\s*(\(.*\))?$/i.test(trimmed)) {
    return true;
  }
  if (/^compensaci[oó]n\s*v\d+/i.test(trimmed)) {
    return true;
  }
  if (/^valdez\s*\(.*\)$/i.test(trimmed)) {
    return true;
  }
  if (/^plantilla\s*masiva/i.test(trimmed)) {
    return true;
  }

  // 3. Frases genéricas redundantes
  if (
    lower === 'compensación de día trabajado' ||
    lower === 'compensacion de dia trabajado' ||
    lower === 'compensación de descanso' ||
    lower === 'compensacion de descanso' ||
    lower === 'día trabajado' ||
    lower === 'dia trabajado' ||
    lower === 'compensado' ||
    lower === 'pendiente' ||
    lower === 'descanso' ||
    lower === 'turno' ||
    lower === 'feriado'
  ) {
    return true;
  }

  return false;
}

/**
 * Limpia y filtra la observación para el FORMATO DE IMPRESIÓN (Hoja de Permiso Oficial Chavín).
 * Retorna cadena vacía "" si es un artefacto técnico o redundante, o el motivo legítimo si existe (ej. "APOYO EN COSECHA").
 */
export function cleanObservationForPrint(obs?: string | null): string {
  if (!obs || isImportArtifactObservation(obs)) {
    return '';
  }
  return obs.trim();
}

/**
 * Formatea la observación para mostrar en tablas y listas del sistema.
 * Si es un artefacto técnico de archivo, muestra "-" en lugar del nombre del archivo Excel.
 */
export function formatObservationForDisplay(obs?: string | null): string {
  if (!obs || isImportArtifactObservation(obs)) {
    return '-';
  }
  return obs.trim();
}
