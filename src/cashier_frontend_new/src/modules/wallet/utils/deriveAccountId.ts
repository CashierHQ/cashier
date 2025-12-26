import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Derive user's AccountIdentifier from principal (for ICP token comparison)
 */
export function deriveAccountId(userPrincipal: string): Result<string, Error> {
  try {
    const accountId = AccountIdentifier.fromPrincipal({
      principal: Principal.fromText(userPrincipal),
    });
    return Ok(accountId.toHex());
  } catch {
    return Err(new Error("Failed to derive accountId from principal") );
  }
}
