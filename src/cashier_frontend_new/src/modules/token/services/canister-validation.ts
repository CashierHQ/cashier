import {
  IcrcLedgerCanister,
  IcrcIndexNgCanister,
  mapTokenMetadata,
  type IcrcTokenMetadata,
} from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { authState } from "$modules/auth/state/auth.svelte";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Validation error constants for token import
 */
export class ValidationError {
  static readonly INVALID_LEDGER = "INVALID_LEDGER" as const;
  static readonly INVALID_INDEX = "INVALID_INDEX" as const;
  static readonly INDEX_LEDGER_MISMATCH = "INDEX_LEDGER_MISMATCH" as const;
  static readonly TOKEN_EXISTS = "TOKEN_EXISTS" as const;
  static readonly BACKEND_ERROR = "BACKEND_ERROR" as const;
}

export type ValidationErrorType =
  | typeof ValidationError.INVALID_LEDGER
  | typeof ValidationError.INVALID_INDEX
  | typeof ValidationError.INDEX_LEDGER_MISMATCH
  | typeof ValidationError.TOKEN_EXISTS
  | typeof ValidationError.BACKEND_ERROR;

/**
 * Validate canister is valid ICRC-1 ledger by calling icrc1_metadata
 */
export async function validateLedgerCanister(
  canisterId: string,
): Promise<Result<IcrcTokenMetadata, typeof ValidationError.INVALID_LEDGER>> {
  try {
    const agent = authState.buildAnonymousAgent();
    const ledger = IcrcLedgerCanister.create({
      agent,
      canisterId: Principal.fromText(canisterId),
    });
    const metadata = await ledger.metadata({ certified: false });

    if (!metadata || metadata.length === 0) {
      return Err(ValidationError.INVALID_LEDGER);
    }

    const mapped = mapTokenMetadata(metadata);
    if (!mapped) {
      return Err(ValidationError.INVALID_LEDGER);
    }

    return Ok(mapped);
  } catch {
    return Err(ValidationError.INVALID_LEDGER);
  }
}

/**
 * Validate canister is valid ICRC index by calling ledger_id
 * and verify it matches the expected ledger canister
 */
export async function validateIndexCanister(
  canisterId: string,
  expectedLedgerId: string,
): Promise<
  Result<
    Principal,
    | typeof ValidationError.INVALID_INDEX
    | typeof ValidationError.INDEX_LEDGER_MISMATCH
  >
> {
  try {
    const agent = authState.buildAnonymousAgent();
    const indexCanister = IcrcIndexNgCanister.create({
      agent,
      canisterId: Principal.fromText(canisterId),
    });
    const ledgerId = await indexCanister.ledgerId({ certified: false });

    // Verify index is for the expected ledger
    if (ledgerId.toText() !== expectedLedgerId) {
      return Err(ValidationError.INDEX_LEDGER_MISMATCH);
    }

    return Ok(ledgerId);
  } catch {
    return Err(ValidationError.INVALID_INDEX);
  }
}
