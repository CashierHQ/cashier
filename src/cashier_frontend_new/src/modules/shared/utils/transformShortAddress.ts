/**
 * Transforms a full address/principal string into a shortened version for display.
 * Shows first 8 and last 8 characters with ellipsis in between.
 * @param address The full address string to transform
 * @returns Shortened address string (e.g., "abcd1234 ... wxyz5678")
 */
export function transformShortAddress(address: string): string {
  if (!address || address.length === 0) {
    return "";
  }

  if (address.length <= 16) {
    return address;
  }

  const start = address.slice(0, 8);
  const end = address.slice(-8);
  return `${start} ... ${end}`;
}
