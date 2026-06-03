// AUTO-GENERATED FILE - DO NOT EDIT
// Source: logic/fee-calculations.ts
// To modify fee logic, edit the TypeScript source and regenerate.
/**
 * Fee Calculation Logic - SINGLE SOURCE OF TRUTH
 *
 * This file contains the fee calculation logic that is:
 * 1. Used directly in TypeScript (frontend)
 * 2. Transpiled to Rust (backend)
 *
 * RULES FOR THIS FILE:
 * - Keep functions simple (no complex TS features)
 * - Use bigint for all amounts (transpiles to Nat)
 * - Use simple switch statements (transpiles to match)
 * - Avoid closures, async, or complex types
 *
 * To add/modify fee logic:
 * 1. Edit this file for formulas, or templates/fees.json for static fee amounts
 * 2. Run `pnpm run generate`
 * 3. Both TS and Rust code will be updated
 */

// These types are imported from generated types
import { IntentParticipants, TokenStandard } from './types.js';
import { getGateCreateFeeTableAmount, getGateOpenFeeTableAmount, getLinkCreationFeeTableAmount } from './fee-table.js';

/**
 * Link creation fee in ICP e8s.
 *
 * Loaded from templates/fees.json through the generated fee table.
 */
export function getLinkCreationFeeAmount(): bigint {
  return getLinkCreationFeeTableAmount();
}

/**
 * Gate creation fee in ICP e8s.
 *
 * Loaded from templates/fees.json through the generated fee table.
 */
export function getGateCreateFeeAmount(): bigint {
  return getGateCreateFeeTableAmount();
}

/**
 * Gate open fee in ICP e8s.
 *
 * Loaded from templates/fees.json through the generated fee table.
 */
export function getGateOpenFeeAmount(): bigint {
  return getGateOpenFeeTableAmount();
}

/**
 * Calculate the total gate fee for all gates on a link.
 *
 * Formula:
 * gate_count * (gate_create_fee + max_use * gate_open_fee)
 */
export function calculateGateFeeAmount(
  gateCount: number = 0,
  maxUse: number = 1,
  gateCreateFee: bigint = getGateCreateFeeAmount(),
  gateOpenFee: bigint = getGateOpenFeeAmount()
): bigint {
  return BigInt(gateCount) * (gateCreateFee + BigInt(maxUse) * gateOpenFee);
}

/**
 * Calculate the total amount for an intent based on participants.
 *
 * Formula by participant type:
 * - CreatorToTreasury: link_creation_fee (fee to create the link)
 * - CreatorToLink: user_input_amount * max_use (funding the link)
 * - CreatorToGate: gate_count * (gate_create_fee + max_use * gate_open_fee)
 * - UserToLink: user_input_amount (user sending to link)
 * - LinkToUser: user_input_amount (user receiving from link)
 * - LinkToCreator: link_max_asset_amount (withdrawal/refund)
 */
export function calculateIntentTotalAmount(
  participants: IntentParticipants,
  userInputAmount: bigint = 0n,
  maxUse: number = 1,
  linkCreationFee: bigint = 0n,
  linkMaxAssetAmount: bigint = 0n,
  gateCount: number = 0,
  gateCreateFee: bigint = getGateCreateFeeAmount(),
  gateOpenFee: bigint = getGateOpenFeeAmount()
): bigint {
  switch (participants) {
    case IntentParticipants.CreatorToTreasury:
      return linkCreationFee;

    case IntentParticipants.CreatorToLink:
      return userInputAmount * BigInt(maxUse);

    case IntentParticipants.CreatorToGate:
      return calculateGateFeeAmount(
        gateCount,
        maxUse,
        gateCreateFee,
        gateOpenFee
      );

    case IntentParticipants.UserToLink:
      return userInputAmount;

    case IntentParticipants.LinkToUser:
      return userInputAmount;

    case IntentParticipants.LinkToCreator:
      return linkMaxAssetAmount;

    default:
      return 0n;
  }
}

/**
 * Calculate the total network fee for an intent.
 *
 * Network fee = inbound_fee + outbound_fee
 *
 * ICRC1: inbound = 1x fee
 * ICRC2: inbound = 2x fee (approve + transfer_from)
 *
 * Formula by participant type:
 * - CreatorToTreasury: inbound only (1x or 2x), no outbound
 * - CreatorToLink: inbound (1x or 2x) + outbound per use
 * - CreatorToGate: inbound only (1x or 2x), no outbound
 * - UserToLink: inbound (1x or 2x) + 1x outbound
 * - LinkToUser: no inbound + 1x outbound
 * - LinkToCreator: no inbound + 1x outbound
 */
