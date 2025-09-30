/**
 * Convert a balance from the smallest unit to ICP.
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

/**
 * Convert a balance from ICP to the smallest unit.
 * @param icp in ICP
 * @param decimals
 * @returns balance in smallest unit (e.g., e8s for ICP)
 */
export function icpToBalance(icp: number, decimals: number): bigint {
  if (decimals < 0) {
    throw new Error("Decimals cannot be negative");
  }
  const factor = 10 ** decimals;
  return BigInt(Math.floor(icp * factor));
}
