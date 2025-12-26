import { locale } from "$lib/i18n";
import { formatBalanceUnits } from "$modules/shared/utils/converter";
import { feeService } from "$modules/shared/services/feeService";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
import {
  ReceiveAddressType,
  type ValidationResult,
} from "../types/walletSendStore";
import type { SendFeeOutput } from "$modules/shared/types/feeService";
import { isValidAccountId, isValidPrincipal } from "../utils/address";
import type { Result } from "ts-results-es";

// ============================================================================
// Types
// ============================================================================

export interface ValidateSendParams {
  selectedToken: string;
  receiveAddress: string;
  amount: number;
  receiveType: ReceiveAddressType;
  maxAmount: number;
}

export interface ComputeSendFeeParams {
  selectedToken: string;
  amount: number;
  receiveAddress: string;
}

export interface ExecuteSendParams {
  selectedToken: string;
  receiveAddress: string;
  amount: number;
  receiveType: ReceiveAddressType;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Validate send form input
 * @returns Ok(true) if valid, Err(errorMessage) if invalid
 */
export function validateSend(params: ValidateSendParams): ValidationResult {
  const { selectedToken, receiveAddress, amount, receiveType, maxAmount } =
    params;

  if (!selectedToken || selectedToken.trim() === "") {
    return Err(locale.t("wallet.send.errors.selectToken"));
  }

  if (!receiveAddress || receiveAddress.trim() === "") {
    return Err(locale.t("wallet.send.errors.enterAddress"));
  }

  // Validate address format based on receive type
  if (receiveType === ReceiveAddressType.PRINCIPAL) {
    const principalResult = isValidPrincipal(receiveAddress);
    if (principalResult.isErr()) {
      return Err(locale.t("wallet.send.errors.invalidPrincipal"));
    }
  } else if (receiveType === ReceiveAddressType.ACCOUNT_ID) {
    const accountResult = isValidAccountId(receiveAddress);
    if (accountResult.isErr()) {
      return Err(locale.t("wallet.send.errors.invalidAccountId"));
    }
  }

  if (amount <= 0) {
    return Err(locale.t("wallet.send.errors.amountGreaterThanZero"));
  }

  if (amount > maxAmount) {
    return Err(
      locale
        .t("wallet.send.errors.amountExceedsMax")
        .replace("{{max}}", String(maxAmount)),
    );
  }

  return Ok(true);
}

/**
 * Compute send fee for confirmation display
 * @returns SendFeeOutput or null if token not found or amount invalid
 */
export function computeSendFee(
  params: ComputeSendFeeParams,
): Result<SendFeeOutput, string> {
  const { selectedToken, amount, receiveAddress } = params;

  if (!selectedToken || amount <= 0) return Err("Invalid token or amount");

  const tokenResult = walletStore.findTokenByAddress(selectedToken);
  if (tokenResult.isErr()) return Err("Token not found");

  const token = tokenResult.unwrap();
  const amountBigInt = formatBalanceUnits(amount, token.decimals);

  return Ok(feeService.computeSendFee(amountBigInt, token, receiveAddress));
}

/**
 * Execute transfer based on receive type
 */
async function transfer(
  selectedToken: string,
  receiveAddress: string,
  receiveType: ReceiveAddressType,
  amount: bigint,
): Promise<bigint> {
  if (receiveType === ReceiveAddressType.PRINCIPAL) {
    return walletStore.transferTokenToPrincipal(
      selectedToken,
      Principal.fromText(receiveAddress),
      amount,
    );
  }

  if (
    receiveType === ReceiveAddressType.ACCOUNT_ID &&
    selectedToken === ICP_LEDGER_CANISTER_ID
  ) {
    return walletStore.transferICPToAccount(receiveAddress, amount);
  }

  throw new Error(locale.t("wallet.send.errors.invalidReceiveType"));
}

/**
 * Execute the send transaction
 * @returns Ok(blockId) on success, Err(message) on failure
 */
export async function executeSend(
  params: ExecuteSendParams,
): Promise<Result<bigint, string>> {
  const { selectedToken, receiveAddress, amount, receiveType } = params;

  try {
    const tokenResult = walletStore.findTokenByAddress(selectedToken);
    if (tokenResult.isErr()) {
      return Err(locale.t("wallet.send.errors.tokenNotFound"));
    }

    const token = tokenResult.unwrap();
    const amountBigInt = formatBalanceUnits(amount, token.decimals);
    const blockId = await transfer(
      selectedToken,
      receiveAddress,
      receiveType,
      amountBigInt,
    );

    return Ok(blockId);
  } catch (error) {
    return Err(`${locale.t("wallet.send.errorMessagePrefix")} ${error}`);
  }
}

/**
 * Get transaction link for IC Dashboard
 * ICP: https://dashboard.internetcomputer.org/transaction/<blockId>
 * SNS: https://dashboard.internetcomputer.org/sns/<canister>/transaction/<blockId>
 */
export function getTransactionLink(
  selectedToken: string,
  blockId: bigint,
): string {
  const baseUrl = "https://dashboard.internetcomputer.org";

  if (selectedToken === ICP_LEDGER_CANISTER_ID) {
    return `${baseUrl}/transaction/${blockId}`;
  }

  // For SNS/other tokens, use the canister address
  return `${baseUrl}/sns/${selectedToken}/transaction/${blockId}`;
}
