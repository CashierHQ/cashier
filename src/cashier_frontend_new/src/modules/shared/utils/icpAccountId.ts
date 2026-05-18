import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";

// Polyfill Buffer in browser only — dynamic import avoids the CJS `buffer`
// package being evaluated by Vite's ESM module runner in Node.js context.
if (typeof window !== "undefined" && !window.Buffer) {
  import("buffer").then(({ Buffer }) => {
    window.Buffer = Buffer;
  });
}

/**
 * Encode an ICP account identifier from a principal string.
 * Converts principal text → AccountIdentifier hex string.
 * @param principalText The principal as text string
 * @returns The encoded account identifier hex string, or null if encoding fails
 */
export function principalToAccountId(principalText: string): string | null {
  try {
    const principal = Principal.fromText(principalText);
    const identifier = AccountIdentifier.fromPrincipal({ principal });
    return identifier.toHex();
  } catch (error) {
    console.error("Error encoding ICP account ID from principal:", error);
    return null;
  }
}

/**
 * Encode an ICP account identifier from a Principal object.
 * @param principal The Principal object
 * @returns The encoded account identifier hex string, or null if encoding fails
 */
export function encodeAccountID(principal: Principal): string | null {
  try {
    const identifier = AccountIdentifier.fromPrincipal({ principal });
    return identifier.toHex();
  } catch (error) {
    console.error("Error encoding ICP account:", error);
    return null;
  }
}

/**
 * Decode an ICP account identifier from a hex string.
 * @param accountHex The ICP account ID in hex format string
 * @returns The decoded account identifier as Uint8Array
 * @throws Error if decoding fails
 */
export function decodeAccountID(accountHex: string): Uint8Array {
  try {
    return AccountIdentifier.fromHex(accountHex).toUint8Array();
  } catch (error) {
    console.error("Error decoding ICP account:", error);
    throw new Error(`Invalid ICP account ID: ${accountHex}`);
  }
}