export function calculateIntentTotalNetworkFee(
  participants: IntentParticipants,
  tokenStandard: TokenStandard,
  assetNetworkFee: bigint,
  maxUse: number = 1
): bigint {
  const inboundFee = calculateIntentInboundNetworkFee(
    participants,
    tokenStandard,
    assetNetworkFee
  );
  const outboundFee = calculateIntentOutboundNetworkFee(
    participants,
    assetNetworkFee,
    maxUse
  );
  return inboundFee + outboundFee;
}

/**
 * Calculate the inbound network fee for an intent.
 * @param participants
 * @param tokenStandard
 * @param assetNetworkFee
 * @param maxUse
 * @returns
 */
export function calculateIntentInboundNetworkFee(
  participants: IntentParticipants,
  tokenStandard: TokenStandard,
  assetNetworkFee: bigint
): bigint {
  const inboundMultiplier = tokenStandard === TokenStandard.ICRC2 ? 2n : 1n;
  switch (participants) {
    case IntentParticipants.CreatorToTreasury:
      return assetNetworkFee * inboundMultiplier;

    case IntentParticipants.CreatorToLink:
      return assetNetworkFee * inboundMultiplier;

    case IntentParticipants.CreatorToGate:
      return assetNetworkFee * inboundMultiplier;

    case IntentParticipants.UserToLink:
      return assetNetworkFee * inboundMultiplier;

    case IntentParticipants.LinkToUser:
      return 0n;

    case IntentParticipants.LinkToCreator:
      return 0n;

    default:
      return 0n;
  }
}

/**
 * Calculate the outbound network fee for an intent.
 * @param participants
 * @param assetNetworkFee
 * @param maxUse
 * @returns
 */
export function calculateIntentOutboundNetworkFee(
  participants: IntentParticipants,
  assetNetworkFee: bigint,
  maxUse: number = 1
): bigint {
  switch (participants) {
    case IntentParticipants.CreatorToTreasury:
      return 0n;

    case IntentParticipants.CreatorToLink:
      return assetNetworkFee * BigInt(maxUse);

    case IntentParticipants.CreatorToGate:
      return 0n;

    case IntentParticipants.UserToLink:
      return assetNetworkFee;

    case IntentParticipants.LinkToUser:
      return assetNetworkFee;

    case IntentParticipants.LinkToCreator:
      return assetNetworkFee;

    default:
      return 0n;
  }
}

/**
 * Calculate the fee paid by the user for an intent.
 *
 * This is what the user actually pays from their perspective.
 *
 * Formula by participant type:
 * - CreatorToTreasury: total_amount + network_fee (pays everything)
 * - CreatorToLink: network_fee only (amount goes to link)
 * - CreatorToGate: total_amount + network_fee (pays everything)
 * - UserToLink: network_fee only
 * - LinkToUser: 0 (free to receive)
 * - LinkToCreator: network_fee (pays withdrawal fee)
 */
export function calculateIntentUserFee(
  participants: IntentParticipants,
  intentTotalAmount: bigint,
  intentTotalNetworkFee: bigint
): bigint {
  switch (participants) {
    case IntentParticipants.CreatorToTreasury:
      // User pays amount + network fee
      return intentTotalAmount + intentTotalNetworkFee;

    case IntentParticipants.CreatorToLink:
      // User pays only network fee
      return intentTotalNetworkFee;

    case IntentParticipants.CreatorToGate:
      // User pays amount + network fee
      return intentTotalAmount + intentTotalNetworkFee;

    case IntentParticipants.UserToLink:
      // User pays only network fee
      return intentTotalNetworkFee;

    case IntentParticipants.LinkToUser:
      // User pays nothing to receive
      return 0n;

    case IntentParticipants.LinkToCreator:
      // Creator pays withdrawal network fee
      return intentTotalNetworkFee;

    default:
      return 0n;
  }
}

/**
 * Input parameters for fee calculation.
 */
export interface FeeInput {
  intent_participants: IntentParticipants;
  token_standard: TokenStandard;
  user_input_amount?: bigint | string;
  max_use?: number;
  link_creation_fee?: bigint | string;
  gate_create_fee?: bigint | string;
  gate_open_fee?: bigint | string;
  gate_count?: number;
  asset_network_fee: bigint | string;
  link_max_asset_amount?: bigint | string;
}

/**
 * Result of fee calculation.
 */
export interface FeeResult {
  intent_total_amount: string;
  intent_total_network_fee: string;
  intent_user_fee: string;
}

