/**
 * Format display value for numeric inputs
 * Handles very small numbers (< 0.0001) by using toLocaleString to preserve precision
 * @param value - The string value to format
 * @returns Formatted string value
 */
export function formatDisplayValue(value: string): string {
  if (!value) return "";

  const num = parseFloat(value);

  if (!isNaN(num) && Math.abs(num) > 0 && Math.abs(num) < 0.0001) {
    return num.toLocaleString("fullwide", {
      useGrouping: false,
      maximumFractionDigits: 20,
    });
  }

  return value;
}
