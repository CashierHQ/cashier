export function weiToEther(wei: bigint, decimals: number): number {
  if (decimals < 0) {
    throw new Error("Decimals cannot be negative");
  }
  const factor = 10 ** decimals;
  return Number(wei) / factor;
}

export function etherToWei(ether: number, decimals: number): bigint {
  if (decimals < 0) {
    throw new Error("Decimals cannot be negative");
  }
  const factor = 10 ** decimals;
  return BigInt(Math.floor(ether * factor));
}
