/**
 * Format an amount of tokens into a human-friendly string.
 *
 * Behavior:
 * - Very small numbers (abs < 1e-6) are formatted with `formatSmallNumber`.
 * - Large numbers (abs >= 1000) use `toLocaleString()` for grouping.
 * - Otherwise the raw number is returned as a string.
 *
 * @param amount - amount in tokens
 * @returns formatted token amount string
 */
export const formatNumber = (
  amount: number,
  options?: {
    tofixed?: number;
  },
): string => {
  // handle very small numbers with specialized formatting
  if (Math.abs(amount) < 0.000001) {
    return formatSmallNumber(amount);
  }

  // use locale grouping for thousands and above
  if (Math.abs(amount) >= 1000) {
    return amount.toLocaleString();
  }

  // show up to 8 decimal places, trimming trailing zeros
  // e.g. 0.0230097375 -> "0.023009738", 0.0005002 -> "0.0005002", and 0.1 -> "0.1" (no zero-padding)
  return amount.toFixed(options?.tofixed ?? 8).replace(/\.?0+$/, "");
};

/**
 * Convert a positive integer exponent to its Unicode subscript representation.
 * Example: 12 -> "₁₂".
 *
 * @param n - non-negative integer to convert to subscript digits
 * @returns string of Unicode subscript digits corresponding to n
 */

/**
 * Mapping from ASCII digits to Unicode subscript digits.
 * Used by `numberToSubscript` to render exponents.
 */
// mapping for subscript digits
const subscriptMap: { [key: string]: string } = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

const numberToSubscript = (n: number): string => {
  const s = String(n);
  return s
    .split("")
    .map((ch) => subscriptMap[ch] ?? ch)
    .join("");
};

/**
 * Format very small floating numbers (less than ~0.000001) in a human-friendly
 * compact representation.
 * @param num - the number to format (can be negative)
 * @returns formatted compact string for small numbers
 */
const formatSmallNumber = (num: number): string => {
  // handle zero explicitly
  if (num === 0) return "0";

  const sign = num < 0 ? "-" : "";
  let absNum = Math.abs(num);

  // multiply by powers of ten until it's >= 1 (track exponent)
  let exponent = 0;
  while (absNum < 1) {
    absNum *= 10;
    exponent += 1;
  }

  // when exponent is large enough, use subscript notation (use >= 7)
  if (exponent >= 7) {
    const subscript = numberToSubscript(exponent - 1);
    // format adjusted number to max 4 decimal places and trim trailing zeros
    const adjustedStr = absNum.toFixed(4).replace(/\.?0+$/, "");
    // remove decimal point so digits follow the subscript directly
    const digits = adjustedStr.replace(".", "");
    return `${sign}0.0${subscript}${digits}`;
  }

  // otherwise, show the original number with leading zeros (enough places)
  // exponent ensures we include necessary leading zeros after the decimal
  return `${sign}${num.toFixed(exponent + 1).replace(/\.?0+$/, "")}`;
};

/**
 * Format a token price with appropriate decimal places based on price value.
 * Matches the logic from React app (currency.ts formatNumber function).
 * Uses different precision for different price ranges:
 * - > 100: 3 decimal places
 * - > 10: 4 decimal places
 * - > 0.001: 5 decimal places
 * - <= 0.001: 7 decimal places
 *
 * @param price - token price in USD, can be undefined
 * @returns formatted price string with $ prefix, or "-" if price is invalid
 */
export const formatTokenPrice = (price: number | undefined): string => {
  if (!price || price <= 0) return "-";

  let decimalPlaces: number;
  if (price > 100) {
    decimalPlaces = 3;
  } else if (price > 10) {
    decimalPlaces = 4;
  } else if (price > 0.001) {
    decimalPlaces = 5;
  } else {
    decimalPlaces = 7;
  }

  // Use toLocaleString for consistent formatting with React app
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  })}`;
};

/**
 * Format USD amount with exactly 2 decimal places (cents), removing ".00" for whole numbers.
 * Examples:
 * - 5.0000000 -> "5"
 * - 5.1000000 -> "5.1"
 * - 5.1200000 -> "5.12"
 * - 5.1230000 -> "5.12" (rounded to 2 decimals)
 * - 26.00 -> "26"
 * - 52.25985 -> "52.26"
 *
 * @param amount - USD amount as number or string
 * @returns formatted USD string with max 2 decimal places, without trailing zeros
 */
export const formatUsdAmount = (amount: number | string): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) return "0";

  // Round to 2 decimal places (cents) and format
  const rounded = Math.round(num * 100) / 100;

  // Format with 2 decimal places, then remove trailing zeros and decimal point if needed
  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

/**
 * Format fee amount with adaptive decimal places based on value.
 * For small fees (< 0.02), shows 4 decimal places to display very small amounts.
 * For larger fees (>= 0.02), uses standard 2 decimal places format.
 * Examples:
 * - 0.001234 -> "0.0012" (4 decimals for small amounts)
 * - 0.015678 -> "0.0157" (4 decimals for small amounts)
 * - 0.02 -> "0.02" (2 decimals for larger amounts)
 * - 5.12 -> "5.12" (2 decimals for larger amounts)
 *
 * @param amount - fee amount in USD as number or string
 * @returns formatted fee string with appropriate decimal places, without trailing zeros
 */
export const formatFeeAmount = (amount: number): string => {
  // For amounts less than 0.02, use 4 decimal places
  if (Math.abs(amount) < 0.02) {
    const rounded = Math.round(amount * 10000) / 10000;
    return rounded.toFixed(4).replace(/\.?0+$/, "");
  }

  // For amounts >= 0.02, use standard formatUsdAmount (2 decimal places)
  return formatUsdAmount(amount);
};
