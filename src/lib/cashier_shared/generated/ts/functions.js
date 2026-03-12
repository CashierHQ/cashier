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
 * 1. Edit THIS file only
 * 2. Run `npm run generate`
 * 3. Both TS and Rust code will be updated
 */
// These types are imported from generated types
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
export function calculateIntentTotalAmount(participants, userInputAmount = 0n, maxUse = 1, linkCreationFee = 0n, linkMaxAssetAmount = 0n) {
    switch (participants) {
        case IntentParticipants.CreatorToTreasury:
            return linkCreationFee;
        case IntentParticipants.CreatorToLink:
            return userInputAmount * BigInt(maxUse);
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
 * - UserToLink: inbound (1x or 2x) + 1x outbound
 * - LinkToUser: no inbound + 1x outbound
 * - LinkToCreator: no inbound + 1x outbound
 */
export function calculateIntentTotalNetworkFee(participants, tokenStandard, assetNetworkFee, maxUse = 1) {
    // ICRC2 requires 2x fee for inbound (approve + transfer_from)
    const inboundMultiplier = tokenStandard === TokenStandard.ICRC2 ? 2n : 1n;
    switch (participants) {
        case IntentParticipants.CreatorToTreasury:
            // Inbound only, treasury holds (no outbound)
            return assetNetworkFee * inboundMultiplier;
        case IntentParticipants.CreatorToLink:
            // Inbound + outbound per use
            return (assetNetworkFee * inboundMultiplier + assetNetworkFee * BigInt(maxUse));
        case IntentParticipants.UserToLink:
            // Inbound + 1x outbound
            return assetNetworkFee * inboundMultiplier + assetNetworkFee;
        case IntentParticipants.LinkToUser:
            // No inbound (already in link) + 1x outbound
            return assetNetworkFee;
        case IntentParticipants.LinkToCreator:
            // No inbound + 1x outbound
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
 * - UserToLink: network_fee only
 * - LinkToUser: 0 (free to receive)
 * - LinkToCreator: network_fee (pays withdrawal fee)
 */
export function calculateIntentUserFee(participants, intentTotalAmount, intentTotalNetworkFee) {
    switch (participants) {
        case IntentParticipants.CreatorToTreasury:
            // User pays amount + network fee
            return intentTotalAmount + intentTotalNetworkFee;
        case IntentParticipants.CreatorToLink:
            // User pays only network fee
            return intentTotalNetworkFee;
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
 * Calculate all fees for an intent in one call.
 * This is a convenience function that combines all fee calculations.
 */
export function calculateIntentFees(input) {
    // Parse bigint values if they're strings
    const userInputAmount = typeof input.user_input_amount === 'string'
        ? BigInt(input.user_input_amount)
        : (input.user_input_amount ?? 0n);
    const linkCreationFee = typeof input.link_creation_fee === 'string'
        ? BigInt(input.link_creation_fee)
        : (input.link_creation_fee ?? 0n);
    const assetNetworkFee = typeof input.asset_network_fee === 'string'
        ? BigInt(input.asset_network_fee)
        : input.asset_network_fee;
    const linkMaxAssetAmount = typeof input.link_max_asset_amount === 'string'
        ? BigInt(input.link_max_asset_amount)
        : (input.link_max_asset_amount ?? 0n);
    const maxUse = input.max_use ?? 1;
    const totalAmount = calculateIntentTotalAmount(input.intent_participants, userInputAmount, maxUse, linkCreationFee, linkMaxAssetAmount);
    const totalNetworkFee = calculateIntentTotalNetworkFee(input.intent_participants, input.token_standard, assetNetworkFee, maxUse);
    const userFee = calculateIntentUserFee(input.intent_participants, totalAmount, totalNetworkFee);
    return {
        intent_total_amount: totalAmount.toString(),
        intent_total_network_fee: totalNetworkFee.toString(),
        intent_user_fee: userFee.toString(),
    };
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
export function calculateMaxAssetAmount(input) {
    if (input.max_use <= 0) {
        return 0n;
    }
    const inboundMultiplier = input.token_standard === TokenStandard.ICRC2 ? 2n : 1n;
    const outboundMultiplier = BigInt(input.max_use);
    if (input.is_fee_token &&
        input.fee_token_standard &&
        input.link_creation_fee) {
        const linkCreationFees = calculateIntentFees({
            intent_participants: IntentParticipants.CreatorToTreasury,
            token_standard: input.fee_token_standard,
            user_input_amount: 0n,
            max_use: 1,
            link_creation_fee: input.link_creation_fee,
            asset_network_fee: input.ledger_fee,
        });
        const networkFee = inboundMultiplier * input.ledger_fee +
            outboundMultiplier * input.ledger_fee -
            input.ledger_fee; // subtract one ledger fee because it is already included in the required fee amount calculation
        const availableBalance = input.token_balance -
            BigInt(linkCreationFees.intent_total_amount) -
            BigInt(linkCreationFees.intent_total_network_fee) -
            networkFee;
        return availableBalance > 0n
            ? availableBalance / BigInt(input.max_use)
            : 0n;
    }
    const networkFee = inboundMultiplier * input.ledger_fee +
        outboundMultiplier * input.ledger_fee;
    const availableBalance = input.token_balance - networkFee;
    return availableBalance > 0n ? availableBalance / BigInt(input.max_use) : 0n;
}
//# sourceMappingURL=functions.js.map