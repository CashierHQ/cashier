/**
 * Sanitizes numeric input string by:
 * - Removing leading minus signs (negative numbers not allowed)
 * - Keeping only digits and single decimal separator
 * - Converting comma to period for decimal
 *
 * @param value - Raw input string to sanitize
 * @returns Sanitized numeric string
 */
export function sanitizeNumericInput(value: string): string {
  // Remove leading minus signs
  if (value.startsWith("-")) {
    value = value.replace(/^-+/, "");
  }

  let sanitized = "";
  let hasDecimal = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (/[0-9]/.test(char)) {
      sanitized += char;
    } else if ((char === "." || char === ",") && !hasDecimal) {
      sanitized += ".";
      hasDecimal = true;
    }
  }

  return sanitized;
}
