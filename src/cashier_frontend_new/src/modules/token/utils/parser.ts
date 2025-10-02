import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import type { TokenMetadata } from "$modules/token/types";
import type { Principal } from "@dfinity/principal";

/**
 * Parse the list of tokens from the Token Storage canister response.
 * @param response Response from the Token Storage canister
 * @returns Array of TokenMetadata
 */
export function parseListTokens(
  response: tokenStorage.Result_5,
): TokenMetadata[] {
  if ("Err" in response) {
    throw new Error(`Error fetching tokens: ${response.Err}`);
  }

  const result = response.Ok;
  if (result.tokens && result.tokens.length > 0) {
    return result.tokens.map((token) => {
      if ("IC" in token.id) {
        const ledgerId: Principal = token.id.IC.ledger_id;
        return {
          address: ledgerId.toText(),
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          enabled: token.enabled,
          fee: token.details.IC.fee,
        };
      } else {
        throw new Error("Unsupported token type");
      }
    });
  } else {
    return [];
  }
}

/**
 * Parse the error from the ICP Ledger transfer operation.
 * @param result Error result from ICP Ledger transfer operation
 * @returns Parsed error
 */
export function parseIcrc1TransferResultError(
  result: icpLedger.Icrc1TransferError,
): Error {
  if ("GenericError" in result) {
    return new Error(`Transfer failed: ${result.GenericError.message}`);
  } else if ("InsufficientFunds" in result) {
    return new Error(`Transfer failed: Insufficient funds`);
  }

  return new Error("Transfer failed: Unknown error");
}

export function parseTransferResultError(
  result: icpLedger.TransferError,
): Error {
  if ("InsufficientFunds" in result) {
    return new Error(`Transfer failed: Insufficient funds`);
  }

  return new Error("Transfer failed: Unknown error");
}
