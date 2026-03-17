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
 * 1. Edit THIS file only
 * 2. Run `npm run generate`
 * 3. Both TS and Rust code will be updated
 */
import { IntentParticipants, TokenStandard } from './types.js';
/**
 * Calculate the total amount for an intent based on participants.
 *
 * Formula by participant type:
 * - CreatorToTreasury: link_creation_fee (fee to create the link)
 * - CreatorToLink: user_input_amount * max_use (funding the link)
 * - UserToLink: user_input_amount (user sending to link)
 * - LinkToUser: user_input_amount (user receiving from link)
 * - LinkToCreator: link_max_asset_amount (withdrawal/refund)
 */
export declare function calculateIntentTotalAmount(participants: IntentParticipants, userInputAmount?: bigint, maxUse?: number, linkCreationFee?: bigint, linkMaxAssetAmount?: bigint): bigint;
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
 * - UserToLink: inbound (1x or 2x) + 1x outbound
 * - LinkToUser: no inbound + 1x outbound
 * - LinkToCreator: no inbound + 1x outbound
 */
export declare function calculateIntentTotalNetworkFee(participants: IntentParticipants, tokenStandard: TokenStandard, assetNetworkFee: bigint, maxUse?: number): bigint;
/**
 * Calculate the inbound network fee for an intent.
 * @param participants
 * @param tokenStandard
 * @param assetNetworkFee
 * @param maxUse
 * @returns
 */
export declare function calculateIntentInboundNetworkFee(participants: IntentParticipants, tokenStandard: TokenStandard, assetNetworkFee: bigint): bigint;
/**
 * Calculate the outbound network fee for an intent.
 * @param participants
 * @param assetNetworkFee
 * @param maxUse
 * @returns
 */
export declare function calculateIntentOutboundNetworkFee(participants: IntentParticipants, assetNetworkFee: bigint, maxUse?: number): bigint;
/**
 * Calculate the fee paid by the user for an intent.
 *
 * This is what the user actually pays from their perspective.
 *
 * Formula by participant type:
 * - CreatorToTreasury: total_amount + network_fee (pays everything)
 * - CreatorToLink: network_fee only (amount goes to link)
 * - UserToLink: network_fee only
 * - LinkToUser: 0 (free to receive)
 * - LinkToCreator: network_fee (pays withdrawal fee)
 */
export declare function calculateIntentUserFee(participants: IntentParticipants, intentTotalAmount: bigint, intentTotalNetworkFee: bigint): bigint;
/**
 * Input parameters for fee calculation.
 */
export interface FeeInput {
    intent_participants: IntentParticipants;
    token_standard: TokenStandard;
    user_input_amount?: bigint | string;
    max_use?: number;
    link_creation_fee?: bigint | string;
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
export declare function calculateIntentFees(input: FeeInput): FeeResult;
/**
 * Type for calculating the maximum asset amount a user can input based on their balance and the fees involved.
 */
export interface MaxAssetAmountInput {
    token_balance: bigint;
    token_standard: TokenStandard;
    ledger_fee: bigint;
    max_use: number;
    link_creation_fee?: bigint;
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
export declare function calculateMaxAssetAmount(input: MaxAssetAmountInput): bigint;
//# sourceMappingURL=functions.d.ts.map