/**
 * Calculate all fees for an intent in one call.
 * This is a convenience function that combines all fee calculations.
 */
export function calculateIntentFees(input: FeeInput): FeeResult {
  // Parse bigint values if they're strings
  const userInputAmount =
    typeof input.user_input_amount === "string"
      ? BigInt(input.user_input_amount)
      : (input.user_input_amount ?? 0n);
  const linkCreationFee =
    typeof input.link_creation_fee === "string"
      ? BigInt(input.link_creation_fee)
      : (input.link_creation_fee ?? 0n);
  const assetNetworkFee =
    typeof input.asset_network_fee === "string"
      ? BigInt(input.asset_network_fee)
      : input.asset_network_fee;
  const linkMaxAssetAmount =
    typeof input.link_max_asset_amount === "string"
      ? BigInt(input.link_max_asset_amount)
      : (input.link_max_asset_amount ?? 0n);
  const gateCreateFee =
    typeof input.gate_create_fee === "string"
      ? BigInt(input.gate_create_fee)
      : (input.gate_create_fee ?? getGateCreateFeeAmount());
  const gateOpenFee =
    typeof input.gate_open_fee === "string"
      ? BigInt(input.gate_open_fee)
      : (input.gate_open_fee ?? getGateOpenFeeAmount());
  const maxUse = input.max_use ?? 1;
  const gateCount = input.gate_count ?? 0;

  const totalAmount = calculateIntentTotalAmount(
    input.intent_participants,
    userInputAmount,
    maxUse,
    linkCreationFee,
    linkMaxAssetAmount,
    gateCount,
    gateCreateFee,
    gateOpenFee
  );

  const totalNetworkFee = calculateIntentTotalNetworkFee(
    input.intent_participants,
    input.token_standard,
    assetNetworkFee,
    maxUse
  );

  const userFee = calculateIntentUserFee(
    input.intent_participants,
    totalAmount,
    totalNetworkFee
  );

  return {
    intent_total_amount: totalAmount.toString(),
    intent_total_network_fee: totalNetworkFee.toString(),
    intent_user_fee: userFee.toString(),
  };
}

/**
 * Type for calculating the maximum asset amount a user can input based on their balance and the fees involved.
 */
export interface MaxAssetAmountInput {
  token_balance: bigint;
  token_standard: TokenStandard;
  ledger_fee: bigint;
  max_use: number;
  link_creation_fee?: bigint;
  gate_fee?: bigint;
  fee_token_standard?: TokenStandard;
  is_fee_token?: boolean;
}

/**
 * Calculate the maximum asset amount a user can input based on their balance and the fees involved.
 *
 * The calculation considers:
 * - The user's token balance
 * - The network fees for both inbound and outbound transactions
 * - The link creation fee if the token is also used to pay the fee
 *
 * This ensures that when the user inputs the maximum amount, they will still have enough balance to cover all fees and the transaction will not fail due to insufficient funds.
 * @param input
 * @returns
 */
export function calculateMaxAssetAmount(input: MaxAssetAmountInput): bigint {
  if (input.max_use <= 0) {
    return 0n;
  }

  const inboundMultiplier =
    input.token_standard === TokenStandard.ICRC2 ? 2n : 1n;
  const outboundMultiplier = BigInt(input.max_use);

  if (
    input.is_fee_token &&
    input.fee_token_standard &&
    (input.link_creation_fee || input.gate_fee)
  ) {
    const feeAmount = (input.link_creation_fee ?? 0n) + (input.gate_fee ?? 0n);
    const linkCreationFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToTreasury,
      token_standard: input.fee_token_standard,
      user_input_amount: 0n,
      max_use: 1,
      link_creation_fee: feeAmount,
      asset_network_fee: input.ledger_fee,
    });

    const networkFee =
      inboundMultiplier * input.ledger_fee +
      outboundMultiplier * input.ledger_fee -
      input.ledger_fee; // subtract one ledger fee because it is already included in the required fee amount calculation

    const availableBalance =
      input.token_balance -
      BigInt(linkCreationFees.intent_total_amount) -
      BigInt(linkCreationFees.intent_total_network_fee) -
      networkFee;

    return availableBalance > 0n
      ? availableBalance / BigInt(input.max_use)
      : 0n;
  }

  const networkFee =
    inboundMultiplier * input.ledger_fee +
    outboundMultiplier * input.ledger_fee;
  const availableBalance = input.token_balance - networkFee;

  return availableBalance > 0n ? availableBalance / BigInt(input.max_use) : 0n;
}
