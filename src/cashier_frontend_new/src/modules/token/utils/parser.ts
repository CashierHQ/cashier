import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icrcLedger from "$lib/generated/icrc_ledger/icrc_ledger.did";
import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { rsMatch } from "$lib/rsMatch";
import type { TokenMetadata } from "$modules/token/types";

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
      return rsMatch(token.id, {
        IC: (data) => {
          return {
            address: data.ledger_id.toText(),
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
          };
        },
      });
    });
  } else {
    return [];
  }
}

/**
 * Parse the error from ICRC Ledger icrc1_transfer operation.
 * @param result Error result from ICRC Ledger icrc1_transfer operation
 * @returns Parsed error
 */
export function parseIcrcTransferResultError(
  result: icrcLedger.TransferError,
): Error {
  if ("GenericError" in result) {
    return new Error(`Transfer failed: ${result.GenericError.message}`);
  } else if ("InsufficientFunds" in result) {
    return new Error(`Transfer failed: Insufficient funds`);
  }

  return new Error("Transfer failed: Unknown error");
}

/**
 * Parse the error from the ICP Ledger transfer operation (legacy).
 * @param result Error result from ICP Ledger transfer operation (legacy)
 * @returns Parsed error
 */
export function parseICPTransferResultError(
  result: icpLedger.TransferError,
): Error {
  if ("InsufficientFunds" in result) {
    return new Error(`Transfer failed: Insufficient funds`);
  }

  return new Error("Transfer failed: Unknown error");
}
