/**
 * Smart Date Utilities with Full Excel Serial Date & Multi-Format Support (DD/MM/YYYY standard)
 */

/**
 * Converts an Excel serial date number (e.g. 46233 -> 2026-07-30) to YYYY-MM-DD
 * Excel serial date counts days since 1899-12-30 (taking into account the 1900 leap year bug).
 */
export const excelSerialToDateString = (serial: number): string | null => {
  if (isNaN(serial) || serial < 1 || serial > 2958465) return null; // Range 1900 to 9999
  
  // Excel base epoch: 1970-01-01 is serial 25569
  // 86400000 ms per day
  const utcMilliseconds = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(utcMilliseconds);
  
  if (isNaN(date.getTime())) return null;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Universal smart date parser.
 * Always normalizes to ISO 'YYYY-MM-DD'.
 * 
 * Supports:
 * - Excel serial numbers: 46233, "46233", "46233.0"
 * - DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, DD.MM.YYYY (e.g. 23/07/2026, 5/8/2026, 08/09/2024)
 * - 2-digit years: DD/MM/YY (e.g. 9/8/24 -> 2024-08-09, 28/4/25 -> 2025-04-28, 11/17/23 -> 2023-11-17, 4/28/25 -> 2025-04-28)
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD (e.g. 2026-07-23)
 * - Timestamps: "23/07/2026 07:02:30", "2026-07-23T14:30:00.000Z"
 * - Compact YYYYMMDD: "20260723"
 * - Handles non-date placeholders: "-", "--", "N/A", "null", "SN" -> returns ""
 */
export const parseDateString = (val?: string | number | Date | null): string => {
  if (val === undefined || val === null) return '';

  // If a JS Date object is passed
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let str = String(val).trim().replace(/^['\"`]+|['\"`]+$/g, '');
  if (!str) return '';

  // Non-date placeholders to ignore
  const upper = str.toUpperCase();
  if (
    upper === '-' ||
    upper === '--' ||
    upper === 'N/A' ||
    upper === 'NA' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === 'SN' ||
    upper === 'S/F' ||
    upper === 'SIN FECHA' ||
    upper === 'NO' ||
    upper === 'NONE'
  ) {
    return '';
  }

  // 1. Check if it's an Excel serial date number (e.g. 45480, "46233", "46233.0")
  const num = Number(str);
  if (!isNaN(num) && num >= 1000 && num <= 100000) {
    const fromSerial = excelSerialToDateString(num);
    if (fromSerial) return fromSerial;
  }

  // 2. Extract clean date portion if it has time attached (e.g. "23/07/2026 07:02:30" or "2026-07-23T...")
  const cleanDatePart = str.split(/[T\s]/)[0].trim();
  if (!cleanDatePart) return '';

  // 3. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = cleanDatePart.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. Match 3 segments separated by / , - or . (e.g. 28/04/2025, 08/09/2024, 4/28/25, 9/8/24, 11/17/23)
  const threePartMatch = cleanDatePart.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (threePartMatch) {
    const [, p1, p2, p3] = threePartMatch;
    const num1 = parseInt(p1, 10);
    const num2 = parseInt(p2, 10);
    let num3 = parseInt(p3, 10);

    // Normalize 2-digit year to 4-digit year (e.g. 24 -> 2024, 25 -> 2025, 23 -> 2023, 99 -> 1999)
    if (p3.length === 2 || num3 < 100) {
      num3 = num3 >= 50 ? 1900 + num3 : 2000 + num3;
    }

    let day = num1;
    let month = num2;

    // Intelligent disambiguation:
    // If num1 > 12 and num2 <= 12: num1 MUST be Day, num2 MUST be Month (e.g. 28/04/2025)
    // If num2 > 12 and num1 <= 12: num2 MUST be Day, num1 MUST be Month (e.g. 04/28/2025 from US Excel)
    // If both <= 12 (e.g. 08/09/2024 or 9/8/24): Standard Latin America / Peru format is DD/MM/YYYY (num1 = Day, num2 = Month)
    if (num1 > 12 && num2 <= 12) {
      day = num1;
      month = num2;
    } else if (num2 > 12 && num1 <= 12) {
      day = num2;
      month = num1;
    } else {
      // Default Peruvian standard: DD/MM/YYYY
      day = num1;
      month = num2;
    }

    if (num3 >= 1900 && num3 <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${num3}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 5. Compact YYYYMMDD (8 digits)
  const compactMatch = cleanDatePart.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // If already standard ISO YYYY-MM-DD
  if (cleanDatePart.match(/^\d{4}\-\d{2}\-\d{2}$/)) {
    return cleanDatePart;
  }

  return '';
};

/**
 * Universal display formatter: Formats any date string (or Excel serial) to DD/MM/YYYY.
 * Returns '-' if value is null, undefined, empty, or unparseable.
 */
export const formatDateDisplay = (dateStr?: string | number | Date | null): string => {
  if (dateStr === undefined || dateStr === null) return '-';
  const str = String(dateStr).trim();
  if (!str || str === '-' || str === '--') return '-';

  // If already pure DD/MM/YYYY (4-digit year)
  if (str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)) {
    return str;
  }

  // Parse with universal parser
  const parsed = parseDateString(dateStr);
  if (parsed && parsed.match(/^\d{4}\-\d{2}\-\d{2}$/)) {
    const [y, m, d] = parsed.split('-');
    return `${d}/${m}/${y}`;
  }

  return '-';
};

