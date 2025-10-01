/**
 * Convert a balance from the smallest unit to ICP.
 * This ICP value is used for display purposes.
 * @param balance in smallest unit (e.g., e8s for ICP)
 * @param decimals
 * @returns balance in ICP
 */
export function balanceToIcp(balance: bigint, decimals: number): number {
  if (decimals < 0) {
    throw new Error("Decimals cannot be negative");
  }
  const factor = 10 ** decimals;
  return Number(balance) / factor;
}

export function icpToBalance(icp: number, decimals: number): bigint {
  if (decimals < 0) {
    throw new Error("Decimals cannot be negative");
  }
  const factor = 10 ** decimals;
  return BigInt(Math.round(icp * factor));
}

/**
 * Convert a balance from the smallest unit to USD.
 * This USD value is used for display purposes.
 * @param balance in smallest unit (e.g., e8s for ICP)
 * @param decimals
 * @param priceUSD
 * @returns balance in USD
 */
export function balanceToUSDValue(
  balance: bigint,
  decimals: number,
  priceUSD: number,
): number {
  const icpValue = balanceToIcp(balance, decimals);
  return icpValue * priceUSD;
}
