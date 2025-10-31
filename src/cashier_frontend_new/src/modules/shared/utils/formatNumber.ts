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

  // show up to 5 decimal places, trimming trailing zeros
  // e.g. 0.0230097375 -> "0.02301", and 0.1 -> "0.1" (no zero-padding)
  return amount.toFixed(options?.tofixed ?? 5).replace(/\.?0+$/, "");
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
