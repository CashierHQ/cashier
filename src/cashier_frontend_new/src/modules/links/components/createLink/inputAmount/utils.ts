/**
 * Sanitize user input to allow only digits and a single decimal point.
 * @param s user's input
 * @returns sanitized string
 */
export function sanitizeInput(s: unknown): string {
  if (s == null) return "";
  const str = String(s);
  if (str === "") return "";
  // remove any characters except digits, dot and comma
  let out = str.replace(/[^0-9.,]/g, "");
  // collapse multiple dots into a single dot (keep first)
  const parts = out.split(".");
  if (parts.length > 1) {
    out = parts.shift() + "." + parts.join("");
  }
  return out;
}

/**
 * Parse a display number string (which may contain commas) into a number.
 * @param s input string
 * @returns parsed number, or null if invalid
 */
export function parseDisplayNumber(s: unknown): number | null {
  if (s == null) return null;
  const str = String(s);
  if (str.trim() === "") return null;
  // allow commas and trim
  const sanitized = str.replace(/,/g, "").trim();
  const n = Number(sanitized);
  if (Number.isNaN(n)) return null;
  return n;
}

/**
 * Convert a numeric displayed value into base units depending on mode.
 * - mode === 'amount': n is token amount (e.g., 1.23 tokens) -> base units
 * - mode === 'usd': n is USD amount -> convert to tokens using priceUsd then base units
 * Returns a bigint (integer base units). Returns 0 for invalid input or missing price in usd mode.
 */
export function computeAmountFromInput({
  num,
  mode = "amount",
  priceUsd,
  decimals,
}: {
  num: number;
  mode: "amount" | "usd";
  priceUsd?: number;
  decimals: number;
}): bigint {
  if (num == null || Number.isNaN(num)) return 0n;
  if (mode === "amount") {
    return BigInt(Math.trunc(num * Math.pow(10, decimals)));
  }
  // USD mode
  if (!priceUsd || priceUsd <= 0) return 0n;
  const tokenAmount = num / priceUsd;
  return BigInt(Math.trunc(tokenAmount * Math.pow(10, decimals)));
}
