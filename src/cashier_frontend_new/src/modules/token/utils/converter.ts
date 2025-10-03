import { bigEndianCrc32, uint8ArrayToHexString } from "@dfinity/utils";

/**
 * Convert a balance to ICP.
 * This value is aimed to be used in UI, not for calculations.
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
 * Convert an ICP amount to the balance unit
 * This value is aimed to be used in UI, such as sending token form.
 * @param icp amount in ICP
 * @param decimals
 * @returns amount in balance
 */
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

/**
 * Decode an ICP account ID from hex string.
 * This is temporarily used since the @dfinity/ledger-icp package
 * does not work in browser due to Buffer dependency.
 * It should be replaced with AccountIdentifier.fromHex when
 * the package supports browser environment.
 * @param account The ICP account ID in hex format string
 * @returns AccountIdentifier as Uint8Array
 * @throws Error if the account ID is invalid or checksum does not match
 */
export function decodeIcpAccountID(account: string): Uint8Array {
  // Convert hex string to Uint8Array without Buffer
  const bytes = new Uint8Array(
    account.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  );

  if (bytes.length !== 32) {
    throw new Error(
      `Invalid AccountIdentifier: expected 32 bytes, got ${bytes.length}.`,
    );
  }

  const providedChecksum = uint8ArrayToHexString(bytes.slice(0, 4));

  const hash = bytes.slice(4);
  const expectedChecksum = uint8ArrayToHexString(bigEndianCrc32(hash));

  if (providedChecksum !== expectedChecksum) {
    throw Error(
      `Checksum mismatch. Expected ${expectedChecksum}, but got ${providedChecksum}.`,
    );
  }

  return bytes;
}
