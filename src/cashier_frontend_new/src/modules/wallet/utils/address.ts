import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";

export function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}.....${address.slice(-6)}`;
}

/**
 * Validate if a string is a valid Principal address
 * @param address: string - The address to validate
 * @returns boolean - True if valid Principal, false otherwise
 */
export function isValidPrincipal(address: string): Result<Principal, string> {
  try {
    const principal = Principal.fromText(address);
    return Ok(principal);
  } catch {
    return Err("Invalid Principal address");
  }
}

export function isValidAccountId(
  address: string,
): Result<AccountIdentifier, string> {
  try {
    const accountIdentifier = AccountIdentifier.fromHex(address);
    return Ok(accountIdentifier);
  } catch {
    return Err("Invalid Account Identifier");
  }
}
