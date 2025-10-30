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
