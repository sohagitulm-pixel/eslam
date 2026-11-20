import { BodyFontOption, HeadingFontOption, Language } from '../types/birthday';

const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function normalizeAsciiDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(EASTERN_ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Sanitizes free-form user input for age (accepts empty string or 1..120).
 */
export function sanitizeAgeInput(raw: string): string {
  const ascii = normalizeAsciiDigits(raw).replace(/[^0-9]/g, '');
  if (!ascii) return '';
  const num = parseInt(ascii, 10);
  if (Number.isNaN(num) || num <= 0) return '';
  return String(Math.min(120, num));
}

/**
 * Validates and parses age as an integer between 1 and 120.
 * Returns null if empty, zero, negative, or non-numeric.
 */
export function parseValidAge(age?: string | null): number | null {
  if (!age || !age.trim()) return null;
  const normalized = normalizeAsciiDigits(age).trim();
  const num = parseInt(normalized, 10);
  if (Number.isNaN(num) || num < 1 || num > 120) return null;
  return num;
}

/**
 * Formats an integer or numeric age string into English or Eastern Arabic numerals.
 */
export function formatAgeNumber(age: number | string, lang: Language): string {
  const str = normalizeAsciiDigits(String(age)).replace(/[^0-9]/g, '');
  if (!str) return '';
  if (lang === 'ar') {
    return str.replace(/[0-9]/g, (d) => EASTERN_ARABIC_DIGITS[Number(d)] || d);
  }
  return str;
}

export function formatOrdinalAgeLabel(ageNum: number, lang: Language): string {
  const formatted = formatAgeNumber(ageNum, lang);
  if (lang === 'ar') {
    return `العام ${formatted}`;
  }
  const mod100 = ageNum % 100;
  let suffix = 'th';
  if (mod100 < 11 || mod100 > 13) {
    if (ageNum % 10 === 1) suffix = 'st';
    else if (ageNum % 10 === 2) suffix = 'nd';
    else if (ageNum % 10 === 3) suffix = 'rd';
  }
  return `${formatted}${suffix} Birthday`;
}

export function getHeadingFontFamily(
  option?: HeadingFontOption,
  lang: Language = 'en'
): string {
  if (lang === 'ar') {
    if (option === 'jakarta') return "'Cairo', 'Plus Jakarta Sans', sans-serif";
    return "'Cairo', 'Cormorant Garamond', Georgia, serif";
  }
  switch (option) {
    case 'playfair':
      return "'Playfair Display', 'Cairo', Georgia, serif";
    case 'jakarta':
      return "'Plus Jakarta Sans', 'Cairo', sans-serif";
    case 'cormorant':
    default:
      return "'Cormorant Garamond', 'Cairo', Georgia, serif";
  }
}

export function getBodyFontFamily(
  option?: BodyFontOption,
  lang: Language = 'en'
): string {
  if (lang === 'ar') {
    return "'Cairo', 'Plus Jakarta Sans', sans-serif";
  }
  switch (option) {
    case 'lora':
      return "'Lora', 'Cairo', Georgia, serif";
    case 'cairo':
      return "'Cairo', 'Plus Jakarta Sans', sans-serif";
    case 'jakarta':
    default:
      return "'Plus Jakarta Sans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif";
  }
}
