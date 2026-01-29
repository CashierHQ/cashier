import { Principal } from '@dfinity/principal';
/**
 * Token standard for ICP tokens
 */
export declare const TokenStandard: {
    readonly ICRC1: "ICRC1";
    readonly ICRC2: "ICRC2";
};
export type TokenStandard = typeof TokenStandard[keyof typeof TokenStandard];
/**
 * Type of address in the system
 */
export declare const AddressType: {
    readonly Creator: "Creator";
    readonly User: "User";
    readonly Treasury: "Treasury";
    readonly Link: "Link";
};
export type AddressType = typeof AddressType[keyof typeof AddressType];
/**
 * Type of intent (Transfer can be Send or Receive based on context)
 */
export declare const IntentType: {
    readonly Transfer: "Transfer";
};
export type IntentType = typeof IntentType[keyof typeof IntentType];
/**
 * Current state of an intent
 */
export declare const IntentState: {
    readonly Created: "Created";
    readonly Processing: "Processing";
    readonly Completed: "Completed";
    readonly Failed: "Failed";
};
export type IntentState = typeof IntentState[keyof typeof IntentState];
/**
 * Combination of source and destination for fee calculation
 */
export declare const IntentParticipants: {
    readonly CreatorToTreasury: "CreatorToTreasury";
    readonly CreatorToLink: "CreatorToLink";
    readonly UserToLink: "UserToLink";
    readonly LinkToUser: "LinkToUser";
    readonly LinkToCreator: "LinkToCreator";
};
export type IntentParticipants = typeof IntentParticipants[keyof typeof IntentParticipants];
/**
 * Asset/Token reference
 */
export interface Asset {
    /** Canister ID of the token */
    address: Principal;
    token_standard: TokenStandard;
}
/**
 * Asset information with amount and label
 */
export interface AssetInfo {
    asset: Asset;
    /** Display label for the asset */
    label: string;
    /** Amount in base units (Nat) */
    amount: bigint;
}
/**
 * Represents a single intent within an action
 */
export interface Intent {
    /** Unique identifier for the intent */
    id: string;
    intent_type: IntentType;
    asset: Asset;
    /** Amount to transfer */
    amount: bigint;
    /** Source address (Principal) */
    source_address: Principal;
    source_address_type: AddressType;
    /** Destination address (Principal) */
    dest_address: Principal;
    dest_address_type: AddressType;
    intent_token_standard: TokenStandard;
    /** IDs of intents this intent depends on */
    dependency?: string[];
    intent_state: IntentState;
}
/**
 * Input parameters for fee calculation
 */
export interface FeeCalculationInput {
    intent_participants: IntentParticipants;
    token_standard: TokenStandard;
    /** Amount entered by user */
    user_input_amount?: bigint;
    /** Maximum number of times the link can be used */
    max_use?: number;
    /** Fee for creating the link */
    link_creation_fee?: bigint;
    /** Network fee for the asset */
    asset_network_fee: bigint;
    /** Maximum asset amount in the link (for withdrawals) */
    link_max_asset_amount?: bigint;
}
/**
 * Result of fee calculation for an intent
 */
export interface FeeCalculationResult {
    /** Total amount for the intent */
    intent_total_amount: bigint;
    /** Total network fee (inbound + outbound) */
    intent_total_network_fee: bigint;
    /** Fee paid by the user */
    intent_user_fee: bigint;
}
//# sourceMappingURL=types.d.ts.map